import type { RestaurantProvider, RestaurantSearchQuery } from './RestaurantProvider.ts';
import type { Restaurant } from '../domain/Restaurant.ts';
import { assertRestaurants } from '../catalog/validate.ts';
import { DiscoveryError, DISCOVERY_MESSAGES } from '../domain/Discovery.ts';
import type { DiscoverRequest } from '../domain/Discovery.ts';
import { isCoordinates, distanceMeters } from '../location/geo.ts';
/** All Google calls stay behind our Worker. Responses remain transient. */
export class GooglePlacesProvider implements RestaurantProvider {
    private endpoint: string;
    private request: typeof fetch;
    constructor(endpoint = '', request: typeof fetch = fetch) {
        this.endpoint = '';
        if (endpoint) {
            const url = new URL(endpoint);
            if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))))
                throw new DiscoveryError('configuration');
            this.endpoint = url.href;
        }
        this.request = request.bind(globalThis);
    }
    async searchNearby(query: RestaurantSearchQuery): Promise<Restaurant[]> {
        const target = isCoordinates(query.location) ? { location: { latitude: query.location.latitude, longitude: query.location.longitude } } : { locationQuery: query.location.query };
        const body: DiscoverRequest = { schemaVersion: 2, ...target, radiusMeters: query.maxDistanceMeters, openNow: query.openNow };
        const value = await this.post(body);
        if (!isCoordinates(value.origin) || typeof value.searchedAt !== 'string' || !Number.isFinite(Date.parse(value.searchedAt)))
            throw new DiscoveryError('unavailable');
        if (isCoordinates(query.location) && distanceMeters(query.location, value.origin) > 1)
            throw new DiscoveryError('unavailable');
        return this.restaurants(value.restaurants).map(r => ({ ...r, distanceMeters: distanceMeters(value.origin as {
                latitude: number;
                longitude: number;
            }, { latitude: r.latitude!, longitude: r.longitude! }) }))
            .filter(r => r.distanceMeters <= query.maxDistanceMeters && r.isOpen !== false && (!query.openNow || r.isOpen === true));
    }
    async lookup(placeIds: string[]): Promise<Restaurant[]> {
        return this.restaurants((await this.post({ schemaVersion: 2, placeIds })).restaurants);
    }
    private restaurants(value: unknown): Restaurant[] {
        if (!Array.isArray(value) || value.length > 60)
            throw new DiscoveryError('unavailable');
        const unique = new Map<string, Restaurant>();
        for (const candidate of value) {
            const rows = [candidate];
            try {
                assertRestaurants(rows);
            }
            catch {
                throw new DiscoveryError('unavailable');
            }
            const restaurant = rows[0];
            if (restaurant.source !== 'google-places' || !restaurant.sourceId || restaurant.id !== `google:${restaurant.sourceId}` || !isCoordinates(restaurant) || restaurant.isDemo)
                throw new DiscoveryError('unavailable');
            if (!unique.has(restaurant.id))
                unique.set(restaurant.id, restaurant);
        }
        return [...unique.values()];
    }
    private async post(body: unknown): Promise<Record<string, unknown>> {
        if (!this.endpoint)
            throw new DiscoveryError('configuration');
        try {
            const response = await this.request(this.endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'omit', cache: 'no-store', body: JSON.stringify(body), signal: AbortSignal.timeout(22000) });
            const value = await response.json();
            if (!response.ok) {
                const code = value?.error?.code;
                throw new DiscoveryError(Object.hasOwn(DISCOVERY_MESSAGES, code) ? code : response.status === 429 ? 'quota' : 'unavailable');
            }
            if (!value || value.schemaVersion !== 2 || typeof value !== 'object')
                throw new DiscoveryError('unavailable');
            return value;
        }
        catch (error) {
            if (error instanceof DiscoveryError)
                throw error;
            throw new DiscoveryError(error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout' : 'unavailable');
        }
    }
}
