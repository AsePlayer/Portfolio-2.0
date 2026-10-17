export type LocationSource = 'browser' | 'zip' | 'city' | 'manual';
export interface DiningLocation {
    label: string;
    source: LocationSource;
    latitude: number;
    longitude: number;
}
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
}
