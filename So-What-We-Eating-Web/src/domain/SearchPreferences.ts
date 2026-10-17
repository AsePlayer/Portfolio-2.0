export type LocationSource = 'browser' | 'zip' | 'city' | 'manual';
export type DiningLocation = {
    label: string;
} & ({
    source: 'browser' | 'manual';
    latitude: number;
    longitude: number;
    query?: never;
} | {
    source: 'zip' | 'city';
    query: string;
    latitude?: never;
    longitude?: never;
});
export type DiningMode = 'dine-in' | 'takeout' | 'unknown';
export type Adventure = 'familiar' | 'balanced' | 'surprise';
export interface SearchPreferences {
    location: DiningLocation;
    budget: number;
    people: number;
    bufferPercent: number;
    diningMode: DiningMode;
    adventure: Adventure;
    maxDistanceMeters: number;
    openNow: boolean;
}
