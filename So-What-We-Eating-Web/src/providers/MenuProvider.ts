import type { Menu } from '../domain/Menu.ts';
import type { Restaurant } from '../domain/Restaurant.ts';
export interface MenuProvider {
    getMenu(restaurant: Restaurant): Promise<Menu | null>;
}
