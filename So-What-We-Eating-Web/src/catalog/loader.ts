import restaurants from '../../content/restaurants/fixtures.json';
import { assertMenu, assertRestaurants } from './validate.ts';
import type { Menu } from '../domain/Menu.ts';
// Vite bundles only this small validated fixture catalog. Future catalogs can fetch chunks.
const modules = import.meta.glob('../../content/menus/restaurants/*.json', { eager: true, import: 'default' });
assertRestaurants(restaurants);
const menus = new Map<string, Menu>();
for (const value of Object.values(modules)) {
    assertMenu(value);
    menus.set(value.restaurantId, value);
}
export const fixtureCatalog = { restaurants, menus };
