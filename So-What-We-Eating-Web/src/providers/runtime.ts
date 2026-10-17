import type { RestaurantProvider } from './RestaurantProvider.ts';
import type { MenuProvider } from './MenuProvider.ts';
import type { MenuResolver } from '../menus/MenuResolver.ts';
import type { Restaurant } from '../domain/Restaurant.ts';
import { GooglePlacesProvider } from './GooglePlacesProvider.ts';
import { AllMenusMenuResolver } from '../menus/AllMenusMenuResolver.ts';
export interface ProviderRuntime {
    mode: 'live' | 'demo';
    configured: boolean;
    restaurants: RestaurantProvider;
    menus: MenuProvider | MenuResolver;
    catalog: Restaurant[];
}
export async function createRuntime(mode: string | undefined, discoveryUrl = ''): Promise<ProviderRuntime> {
    if (mode === 'demo') {
        const [{ fixtureCatalog }, { FixtureRestaurantProvider, FixtureMenuProvider }] = await Promise.all([import('../catalog/loader.ts'), import('./FixtureProviders.ts')]);
        return { mode: 'demo', configured: true, restaurants: new FixtureRestaurantProvider(fixtureCatalog.restaurants), menus: new FixtureMenuProvider(fixtureCatalog.menus), catalog: fixtureCatalog.restaurants };
    }
    let restaurants: GooglePlacesProvider;
    try { restaurants = new GooglePlacesProvider(discoveryUrl); }
    catch { return { mode: 'live', configured: false, restaurants: new GooglePlacesProvider(), menus: new AllMenusMenuResolver(), catalog: [] }; }
    return { mode: 'live', configured: !!discoveryUrl, restaurants, menus: new AllMenusMenuResolver(), catalog: [] };
}
