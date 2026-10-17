import type { Restaurant } from '../domain/Restaurant.ts';
import type { RestaurantProvider, RestaurantSearchQuery } from './RestaurantProvider.ts';
import { DiscoveryError } from '../domain/Discovery.ts';
import { distanceMeters, isCoordinates } from '../location/geo.ts';
import type { Coordinates } from '../location/geo.ts';
import { validRadius } from '../domain/Radius.ts';
import { isWebUrl } from '../catalog/validate.ts';
import { osmOpenNow } from './osmHours.ts';

export const OSM_CREDIT = { name: '© OpenStreetMap contributors · ODbL', uri: 'https://www.openstreetmap.org/copyright' };
export const DEFAULT_OVERPASS = 'https://overpass.private.coffee/api/interpreter';
export const DEFAULT_PHOTON = 'https://photon.komoot.io/api/';
type Element = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

/** Public open-data services; no credentials, paid fallback, or fictional substitutions. */
export class OpenStreetMapProvider implements RestaurantProvider {
    private request: typeof fetch;
    private cache = new Map<string, { at: number; data: any }>();
    private retryAfter = 0;
    private overpassUnavailableUntil = 0;
    private overpass: string;
    private photon: string;
    private clock: () => Date;
    constructor(overpass = DEFAULT_OVERPASS, photon = DEFAULT_PHOTON, request = fetch, clock = () => new Date()) {
        this.overpass = overpass;
        this.photon = photon;
        this.clock = clock;
        for (const endpoint of [overpass, photon]) {
            const url = new URL(endpoint);
            if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid open-data endpoint');
        }
        this.request = request.bind(globalThis);
    }
    private async json(url: string, init: RequestInit = {}): Promise<any> {
        const key = url + (init.body ?? '');
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.at < 5 * 60_000) return cached.data;
        if (Date.now() < this.retryAfter) throw new DiscoveryError('quota');
        try {
            const response = await this.request(url, { ...init, credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(25_000) });
            if (response.status === 429) {
                this.retryAfter = Date.now() + Math.max(60, Math.min(300, Number(response.headers.get('Retry-After')) || 60)) * 1000;
                throw new DiscoveryError('quota');
            }
            if (!response.ok) throw new DiscoveryError(response.status === 504 ? 'timeout' : 'unavailable');
            const data = await response.json();
            if (this.cache.size >= 12) this.cache.delete(this.cache.keys().next().value!);
            this.cache.set(key, { at: Date.now(), data });
            return data;
        } catch (error) {
            if (error instanceof DiscoveryError) throw error;
            throw new DiscoveryError(error instanceof DOMException && ['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout' : 'unavailable');
        }
    }
    private async origin(query: RestaurantSearchQuery): Promise<Coordinates> {
        const location = query.location;
        if (isCoordinates(location)) return location;
        if (!location.query || location.query.length > 240) throw new DiscoveryError('invalid');
        const url = new URL(this.photon);
        url.searchParams.set('q', location.query);
        url.searchParams.set('limit', '5');
        url.searchParams.set('lang', 'en');
        if (location.source === 'zip') url.searchParams.set('countrycode', 'US');
        const data = await this.json(url.href);
        if (!Array.isArray(data?.features)) throw new DiscoveryError('unavailable');
        const points = data.features.filter((f: any) => f?.geometry?.type === 'Point' && Array.isArray(f.geometry.coordinates)).map((f: any) => ({
            latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0], properties: f.properties,
        })).filter((p: any) => isCoordinates(p));
        if (!points.length) throw new DiscoveryError('location');
        if (!location.query.includes(',') && location.source !== 'zip' && points.some((p: Coordinates) => distanceMeters(points[0], p) > 50_000)) throw new DiscoveryError('ambiguous');
        return points[0];
    }
    async searchNearby(query: RestaurantSearchQuery): Promise<Restaurant[]> {
        if (!validRadius(query.maxDistanceMeters)) throw new DiscoveryError('invalid');
        const origin = await this.origin(query);
        const radius = query.maxDistanceMeters;
        // Bounded, user-triggered query. Prefer records with hours before filling the pool.
        const area = `(around:${radius},${origin.latitude},${origin.longitude})`;
        const filter = '["amenity"~"^(restaurant|fast_food|cafe|food_court)$"]["name"]';
        const data = `[out:json][timeout:20][maxsize:33554432];nwr${area}${filter}->.spots;nwr.spots["opening_hours"];out center tags 100;.spots out center tags 100;`;
        let restaurants: Restaurant[];
        try {
            if (Date.now() < this.overpassUnavailableUntil) throw new DiscoveryError('unavailable');
            const response = await this.json(this.overpass, { method: 'POST', body: new URLSearchParams({ data }) });
            if (!Array.isArray(response?.elements) || response.remark) throw new DiscoveryError('unavailable');
            restaurants = this.normalize(response.elements);
        } catch (error) {
            // A second open-data index can still locate real venues during an Overpass outage.
            // Never route around a quota response, and never infer that missing hours mean open.
            if (error instanceof DiscoveryError && error.code === 'quota') throw error;
            this.overpassUnavailableUntil = Date.now() + 60_000;
            restaurants = await this.photonNearby(origin, radius);
        }
        return restaurants.map(r => ({ ...r, distanceMeters: distanceMeters(origin, { latitude: r.latitude!, longitude: r.longitude! }) }))
            .filter(r => r.distanceMeters <= radius && r.isOpen !== false && (!query.openNow || r.isOpen === true));
    }
    private async photonNearby(origin: Coordinates, radius: number): Promise<Restaurant[]> {
        const url = new URL('../reverse', this.photon);
        url.searchParams.set('lat', String(origin.latitude));
        url.searchParams.set('lon', String(origin.longitude));
        url.searchParams.set('radius', String(radius / 1000));
        url.searchParams.set('limit', '50');
        url.searchParams.set('lang', 'en');
        for (const kind of ['restaurant', 'fast_food', 'cafe', 'food_court']) url.searchParams.append('osm_tag', `amenity:${kind}`);
        const data = await this.json(url.href);
        if (!Array.isArray(data?.features)) throw new DiscoveryError('unavailable');
        const elements: Element[] = [];
        for (const feature of data.features) {
            const p = feature?.properties, coords = feature?.geometry?.coordinates;
            if (!p || feature.geometry?.type !== 'Point' || !Array.isArray(coords) || p.osm_key !== 'amenity') continue;
            const type = ({ N: 'node', W: 'way', R: 'relation' } as Record<string, string>)[p.osm_type];
            const tags: Record<string, string> = { amenity: p.osm_value, name: p.name };
            for (const key of ['housenumber', 'street', 'city', 'state', 'postcode']) if (typeof p[key] === 'string') tags[`addr:${key}`] = p[key];
            for (const key of ['opening_hours', 'website', 'cuisine']) if (typeof p.extra?.[key] === 'string') tags[key] = p.extra[key];
            elements.push({ type, id: p.osm_id, lat: coords[1], lon: coords[0], tags });
        }
        return this.normalize(elements);
    }
    async lookup(ids: string[]): Promise<Restaurant[]> {
        if (!ids.length || ids.length > 3 || ids.some(id => !/^(node|way|relation)\/[1-9]\d*$/.test(id))) throw new DiscoveryError('invalid');
        const selectors = ids.map(id => { const [type, value] = id.split('/'); return `${type}(${value});`; }).join('');
        const response = await this.json(this.overpass, { method: 'POST', body: new URLSearchParams({ data: `[out:json][timeout:20][maxsize:33554432];(${selectors});out center tags;` }) });
        if (!Array.isArray(response?.elements) || response.remark) throw new DiscoveryError('unavailable');
        return this.normalize(response.elements);
    }
    private normalize(elements: Element[]): Restaurant[] {
        const unique = new Map<string, Restaurant>();
        for (const element of elements) {
            if (!element || !['node', 'way', 'relation'].includes(element.type) || !Number.isSafeInteger(element.id) || element.id <= 0) continue;
            const tags = element.tags;
            const latitude = element.lat ?? element.center?.lat, longitude = element.lon ?? element.center?.lon;
            if (!tags || !Object.values(tags).every(value => typeof value === 'string') || typeof tags.name !== 'string' || !tags.name.trim() || !isCoordinates({ latitude, longitude })) continue;
            if (!['restaurant', 'fast_food', 'cafe', 'food_court'].includes(tags.amenity) || ['yes', 'closed'].includes(tags.disused) || tags.access === 'private') continue;
            const sourceId = `${element.type}/${element.id}`;
            const website = tags.website ?? tags['contact:website'];
            const menu = tags['website:menu'] ?? tags['contact:menu'] ?? tags.menu;
            const address = [[tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '), tags['addr:city'], tags['addr:state'], tags['addr:postcode']].filter(Boolean).join(', ');
            unique.set(sourceId, {
                id: `osm:${sourceId}`, source: 'openstreetmap', sourceId, name: tags.name.trim(),
                latitude, longitude, address: address || undefined,
                cuisines: (tags.cuisine ?? '').split(';').filter(Boolean).map(c => c.replaceAll('_', ' ')),
                isOpen: osmOpenNow(tags.opening_hours, latitude!, longitude!, this.clock()),
                websiteUrl: isWebUrl(website) ? website : undefined, menuUrl: isWebUrl(menu) ? menu : undefined,
                directionsUrl: `https://www.openstreetmap.org/directions?to=${latitude}%2C${longitude}`,
                checkedAt: this.clock().toISOString(), attributions: [OSM_CREDIT],
            });
        }
        return [...unique.values()];
    }
}
