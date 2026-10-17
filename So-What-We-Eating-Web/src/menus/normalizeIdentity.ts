import type { Restaurant } from '../domain/Restaurant.ts';

export function normalizeName(value: string): string {
    return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/['’`]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ')
        .trim().replace(/\s+(incorporated|inc|llc|corp|corporation)$/, '').trim();
}
const streetWords: Record<string, string> = {
    street: 'st', avenue: 'ave', boulevard: 'blvd', road: 'rd', drive: 'dr', lane: 'ln',
    court: 'ct', highway: 'hwy', parkway: 'pkwy', place: 'pl', terrace: 'ter',
    north: 'n', south: 's', east: 'e', west: 'w', northeast: 'ne', northwest: 'nw', southeast: 'se', southwest: 'sw',
    first: '1st', second: '2nd', third: '3rd', fourth: '4th', fifth: '5th',
};
export function normalizeStreet(value: string): { number?: string; street: string; unit?: string } {
    const unitSuffix = value.match(/(?:\b(?:suite|ste|unit|apt)\.?\s*|#\s*)([a-z0-9-]+)/i);
    const normalized = normalizeName(unitSuffix ? value.slice(0, unitSuffix.index) : value);
    const unit = unitSuffix?.[1]?.toLowerCase();
    const base = normalized;
    const number = base.match(/^\d+[a-z]?\b/)?.[0];
    const street = (number ? base.slice(number.length).trim() : base).split(' ')
        .map(word => streetWords[word] ?? word).join(' ').trim();
    return { number, street, unit };
}

/** AllMenus publishes US addresses. Never infer city/state from the search origin. */
export function addressIdentity(restaurant: Restaurant) {
    const address = restaurant.address ?? '';
    const tail = address.match(/,\s*([^,]+),?\s+([A-Z]{2})\s*,?\s*(\d{5})(?:-\d{4})?(?:,?\s*(?:USA|US|United States))?\s*$/i);
    return {
        ...normalizeStreet(restaurant.streetAddress ?? address.split(',')[0]),
        locality: normalizeName(restaurant.locality ?? tail?.[1] ?? ''),
        regionCode: (restaurant.regionCode ?? tail?.[2] ?? '').toUpperCase(),
        postalCode: (restaurant.postalCode ?? tail?.[3] ?? '').slice(0, 5),
        countryCode: restaurant.countryCode?.toUpperCase(),
    };
}
export function allMenusCityUrl(restaurant: Restaurant): string | null {
    const identity = addressIdentity(restaurant);
    if (identity.countryCode && identity.countryCode !== 'US') return null;
    const states = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
    if (!identity.locality || !states.includes(identity.regionCode)) return null;
    return `https://www.allmenus.com/${identity.regionCode.toLowerCase()}/${identity.locality.replaceAll(' ', '-')}/-/`;
}
