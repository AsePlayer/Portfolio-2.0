import type { DiscoverRequest } from '../../src/domain/Discovery.ts';
import { DiscoveryError } from '../../src/domain/Discovery.ts';
import { validRadius } from '../../src/domain/Radius.ts';
import { isCoordinates } from '../../src/location/geo.ts';
export type LookupRequest = {
    schemaVersion: 2;
    placeIds: string[];
};
export const validPlaceId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{1,256}$/.test(id);
export function parseRequest(value: unknown): DiscoverRequest | LookupRequest {
    const r = value as Record<string, unknown>;
    if (!r || typeof r !== 'object' || Array.isArray(r) || r.schemaVersion !== 2)
        throw new DiscoveryError('invalid');
    if ('placeIds' in r) {
        if (Object.keys(r).some(k => !['schemaVersion', 'placeIds'].includes(k)) || !Array.isArray(r.placeIds) || !r.placeIds.length || r.placeIds.length > 3 || !r.placeIds.every(validPlaceId))
            throw new DiscoveryError('invalid');
        return { schemaVersion: 2, placeIds: [...new Set(r.placeIds)] };
    }
    if (Object.keys(r).some(k => !['schemaVersion', 'location', 'locationQuery', 'radiusMeters', 'openNow'].includes(k)) || !validRadius(r.radiusMeters) || typeof r.openNow !== 'boolean')
        throw new DiscoveryError('invalid');
    if (('location' in r) === ('locationQuery' in r))
        throw new DiscoveryError('invalid');
    const base = { schemaVersion: 2 as const, radiusMeters: r.radiusMeters, openNow: r.openNow };
    if ('location' in r) {
        if (!isCoordinates(r.location))
            throw new DiscoveryError('invalid');
        return { ...base, location: { latitude: r.location.latitude, longitude: r.location.longitude } };
    }
    if (typeof r.locationQuery !== 'string' || r.locationQuery.trim().length < 2 || r.locationQuery.length > 240 || /[\u0000-\u001f]/.test(r.locationQuery))
        throw new DiscoveryError('invalid');
    return { ...base, locationQuery: r.locationQuery.trim() };
}
export async function boundedJson(request: Request): Promise<unknown> {
    if (!request.headers.get('content-type')?.startsWith('application/json'))
        throw new DiscoveryError('invalid');
    const reader = request.body?.getReader();
    if (!reader)
        throw new DiscoveryError('invalid');
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
        const { value, done } = await reader.read();
        if (done)
            break;
        length += value.byteLength;
        if (length > 2048) {
            await reader.cancel();
            throw new DiscoveryError('invalid');
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    try {
        return JSON.parse(new TextDecoder().decode(bytes));
    }
    catch {
        throw new DiscoveryError('invalid');
    }
}
