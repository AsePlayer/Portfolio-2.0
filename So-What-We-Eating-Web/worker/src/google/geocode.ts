import { DiscoveryError } from '../../../src/domain/Discovery.ts';
import { isCoordinates, distanceMeters } from '../../../src/location/geo.ts';
import type { Coordinates } from '../../../src/location/geo.ts';
import { googleJson } from './client.ts';
export async function geocode(query: string, key: string, request: typeof fetch, signal: AbortSignal): Promise<Coordinates> {
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
    const points = data.results.map((r: any) => ({ point: { latitude: r.geometry?.location?.lat, longitude: r.geometry?.location?.lng }, partial: r.partial_match })).filter((r: any) => isCoordinates(r.point));
    if (!points.length)
        throw new DiscoveryError('location');
    if (points[0].partial || points.some((r: any) => distanceMeters(points[0].point, r.point) > 1000))
        throw new DiscoveryError('ambiguous');
    return points[0].point;
}
