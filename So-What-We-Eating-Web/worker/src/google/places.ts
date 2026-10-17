import type { Restaurant } from '../../../src/domain/Restaurant.ts';
import type { Coordinates } from '../../../src/location/geo.ts';
import { boundingBox } from '../../../src/location/geo.ts';
import { normalize } from './normalize.ts';
import { googleJson } from './client.ts';
const FIELDS = ['id', 'displayName', 'formattedAddress', 'location', 'types', 'businessStatus', 'currentOpeningHours.openNow', 'rating', 'userRatingCount', 'priceLevel', 'websiteUri', 'attributions'];
export async function searchPlaces(origin: Coordinates, radius: number, openNow: boolean, key: string, request: typeof fetch, signal: AbortSignal) {
    const restaurants = new Map<string, Restaurant>(), checkedAt = new Date().toISOString();
    let token: string | undefined, partial = false;
    // Two pages / 40 upstream candidates provide variety without crawling the city.
    for (let page = 0; page < 2; page++) {
        let data;
        try {
            data = await googleJson('https://places.googleapis.com/v1/places:searchText', {
                method: 'POST', signal,
                headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': [...FIELDS.map(f => `places.${f}`), 'nextPageToken'].join(',') },
                body: JSON.stringify({ textQuery: 'restaurants', includedType: 'restaurant', strictTypeFiltering: true, openNow, pageSize: 20, locationRestriction: { rectangle: boundingBox(origin, radius) }, ...(token ? { pageToken: token } : {}) }),
            }, request);
        }
        catch (error) {
            if (restaurants.size) {
                partial = true;
                break;
            }
            throw error;
        }
        if (data.places !== undefined && !Array.isArray(data.places))
            throw new Error('Invalid upstream shape');
        for (const place of data.places ?? []) {
            const restaurant = place && normalize(place, checkedAt, origin);
            if (restaurant && restaurant.distanceMeters! <= radius && restaurant.isOpen !== false && (!openNow || restaurant.isOpen === true))
                restaurants.set(restaurant.id, restaurant);
        }
        token = typeof data.nextPageToken === 'string' ? data.nextPageToken : undefined;
        if (!token)
            break;
    }
    return { restaurants: [...restaurants.values()], partial, searchedAt: checkedAt };
}
export async function lookupPlaces(ids: string[], key: string, request: typeof fetch, signal: AbortSignal): Promise<Restaurant[]> {
    const results = await Promise.all(ids.map(async (id) => {
        const data = await googleJson(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, { signal, headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELDS.join(',') } }, request);
        return normalize(data, new Date().toISOString());
    }));
    return results.filter(r => r !== null);
}
