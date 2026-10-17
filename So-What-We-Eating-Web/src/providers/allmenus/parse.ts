import type { Restaurant } from '../../domain/Restaurant.ts';
import type { Menu } from '../../domain/Menu.ts';
import type { MenuItem } from '../../domain/MenuItem.ts';
import { assertMenu } from '../../catalog/validate.ts';
import { isCoordinates } from '../../location/geo.ts';
import { inferRole } from '../../../tools/menus/inferRole.ts';
import { addressIdentity } from '../../menus/normalizeIdentity.ts';

const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
export function menuUrl(value: string, base = 'https://www.allmenus.com'): URL | null {
    try {
        const url = new URL(value, base);
        return url.protocol === 'https:' && url.hostname === 'www.allmenus.com' && !url.username && !url.password
            && /^\/[a-z]{2}\/[^/]+\/\d+-[^/]+\/menu\/$/.test(url.pathname) ? url : null;
    } catch { return null; }
}
export function exactPrice(value: string): number | null {
    // A range, "from", '+', options, or market price is not one exact item price.
    const match = clean(value).match(/^\$\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)$/);
    if (!match) return null;
    const price = Number(match[1].replaceAll(',', ''));
    return price > 0 && price <= 10000 ? price : null;
}
function stableId(value: string): string {
    let hash = 2166136261;
    for (const character of value) hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619);
    return `item-${(hash >>> 0).toString(36)}`;
}
export function parseRestaurants(document: Document): Restaurant[] {
    const found = new Map<string, Restaurant>();
    for (const row of document.querySelectorAll('.restaurant-list-item')) {
        const link = row.querySelector<HTMLAnchorElement>('.name a');
        const url = menuUrl(link?.getAttribute('href') ?? '');
        const name = clean(link?.textContent);
        if (!url || !name) continue;
        const sourceId = url.pathname.match(/\/(\d+)-[^/]+\/menu\/$/)![1];
        found.set(sourceId, {
            id: `allmenus:${sourceId}`, source: 'allmenus', sourceId, name,
            address: [...row.querySelectorAll('.address')].map(n => clean(n.textContent)).filter(Boolean).join(', '),
            cuisines: clean(row.querySelector('.cuisine-list')?.textContent).split(',').map(clean).filter(Boolean),
            menuUrl: url.href,
        });
    }
    return [...found.values()];
}
export function parseMenuRestaurant(document: Document, restaurant: Restaurant, checkedAt: string): Restaurant | null {
    const url = menuUrl(restaurant.menuUrl ?? '');
    const name = clean(document.querySelector('.restaurant-summary h1')?.textContent);
    if (!url || !name) return null;
    const addressNode = document.querySelector<HTMLAnchorElement>('a.menu-address');
    // The detail page must establish its own address. Never inherit index evidence.
    const address = clean(addressNode?.textContent);
    if (!address) return null;
    const coordinates = decodeURIComponent(addressNode?.getAttribute('href') ?? '').match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
    const point = coordinates ? { latitude: Number(coordinates[1]), longitude: Number(coordinates[2]) } : undefined;
    const identity = addressIdentity({ id: restaurant.id, source: 'allmenus', name, address, cuisines: [] });
    return { ...restaurant, name, address, streetAddress: address.split(',')[0], locality: identity.locality,
        regionCode: identity.regionCode, postalCode: identity.postalCode, countryCode: 'US',
        latitude: undefined, longitude: undefined, ...(isCoordinates(point) ? point : {}), checkedAt };
}
export function parsePricedMenu(document: Document, restaurant: Restaurant, checkedAt: string): { restaurant: Restaurant; menu: Menu } | null {
    const url = menuUrl(restaurant.menuUrl ?? '');
    const detail = parseMenuRestaurant(document, restaurant, checkedAt);
    if (!url || !detail) return null;
    const items = new Map<string, MenuItem>(), conflicts = new Set<string>();
    for (const section of document.querySelectorAll('.menu-category')) {
        const category = clean(section.querySelector('.category-name')?.textContent);
        // Do not recommend age-restricted offers or time-limited discounts as regular meals.
        if (/\b(kids?|children|seniors?|happy hour|lunch specials?|catering|party trays?)\b/i.test(category)) continue;
        for (const row of section.querySelectorAll('.menu-items')) {
            const itemName = clean(row.querySelector('.item-title')?.textContent);
            const price = exactPrice(clean(row.querySelector('.item-price')?.textContent));
            if (!itemName || price === null || row.querySelectorAll('.item-price').length !== 1) continue;
            if (/\b(build your own|create your own)\b/i.test(itemName)) continue;
            const id = stableId(`${category}|${itemName}`);
            if (conflicts.has(id)) continue;
            if (items.has(id) && items.get(id)!.price !== price) { items.delete(id); conflicts.add(id); continue; }
            let role = inferRole(itemName, category);
            if (role === 'shared') role = 'other'; // No invented serving counts for family trays.
            items.set(id, { id, name: itemName, price, category: category || undefined, role });
        }
    }
    if (!items.size) return null;
    const menu: Menu = { schemaVersion: 1, restaurantId: restaurant.id, restaurantName: detail.name, source: 'AllMenus', provider: 'allmenus', providerRestaurantId: restaurant.sourceId, sourceUrl: url.href, updatedAt: checkedAt, retrievedAt: checkedAt, currency: 'USD', items: [...items.values()] };
    assertMenu(menu);
    return { menu, restaurant: detail };
}
