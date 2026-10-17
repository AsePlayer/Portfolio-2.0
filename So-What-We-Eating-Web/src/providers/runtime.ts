import type { RestaurantProvider } from './RestaurantProvider.ts';
import type { MenuProvider } from './MenuProvider.ts';
import type { Restaurant } from '../domain/Restaurant.ts';
import { AllMenusProvider } from './AllMenusProvider.ts';
import { DEFAULT_GEOCODER } from './allmenus/location.ts';
export interface ProviderRuntime {
    mode: 'live' | 'demo';
    configured: boolean;
    restaurants: RestaurantProvider;
    menus: MenuProvider;
    catalog: Restaurant[];
}
export async function createRuntime(mode: string | undefined, geocoder = DEFAULT_GEOCODER): Promise<ProviderRuntime> {
    if (mode === 'demo') {
        const [{ fixtureCatalog }, { FixtureRestaurantProvider, FixtureMenuProvider }] = await Promise.all([import('../catalog/loader.ts'), import('./FixtureProviders.ts')]);
        return { mode: 'demo', configured: true, restaurants: new FixtureRestaurantProvider(fixtureCatalog.restaurants), menus: new FixtureMenuProvider(fixtureCatalog.menus), catalog: fixtureCatalog.restaurants };
    }
    const provider = new AllMenusProvider(geocoder || DEFAULT_GEOCODER);
    return { mode: 'live', configured: true, restaurants: provider, menus: provider, catalog: [] };
}
