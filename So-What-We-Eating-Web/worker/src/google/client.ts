import { DiscoveryError } from '../../../src/domain/Discovery.ts';
export async function googleJson(url: string | URL, init: RequestInit, request: typeof fetch): Promise<Record<string, any>> {
    let response: Response;
    try {
        response = await request(url, { ...init, cache: 'no-store' });
    }
    catch (error) {
        throw new DiscoveryError(init.signal?.aborted || (error instanceof Error && error.name === 'TimeoutError') ? 'timeout' : 'unavailable');
    }
    if (response.status === 429)
        throw new DiscoveryError('quota');
    if (response.status === 401 || response.status === 403)
        throw new DiscoveryError('configuration');
    if (!response.ok)
        throw new DiscoveryError('unavailable');
    try {
        const value = await response.json();
        if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new Error();
        return value;
    }
    catch {
        throw new DiscoveryError('unavailable');
    }
}
