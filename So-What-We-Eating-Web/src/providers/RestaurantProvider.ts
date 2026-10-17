import type { Restaurant } from '../domain/Restaurant.ts';
import type { DiningLocation } from '../domain/SearchPreferences.ts';
export interface RestaurantSearchQuery {
    location: DiningLocation;
    maxDistanceMeters: number;
}
export interface RestaurantProvider {
    readonly resolvedLabel?: string;
    searchNearby(query: RestaurantSearchQuery): Promise<Restaurant[]>;
    lookup?(placeIds: string[]): Promise<Restaurant[]>;
}
