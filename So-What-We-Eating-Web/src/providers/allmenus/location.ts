import type { Coordinates } from '../../location/geo.ts';
import { distanceMeters, isCoordinates } from '../../location/geo.ts';
import { DiscoveryError } from '../../domain/Discovery.ts';
import type { DiningLocation } from '../../domain/SearchPreferences.ts';

// State identifiers, not a city/ZIP coverage table. Cities come from live geocoding.
const names = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];
const codes = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
export const DEFAULT_GEOCODER = 'https://photon.komoot.io/api/';
export interface MenuArea { origin: Coordinates; cityUrls: string[] }
export async function resolveMenuArea(location: DiningLocation, endpoint: string, json: (url: string) => Promise<any>): Promise<MenuArea> {
    const url = new URL(endpoint);
    if (isCoordinates(location)) {
        url.pathname = url.pathname.replace(/\/api\/?$/, '/reverse');
        url.searchParams.set('lat', String(location.latitude));
        url.searchParams.set('lon', String(location.longitude));
    } else {
        url.searchParams.set('q', location.query);
        if (location.source === 'zip') url.searchParams.set('countrycode', 'US');
    }
    url.searchParams.set('lang', 'en');
    url.searchParams.set('limit', '5');
    const response = await json(url.href);
    if (!Array.isArray(response?.features)) throw new DiscoveryError('unavailable');
    const features = response.features.filter((f: any) => f?.geometry?.type === 'Point' && isCoordinates({ latitude: f.geometry.coordinates?.[1], longitude: f.geometry.coordinates?.[0] }));
    if (!features.length) throw new DiscoveryError('location');
    const origin = isCoordinates(location) ? { latitude: location.latitude, longitude: location.longitude } : { latitude: features[0].geometry.coordinates[1], longitude: features[0].geometry.coordinates[0] };
    if (!isCoordinates(location) && location.source !== 'zip' && !location.query.includes(',') && features.some((f: any) => distanceMeters(origin, { latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] }) > 50000)) throw new DiscoveryError('ambiguous');
    const cityUrls = new Set<string>();
    for (const feature of features) {
        const p = feature.properties;
        if (!p || p.countrycode?.toUpperCase() !== 'US') continue;
        const city = p.city || (['city', 'town', 'village', 'municipality'].includes(p.osm_value) ? p.name : undefined);
        const state = codes.includes(p.state?.toUpperCase()) ? p.state.toUpperCase() : codes[names.indexOf(p.state)];
        if (!city || !state) continue;
        const slug = city.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (slug) cityUrls.add(`https://www.allmenus.com/${state.toLowerCase()}/${slug}/-/`);
        if (!isCoordinates(location) || cityUrls.size >= 2) break;
    }
    if (!cityUrls.size) throw new DiscoveryError('coverage');
    return { origin, cityUrls: [...cityUrls] };
}
