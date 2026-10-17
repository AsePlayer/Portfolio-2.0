import type { RestaurantProvider, RestaurantSearchQuery } from './RestaurantProvider.ts';
import type { MenuProvider } from './MenuProvider.ts';
import type { Restaurant } from '../domain/Restaurant.ts';
import type { Menu } from '../domain/Menu.ts';
import { distanceMeters } from '../location/LocationParser.ts';
import { isCoordinates } from '../location/geo.ts';
import { DiscoveryError } from '../domain/Discovery.ts';
export const DEMO_CENTER = { latitude: 34.1478, longitude: -118.1445 };
export class FixtureRestaurantProvider implements RestaurantProvider {
    private restaurants: Restaurant[];
    constructor(restaurants: Restaurant[]) { this.restaurants = restaurants; }
    async searchNearby(query: RestaurantSearchQuery): Promise<Restaurant[]> {
        let origin;
        if (isCoordinates(query.location))
            origin = query.location;
        else if (/^(pasadena(?:,?\s+(?:ca|california))?|91101|91103|91105)$/i.test(query.location.query))
            origin = DEMO_CENTER;
        else
            throw new DiscoveryError('location');
        return this.restaurants.map(r => ({ ...r, isDemo: true, distanceMeters: r.latitude !== undefined && r.longitude !== undefined ? distanceMeters(origin, { latitude: r.latitude, longitude: r.longitude }) : undefined }))
            .filter(r => r.distanceMeters === undefined || r.distanceMeters <= query.maxDistanceMeters);
    }
}
export class FixtureMenuProvider implements MenuProvider {
    private menus: Map<string, Menu>;
    constructor(menus: Map<string, Menu>) { this.menus = menus; }
    async getMenu(restaurant: Restaurant): Promise<Menu | null> { return this.menus.get(restaurant.id) ?? null; }
}
