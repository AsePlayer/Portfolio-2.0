import type { Menu } from '../domain/Menu.ts';
import type { Restaurant } from '../domain/Restaurant.ts';
import { MENU_ROLES } from '../domain/MenuItem.ts';
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export function isWebUrl(value: unknown): value is string {
    if (!text(value))
        return false;
    try {
        return ['http:', 'https:'].includes(new URL(value).protocol);
    }
    catch {
        return false;
    }
}
export function assertMenu(value: unknown): asserts value is Menu {
    if (!record(value) || value.schemaVersion !== 1 || !text(value.restaurantId) || !text(value.restaurantName) || !text(value.source) || value.currency !== 'USD' || !text(value.updatedAt) || !Number.isFinite(Date.parse(value.updatedAt)) || !Array.isArray(value.items) || value.items.length === 0)
        throw new Error('Invalid menu identity, provenance, currency, date, or items.');
    if (value.sourceUrl !== undefined && !isWebUrl(value.sourceUrl))
        throw new Error('Invalid menu source URL.');
    const ids = new Set<string>();
    for (const item of value.items) {
        if (!record(item) || !text(item.id) || !text(item.name) || !finite(item.price) || item.price <= 0 || !Number.isSafeInteger(Math.round(item.price * 100)) || Math.abs(item.price * 100 - Math.round(item.price * 100)) > 0.000001 || !MENU_ROLES.includes(item.role as never))
            throw new Error('Invalid menu item: identity, positive two-decimal price, and valid role required.');
        if (ids.has(item.id))
            throw new Error(`Duplicate menu item ID: ${item.id}`);
        ids.add(item.id);
        if (item.serves !== undefined && (!finite(item.serves) || !Number.isInteger(item.serves) || item.serves < 1 || item.serves > 8 || (item.serves > 1 && item.role !== 'shared')))
            throw new Error('Only shared items can serve multiple people (1–8).');
        for (const field of ['description', 'category', 'source'])
            if (item[field] !== undefined && !text(item[field]))
                throw new Error(`Invalid item ${field}.`);
    }
}
export function assertRestaurants(value: unknown): asserts value is Restaurant[] {
    if (!Array.isArray(value) || !value.length)
        throw new Error('Restaurant catalog must be a nonempty array.');
    const ids = new Set<string>();
    for (const r of value) {
        if (!record(r) || !text(r.id) || !text(r.name) || !text(r.source) || !Array.isArray(r.cuisines) || !r.cuisines.every(text) || ids.has(r.id))
            throw new Error('Invalid or duplicate restaurant.');
        ids.add(r.id);
        for (const key of ['latitude', 'longitude', 'rating', 'reviewCount', 'priceLevel', 'distanceMeters'])
            if (r[key] !== undefined && !finite(r[key]))
                throw new Error(`Invalid restaurant ${key}.`);
        if (r.latitude !== undefined && Math.abs(r.latitude as number) > 90 || r.longitude !== undefined && Math.abs(r.longitude as number) > 180)
            throw new Error('Invalid coordinates.');
        if (r.priceLevel !== undefined && (!Number.isInteger(r.priceLevel) || (r.priceLevel as number) < 1 || (r.priceLevel as number) > 4))
            throw new Error('Invalid price level.');
        if (r.isOpen !== undefined && typeof r.isOpen !== 'boolean')
            throw new Error('Invalid open status.');
        if (r.isDemo !== undefined && typeof r.isDemo !== 'boolean')
            throw new Error('Invalid sample-data flag.');
        for (const key of ['websiteUrl', 'menuUrl', 'directionsUrl'])
            if (r[key] !== undefined && !isWebUrl(r[key]))
                throw new Error('Invalid restaurant URL.');
    }
}
