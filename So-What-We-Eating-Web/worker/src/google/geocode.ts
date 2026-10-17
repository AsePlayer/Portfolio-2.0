import { DiscoveryError } from '../../../src/domain/Discovery.ts';
import { isCoordinates, distanceMeters } from '../../../src/location/geo.ts';
import type { Coordinates } from '../../../src/location/geo.ts';
import { googleJson } from './client.ts';
import { normalizeStreet } from '../../../src/menus/normalizeIdentity.ts';
export interface ResolvedLocation extends Coordinates { resolvedLabel?: string }
const compact = (value: string) => value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
export async function geocode(query: string, key: string, request: typeof fetch, signal: AbortSignal): Promise<ResolvedLocation> {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('key', key);
    url.searchParams.set('address', query);
    url.searchParams.set('region', 'us'); // Bias only. Addresses in other countries remain supported.
    if (/^\d{5}(?:-\d{4})?$/.test(query))
        url.searchParams.set('components', `country:US|postal_code:${query}`);
    const data = await googleJson(url, { signal }, request);
    if (['OVER_QUERY_LIMIT', 'OVER_DAILY_LIMIT'].includes(data.status))
        throw new DiscoveryError('quota');
    if (data.status === 'ZERO_RESULTS')
        throw new DiscoveryError('location');
    if (data.status === 'REQUEST_DENIED')
        throw new DiscoveryError('configuration');
    if (data.status !== 'OK' || !Array.isArray(data.results))
        throw new DiscoveryError('unavailable');
    const points = data.results.map((result: any) => ({ point: { latitude: result.geometry?.location?.lat, longitude: result.geometry?.location?.lng }, result })).filter((r: any) => isCoordinates(r.point));
    if (!points.length)
        throw new DiscoveryError('location');
    if (points.some((r: any) => distanceMeters(points[0].point, r.point) > 1000))
        throw new DiscoveryError('ambiguous');
    const result = points[0].result;
    const components = Array.isArray(result.address_components) ? result.address_components : [];
    const component = (type: string) => components.find((c: any) => Array.isArray(c.types) && c.types.includes(type));
    const state = component('administrative_area_level_1');
    const locality = component('locality') ?? component('postal_town');
    const zip = /^\d{5}(?:-\d{4})?$/.test(query);
    const house = query.match(/^\s*(\d+[a-z]?)\s+/i)?.[1];
    // A single returned locality is still ambiguous without the user's region.
    // Google may choose a prominent Springfield while omitting other Springfields.
    const specifiedRegion = !!state && [state.short_name, state.long_name].some((name: unknown) =>
        typeof name === 'string' && new RegExp(`(?:^|[\\s,])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[\\s,])`, 'i').test(query));
    const types: string[] = Array.isArray(result.types) ? result.types : [];
    if (types.includes('locality') && !specifiedRegion && !zip && !house) throw new DiscoveryError('ambiguous');
    if (zip && component('postal_code')?.long_name?.slice(0, 5) !== query.slice(0, 5)) throw new DiscoveryError('ambiguous');
    if (house && (component('street_number')?.long_name?.toLowerCase() !== house.toLowerCase() || !component('route'))) throw new DiscoveryError('ambiguous');
    if (result.partial_match) {
        const regionText = specifiedRegion ? query.replace(new RegExp(`(?:,?\\s+)(?:${state.short_name}|${state.long_name})(?:\\s*,?\\s*(?:USA|US|United States))?$`, 'i'), '') : '';
        const correctedLocality = specifiedRegion && locality && compact(regionText) === compact(locality.long_name);
        const matchedStreet = house && specifiedRegion && normalizeStreet(query.split(',')[0]).street === normalizeStreet(`${house} ${component('route')?.long_name ?? ''}`).street;
        // Accept spacing/punctuation corrections to a region-qualified locality.
        // Partial street addresses must retain their house number and route.
        if (!correctedLocality && !matchedStreet && !zip) throw new DiscoveryError('ambiguous');
    }
    return { ...points[0].point, ...(typeof result.formatted_address === 'string' ? { resolvedLabel: result.formatted_address.slice(0, 400) } : {}) };
}
