import type { Restaurant } from '../../../src/domain/Restaurant.ts';
import type { Coordinates } from '../../../src/location/geo.ts';
import { distanceMeters, isCoordinates } from '../../../src/location/geo.ts';
import { isWebUrl } from '../../../src/catalog/validate.ts';
import { validPlaceId } from '../request.ts';
const prices: Record<string, number> = { PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };
const categories: Record<string, string> = { mexican_restaurant: 'Mexican', american_restaurant: 'American', italian_restaurant: 'Italian', japanese_restaurant: 'Japanese', thai_restaurant: 'Thai', pizza_restaurant: 'Pizza', indian_restaurant: 'Indian', chinese_restaurant: 'Chinese', vietnamese_restaurant: 'Vietnamese', korean_restaurant: 'Korean', mediterranean_restaurant: 'Mediterranean', fast_food_restaurant: 'Fast food', cafe: 'Cafe' };
export function normalize(place: Record<string, any>, checkedAt: string, origin?: Coordinates): Restaurant | null {
    if (!validPlaceId(place.id) || typeof place.displayName?.text !== 'string' || !place.displayName.text.trim() || !isCoordinates(place.location))
        return null;
    if (place.businessStatus && place.businessStatus !== 'OPERATIONAL')
        return null;
    const cuisines = [...new Set<string>((Array.isArray(place.types) ? place.types : []).map((t: string) => categories[t]).filter(Boolean))];
    const directions = new URL('https://www.google.com/maps/dir/');
    directions.searchParams.set('api', '1');
    directions.searchParams.set('destination', `${place.location.latitude},${place.location.longitude}`);
    directions.searchParams.set('destination_place_id', place.id);
    const attributions = (Array.isArray(place.attributions) ? place.attributions : []).filter((a: any) => typeof a.provider === 'string').map((a: any) => ({ name: a.provider, ...(isWebUrl(a.providerUri) ? { uri: a.providerUri } : {}) }));
    return {
        id: `google:${place.id}`, source: 'google-places', sourceId: place.id,
        name: place.displayName.text, address: typeof place.formattedAddress === 'string' ? place.formattedAddress : undefined,
        latitude: place.location.latitude, longitude: place.location.longitude, cuisines: cuisines.length ? cuisines : ['Restaurant'],
        rating: typeof place.rating === 'number' && place.rating >= 0 && place.rating <= 5 ? place.rating : undefined,
        reviewCount: Number.isInteger(place.userRatingCount) && place.userRatingCount >= 0 ? place.userRatingCount : undefined,
        priceLevel: prices[place.priceLevel], isOpen: typeof place.currentOpeningHours?.openNow === 'boolean' ? place.currentOpeningHours.openNow : undefined,
        distanceMeters: origin ? distanceMeters(origin, place.location) : undefined,
        websiteUrl: isWebUrl(place.websiteUri) ? place.websiteUri : undefined,
        directionsUrl: directions.href, checkedAt, attributions,
    };
}
