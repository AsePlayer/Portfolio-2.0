import { DiscoveryError } from '../../src/domain/Discovery.ts';
import { parseRequest, boundedJson } from './request.ts';
import { geocode } from './google/geocode.ts';
import { searchPlaces, lookupPlaces } from './google/places.ts';
export interface Env {
    GOOGLE_MAPS_API_KEY: string;
    ALLOWED_ORIGINS: string;
    IP_LIMITER: {
        limit(input: {
            key: string;
        }): Promise<{
            success: boolean;
        }>;
    };
    EDGE_LIMITER: {
        limit(input: {
            key: string;
        }): Promise<{
            success: boolean;
        }>;
    };
}
export async function handleRequest(request: Request, env: Env, upstream: typeof fetch = fetch): Promise<Response> {
    const origin = request.headers.get('origin') ?? '';
    const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).includes(origin) && !!origin;
    const headers = new Headers({ 'content-type': 'application/json', 'cache-control': 'no-store, max-age=0', 'vary': 'Origin', 'x-content-type-options': 'nosniff' });
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
    if (!allowed)
        return json({ error: { code: 'invalid' } }, 403);
    headers.set('access-control-allow-origin', origin);
    headers.set('access-control-allow-methods', 'POST, OPTIONS');
    headers.set('access-control-allow-headers', 'Content-Type');
    if (new URL(request.url).pathname !== '/discover')
        return json({ error: { code: 'invalid' } }, 404);
    if (request.method === 'OPTIONS')
        return new Response(null, { status: 204, headers });
    if (request.method !== 'POST')
        return json({ error: { code: 'invalid' } }, 405);
    try {
        const input = parseRequest(await boundedJson(request));
        if (!env.GOOGLE_MAPS_API_KEY || !env.IP_LIMITER || !env.EDGE_LIMITER)
            throw new DiscoveryError('configuration');
        const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
        if (!(await env.IP_LIMITER.limit({ key: ip })).success || !(await env.EDGE_LIMITER.limit({ key: 'discover' })).success)
            throw new DiscoveryError('quota');
        const signal = AbortSignal.timeout(18000);
        if ('placeIds' in input)
            return json({ schemaVersion: 2, restaurants: await lookupPlaces(input.placeIds, env.GOOGLE_MAPS_API_KEY, upstream, signal) });
        const point = 'locationQuery' in input && input.locationQuery !== undefined ? await geocode(input.locationQuery, env.GOOGLE_MAPS_API_KEY, upstream, signal) : input.location!;
        const found = await searchPlaces(point, input.radiusMeters, input.openNow, env.GOOGLE_MAPS_API_KEY, upstream, signal);
        return json({ schemaVersion: 2, origin: point, ...found });
    }
    catch (error) {
        const code = error instanceof DiscoveryError ? error.code : 'unavailable';
        const status = { invalid: 400, location: 422, ambiguous: 422, quota: 429, timeout: 504, configuration: 503, unavailable: 503 }[code];
        if (code === 'quota')
            headers.set('retry-after', '60');
        return json({ schemaVersion: 2, error: { code } }, status);
    }
}
export default { fetch(request: Request, env: Env) { return handleRequest(request, env); } };
