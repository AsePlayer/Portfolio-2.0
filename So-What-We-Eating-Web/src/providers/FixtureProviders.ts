import type { RestaurantProvider, RestaurantSearchQuery } from './RestaurantProvider.ts';
import type { MenuProvider } from './MenuProvider.ts';
import type { Restaurant } from '../domain/Restaurant.ts';
import type { Menu } from '../domain/Menu.ts';
import { distanceMeters } from '../location/LocationParser.ts';
export class FixtureRestaurantProvider implements RestaurantProvider {
    private restaurants: Restaurant[];
    constructor(restaurants: Restaurant[]) { this.restaurants = restaurants; }
    async searchNearby(query: RestaurantSearchQuery): Promise<Restaurant[]> {
        return this.restaurants.map(r => ({ ...r, isDemo: true, distanceMeters: r.latitude !== undefined && r.longitude !== undefined ? distanceMeters(query.location, { latitude: r.latitude, longitude: r.longitude }) : undefined }))
            .filter(r => r.distanceMeters === undefined || r.distanceMeters <= query.maxDistanceMeters);
    }
}
export class FixtureMenuProvider implements MenuProvider {
    private menus: Map<string, Menu>;
    constructor(menus: Map<string, Menu>) { this.menus = menus; }
    async getMenu(restaurant: Restaurant): Promise<Menu | null> { return this.menus.get(restaurant.id) ?? null; }
}
