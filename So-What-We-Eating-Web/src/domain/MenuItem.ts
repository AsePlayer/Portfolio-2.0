export const MENU_ROLES = ['main', 'side', 'appetizer', 'drink', 'dessert', 'combo', 'shared', 'other'] as const;
export type MenuItemRole = typeof MENU_ROLES[number];
export interface MenuItem {
    id: string;
    name: string;
    description?: string;
    category?: string;
    role: MenuItemRole;
    price: number; // Catalog prices are USD; all arithmetic converts to integer cents.
    serves?: number; // Only shared meals may serve more than one person.
    source?: string;
}
