export interface RestaurantPreference {
    restaurantId: string;
    favorite: boolean;
    excluded: boolean;
}
export interface UserPreferences {
    restaurants: RestaurantPreference[];
    favoriteCuisines: string[];
    avoidedCuisines: string[];
}
