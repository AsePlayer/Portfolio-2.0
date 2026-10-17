import type { MenuItem } from './MenuItem.ts';
export interface Menu {
    schemaVersion: 1;
    restaurantId: string;
    restaurantName: string;
    source: string;
    sourceUrl?: string;
    updatedAt: string;
    currency: 'USD';
    items: MenuItem[];
}
