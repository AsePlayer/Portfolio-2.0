import type { RestaurantProvider, RestaurantSearchQuery } from './RestaurantProvider.ts';
import type { MenuProvider } from './MenuProvider.ts';
import type { Restaurant } from '../domain/Restaurant.ts';
import type { Menu } from '../domain/Menu.ts';
import { DiscoveryError } from '../domain/Discovery.ts';
import { distanceMeters, isCoordinates } from '../location/geo.ts';
import type { Coordinates } from '../location/geo.ts';
import { validRadius } from '../domain/Radius.ts';
import { parseRestaurants, parsePricedMenu, menuUrl } from './allmenus/parse.ts';
import { resolveMenuArea, DEFAULT_GEOCODER } from './allmenus/location.ts';

/** The original menu-first data flow, using direct CORS-enabled public pages. */
export class AllMenusProvider implements RestaurantProvider, MenuProvider {
    private request: typeof fetch;
    private cache = new Map<string, { at: number; value: any }>();
    private origins = new Map<string, Coordinates>();
    private cooldown = 0;
    private geocoder: string;
    constructor(geocoder = DEFAULT_GEOCODER, request = fetch) {
        const url = new URL(geocoder);
        if (url.protocol !== 'https:' || url.username || url.password) throw new DiscoveryError('configuration');
        this.geocoder = url.href;
        this.request = request.bind(globalThis);
    }
    private async load<T>(url: string, parse: (response: Response) => Promise<T>): Promise<T> {
        const cached = this.cache.get(url);
        if (cached && Date.now() - cached.at < 15 * 60000) return cached.value;
        if (Date.now() < this.cooldown) throw new DiscoveryError('quota');
        try {
            const response = await this.request(url, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(10000) });
            if (response.status === 429) {
                this.cooldown = Date.now() + Math.max(60, Number(response.headers.get('retry-after')) || 60) * 1000;
                throw new DiscoveryError('quota');
            }
            if (response.status === 404) return null as T;
            if (!response.ok) throw new DiscoveryError('unavailable');
            const value = await parse(response);
            if (this.cache.size >= 64) this.cache.delete(this.cache.keys().next().value!);
            this.cache.set(url, { at: Date.now(), value });
            return value;
        } catch (error) {
            if (error instanceof DiscoveryError) throw error;
            throw new DiscoveryError(error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout' : 'unavailable');
        }
    }
    async searchNearby(query: RestaurantSearchQuery): Promise<Restaurant[]> {
        if (!validRadius(query.maxDistanceMeters)) throw new DiscoveryError('invalid');
        const area = await resolveMenuArea(query.location, this.geocoder, url => this.load(url, response => response.json()));
        this.origins.clear();
        const restaurants = new Map<string, Restaurant>();
        for (const cityUrl of area.cityUrls) {
            const rows = await this.load(cityUrl, async response => parseRestaurants(new DOMParser().parseFromString(await response.text(), 'text/html')));
            for (const restaurant of rows ?? []) {
                this.origins.set(restaurant.id, area.origin);
                restaurants.set(restaurant.id, { ...restaurant });
            }
        }
        return [...restaurants.values()];
    }
    async getMenu(restaurant: Restaurant): Promise<Menu | null> {
        const url = menuUrl(restaurant.menuUrl ?? '');
        if (!url || restaurant.source !== 'allmenus') return null;
        const result = await this.load(url.href, async response => parsePricedMenu(new DOMParser().parseFromString(await response.text(), 'text/html'), restaurant, new Date().toISOString()));
        if (!result) return null;
        const detail = { ...result.restaurant };
        // Some pages omit the map coordinates. Resolve the full address, never use a city center as a venue.
        if (!isCoordinates(detail) && detail.address) {
            const geo = new URL(this.geocoder);
            geo.searchParams.set('q', detail.address);
            geo.searchParams.set('countrycode', 'US');
            geo.searchParams.set('limit', '1');
            const data = await this.load(geo.href, response => response.json());
            const feature = data?.features?.[0];
            const point = { latitude: feature?.geometry?.coordinates?.[1], longitude: feature?.geometry?.coordinates?.[0] };
            if (isCoordinates(point) && ['house', 'street'].includes(feature?.properties?.type)) Object.assign(detail, point);
        }
        const origin = this.origins.get(restaurant.id);
        if (!origin || !isCoordinates(detail)) return null;
        Object.assign(restaurant, detail, {
            distanceMeters: distanceMeters(origin, detail),
            directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${detail.latitude}%2C${detail.longitude}`,
        });
        return result.menu;
    }
}
