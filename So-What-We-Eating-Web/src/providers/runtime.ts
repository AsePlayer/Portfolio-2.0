import type { RestaurantProvider } from './RestaurantProvider.ts';
import type { MenuProvider } from './MenuProvider.ts';
import type { MenuResolver } from '../menus/MenuResolver.ts';
import type { Restaurant } from '../domain/Restaurant.ts';
import { GooglePlacesProvider } from './GooglePlacesProvider.ts';
import { AllMenusMenuResolver } from '../menus/AllMenusMenuResolver.ts';
import { AllMenusProvider } from './AllMenusProvider.ts';
import { DEFAULT_GEOCODER } from './allmenus/location.ts';
export interface ProviderRuntime {
    mode: 'live' | 'demo';
    configured: boolean;
    restaurants: RestaurantProvider;
    menus: MenuProvider | MenuResolver;
    catalog: Restaurant[];
}
export async function createRuntime(mode: string | undefined, serviceUrl = ''): Promise<ProviderRuntime> {
    if (mode === 'demo') {
        const [{ fixtureCatalog }, { FixtureRestaurantProvider, FixtureMenuProvider }] = await Promise.all([import('../catalog/loader.ts'), import('./FixtureProviders.ts')]);
        return { mode: 'demo', configured: true, restaurants: new FixtureRestaurantProvider(fixtureCatalog.restaurants), menus: new FixtureMenuProvider(fixtureCatalog.menus), catalog: fixtureCatalog.restaurants };
    }
    // Keep the working portfolio flow. The unverified Google architecture is
    // available only by an explicit opt-in, never through normal live mode.
    if (mode !== 'google') {
        const provider = new AllMenusProvider(serviceUrl || DEFAULT_GEOCODER);
        return { mode: 'live', configured: true, restaurants: provider, menus: provider, catalog: [] };
    }
    let restaurants: GooglePlacesProvider;
    try { restaurants = new GooglePlacesProvider(serviceUrl); }
    catch { return { mode: 'live', configured: false, restaurants: new GooglePlacesProvider(), menus: new AllMenusMenuResolver(), catalog: [] }; }
    return { mode: 'live', configured: !!serviceUrl, restaurants, menus: new AllMenusMenuResolver(), catalog: [] };
}
