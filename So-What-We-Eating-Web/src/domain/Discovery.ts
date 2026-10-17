import type { Coordinates } from '../location/geo.ts';
import type { Restaurant } from './Restaurant.ts';
export type DiscoverRequest = {
    schemaVersion: 2;
    radiusMeters: number;
    openNow: boolean;
} & ({
    location: Coordinates;
    locationQuery?: never;
} | {
    locationQuery: string;
    location?: never;
});
export interface DiscoverResponse {
    schemaVersion: 2;
    origin: Coordinates;
    searchedAt: string;
    partial: boolean;
    restaurants: Restaurant[];
}
export const DISCOVERY_MESSAGES = {
    coverage: 'We couldn’t find a supported US city for priced menus. Try a US ZIP or city and state.',
    configuration: 'Live restaurant discovery isn’t connected yet. The site owner needs to finish service setup.',
    unavailable: 'Restaurant discovery is unavailable right now. Try again in a moment.',
    timeout: 'Restaurant discovery took too long. Try again in a moment.',
    quota: 'Restaurant discovery is busy right now. Please try again later.',
    location: 'We couldn’t find that location. Check the city, ZIP, or address and try again.',
    ambiguous: 'That location could mean more than one place. Add a state, country, or full address.',
    invalid: 'Check the location and distance, then try again.',
} as const;
export type DiscoveryErrorCode = keyof typeof DISCOVERY_MESSAGES;
export class DiscoveryError extends Error {
    code: DiscoveryErrorCode;
    constructor(code: DiscoveryErrorCode) { super(DISCOVERY_MESSAGES[code]); this.code = code; }
}
