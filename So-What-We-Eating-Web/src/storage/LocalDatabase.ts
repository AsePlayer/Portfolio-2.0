import type { CompletedMeal, RecommendationEvent } from '../domain/DiningHistory.ts';
import type { UserPreferences } from '../domain/RestaurantPreference.ts';
import type { Adventure, DiningMode } from '../domain/SearchPreferences.ts';
import { CONFIG } from '../domain/config.ts';
export interface Settings {
    budget: number;
    people: number;
    locationLabel: string;
    bufferPercent: number;
    adventure: Adventure;
    diningMode: DiningMode;
}
export interface StoredData {
    version: 1;
    history: CompletedMeal[];
    events: RecommendationEvent[];
    preferences: UserPreferences;
    settings: Settings;
}
export interface StorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
const defaults = (): StoredData => ({ version: 1, history: [], events: [], preferences: { restaurants: [], favoriteCuisines: [], avoidedCuisines: [] }, settings: { budget: CONFIG.defaultBudget, people: 1, locationLabel: CONFIG.defaultLocation, bufferPercent: CONFIG.bufferPercent, adventure: 'balanced', diningMode: 'unknown' } });
function validData(value: unknown): value is StoredData {
    const d = value as StoredData;
    if (!d || d.version !== 1 || !Array.isArray(d.history) || !Array.isArray(d.events) || !d.preferences || !d.settings)
        return false;
    const s = d.settings, p = d.preferences;
    return Number.isFinite(s.budget) && s.budget >= CONFIG.minBudget && s.budget <= CONFIG.maxBudget && Number.isInteger(s.people) && s.people >= 1 && s.people <= 8 && typeof s.locationLabel === 'string'
        && Number.isFinite(s.bufferPercent) && s.bufferPercent >= 0 && s.bufferPercent <= 0.5 && ['familiar', 'balanced', 'surprise'].includes(s.adventure) && ['dine-in', 'takeout', 'unknown'].includes(s.diningMode)
        && Array.isArray(p.restaurants) && p.restaurants.every(r => r && typeof r.restaurantId === 'string' && typeof r.favorite === 'boolean' && typeof r.excluded === 'boolean')
        && Array.isArray(p.favoriteCuisines) && p.favoriteCuisines.every(c => typeof c === 'string') && Array.isArray(p.avoidedCuisines) && p.avoidedCuisines.every(c => typeof c === 'string')
        && d.history.every(h => h && typeof h.id === 'string' && typeof h.restaurantName === 'string' && typeof h.restaurantId === 'string' && Number.isFinite(Date.parse(h.at)) && Array.isArray(h.order) && h.order.every(i => typeof i === 'string') && Array.isArray(h.cuisines) && h.cuisines.every(c => typeof c === 'string') && (h.totalCents === null || Number.isSafeInteger(h.totalCents)) && Number.isInteger(h.people))
        && d.events.every(e => e && typeof e.restaurantId === 'string' && typeof e.id === 'string' && Number.isFinite(Date.parse(e.at)) && ['shown', 'reject', 'reroll-order', 'directions', 'menu', 'accepted'].includes(e.type));
}
export class LocalDatabase extends EventTarget {
    data = defaults();
    temporary = false;
    private adapter?: StorageAdapter;
    private key: string;
    constructor(namespace: string, adapter?: StorageAdapter) {
        super();
        this.key = `swwe:v1:${namespace}`;
        try {
            this.adapter = adapter ?? globalThis.localStorage;
            const saved = this.adapter.getItem(this.key);
            if (saved) {
                const parsed: unknown = JSON.parse(saved);
                if (!validData(parsed))
                    throw new Error('Saved data has an unsupported format.');
                this.data = parsed;
            }
        }
        catch {
            this.temporary = true;
        }
    }
    save() {
        if (this.temporary)
            return;
        try {
            this.adapter?.setItem(this.key, JSON.stringify(this.data));
        }
        catch {
            this.temporary = true;
            this.dispatchEvent(new Event('storagefailure'));
        }
    }
    clear() { this.data = defaults(); this.save(); }
}
