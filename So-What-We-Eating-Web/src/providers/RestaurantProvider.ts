import type { Restaurant } from '../domain/Restaurant.ts';
import type { DiningLocation } from '../domain/SearchPreferences.ts';
export interface RestaurantSearchQuery {
    location: DiningLocation;
    maxDistanceMeters: number;
    openNow: boolean;
}
export interface RestaurantProvider {
    searchNearby(query: RestaurantSearchQuery): Promise<Restaurant[]>;
    lookup?(placeIds: string[]): Promise<Restaurant[]>;
}
