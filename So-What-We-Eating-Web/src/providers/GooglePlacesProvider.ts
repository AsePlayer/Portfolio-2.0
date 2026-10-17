import type { RestaurantProvider, RestaurantSearchQuery } from './RestaurantProvider.ts';
import type { Restaurant } from '../domain/Restaurant.ts';
import { assertRestaurants } from '../catalog/validate.ts';
/** Mockable client for our normalized proxy contract, NOT a direct Google API client. */
export class GooglePlacesProvider implements RestaurantProvider {
    private endpoint: string;
    private request: typeof fetch;
    constructor(endpoint: string, request: typeof fetch = fetch) {
        const url = new URL(endpoint);
        if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
            throw new Error('Use an HTTPS restaurant proxy.');
        this.endpoint = url.href;
        this.request = request;
    }
    async searchNearby(query: RestaurantSearchQuery): Promise<Restaurant[]> {
        const response = await this.request(this.endpoint, {
            method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'omit',
            body: JSON.stringify({ schemaVersion: 1, location: { latitude: query.location.latitude, longitude: query.location.longitude }, radiusMeters: query.maxDistanceMeters }),
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok)
            throw new Error('Restaurant proxy unavailable.');
        const value: unknown = await response.json();
        if (!value || typeof value !== 'object' || !('schemaVersion' in value) || value.schemaVersion !== 1 || !('restaurants' in value))
            throw new Error('Unsupported restaurant response.');
        // An empty result is valid discovery, unlike an empty committed fixture catalog.
        if (Array.isArray(value.restaurants) && value.restaurants.length === 0)
            return [];
        assertRestaurants(value.restaurants);
        return value.restaurants;
    }
}
