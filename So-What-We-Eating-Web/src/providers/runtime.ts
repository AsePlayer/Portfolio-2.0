import type { RestaurantProvider } from './RestaurantProvider.ts';
import type { MenuProvider } from './MenuProvider.ts';
import type { Restaurant } from '../domain/Restaurant.ts';
import { GooglePlacesProvider } from './GooglePlacesProvider.ts';
import { OpenStreetMapProvider, DEFAULT_OVERPASS, DEFAULT_PHOTON } from './OpenStreetMapProvider.ts';
export interface ProviderRuntime {
    mode: 'live' | 'demo';
    configured: boolean;
    restaurants: RestaurantProvider;
    menus: MenuProvider;
    catalog: Restaurant[];
}
export async function createRuntime(mode: string | undefined, endpoint = '', provider = 'openstreetmap', overpass = DEFAULT_OVERPASS, photon = DEFAULT_PHOTON): Promise<ProviderRuntime> {
    if (mode === 'demo') {
        const [{ fixtureCatalog }, { FixtureRestaurantProvider, FixtureMenuProvider }] = await Promise.all([import('../catalog/loader.ts'), import('./FixtureProviders.ts')]);
        return { mode: 'demo', configured: true, restaurants: new FixtureRestaurantProvider(fixtureCatalog.restaurants), menus: new FixtureMenuProvider(fixtureCatalog.menus), catalog: fixtureCatalog.restaurants };
    }
    if (provider === 'openstreetmap') {
        return { mode: 'live', configured: true, restaurants: new OpenStreetMapProvider(overpass || DEFAULT_OVERPASS, photon || DEFAULT_PHOTON), menus: { getMenu: async () => null }, catalog: [] };
    }
    // Google is an explicit opt-in. Missing configuration never swaps in fictional places.
    let restaurants: RestaurantProvider;
    try {
        restaurants = new GooglePlacesProvider(endpoint);
    }
    catch {
        endpoint = '';
        restaurants = new GooglePlacesProvider();
    }
    return { mode: 'live', configured: !!endpoint, restaurants, menus: { getMenu: async () => null }, catalog: [] };
}
