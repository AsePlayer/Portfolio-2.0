import type { Restaurant } from './Restaurant.ts';
import type { Menu } from './Menu.ts';
import type { MenuItem } from './MenuItem.ts';
import type { SearchPreferences } from './SearchPreferences.ts';
export interface OrderLine {
    item: MenuItem;
    quantity: number;
}
export interface Meal {
    lines: OrderLine[];
    signature: string;
    subtotalCents: number;
    bufferCents: number;
    totalCents: number;
    budgetCents: number;
    foodBudgetCents: number;
}
export interface MealRecommendation {
    id: string;
    restaurant: Restaurant;
    menu: Menu | null;
    meal: Meal | null;
    menuStatus: 'available' | 'unavailable' | 'unaffordable';
    preferences: SearchPreferences;
}
