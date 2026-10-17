import type { CompletedMeal, RecommendationEvent } from '../domain/DiningHistory.ts';
import type { UserPreferences } from '../domain/RestaurantPreference.ts';
import type { Adventure, DiningMode } from '../domain/SearchPreferences.ts';
import { CONFIG } from '../domain/config.ts';
import { validRadius } from '../domain/Radius.ts';
export interface Settings {
    budget: number;
    people: number;
    bufferPercent: number;
    adventure: Adventure;
    diningMode: DiningMode;
    radiusMeters: number;
    openNow: boolean;
}
export interface StoredData {
    version: 2;
    history: CompletedMeal[];
    events: RecommendationEvent[];
    preferences: UserPreferences;
    settings: Settings;
}
export interface StorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
const defaults = (): StoredData => ({
    version: 2, history: [], events: [], preferences: { restaurants: [], favoriteCuisines: [], avoidedCuisines: [] },
    settings: { budget: CONFIG.defaultBudget, people: 1, bufferPercent: CONFIG.bufferPercent, adventure: 'balanced', diningMode: 'unknown', radiusMeters: CONFIG.defaultRadiusMeters, openNow: true },
});
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(v => typeof v === 'string');
function migrate(value: any): StoredData {
    if (!value || ![1, 2].includes(value.version) || !Array.isArray(value.history) || !Array.isArray(value.events) || !value.preferences || !value.settings)
        throw new Error('Unsupported data');
    const s = value.settings, p = value.preferences;
    if (!Number.isFinite(s.budget) || s.budget < 5 || s.budget > 2000 || !Number.isInteger(s.people) || s.people < 1 || s.people > 8 || !Number.isFinite(s.bufferPercent) || s.bufferPercent < 0 || s.bufferPercent > 0.5 || !['familiar', 'balanced', 'surprise'].includes(s.adventure) || !['dine-in', 'takeout', 'unknown'].includes(s.diningMode))
        throw new Error('Invalid settings');
    if (!Array.isArray(p.restaurants) || !p.restaurants.every((r: any) => r && typeof r.restaurantId === 'string' && typeof r.favorite === 'boolean' && typeof r.excluded === 'boolean') || !strings(p.favoriteCuisines) || !strings(p.avoidedCuisines))
        throw new Error('Invalid preferences');
    const data = defaults();
    data.settings = { budget: s.budget, people: s.people, bufferPercent: s.bufferPercent, adventure: s.adventure, diningMode: s.diningMode, radiusMeters: validRadius(s.radiusMeters) ? s.radiusMeters : CONFIG.defaultRadiusMeters, openNow: typeof s.openNow === 'boolean' ? s.openNow : true };
    data.preferences = { restaurants: p.restaurants.map((r: any) => ({ restaurantId: r.restaurantId, favorite: r.favorite, excluded: r.excluded })), favoriteCuisines: p.favoriteCuisines, avoidedCuisines: p.avoidedCuisines };
    data.history = value.history.slice(0, CONFIG.historyLimit).map((h: any) => {
        if (!h || typeof h.id !== 'string' || typeof h.restaurantId !== 'string' || !Number.isFinite(Date.parse(h.at)) || !Number.isInteger(h.people) || h.people < 1 || h.people > 8)
            throw new Error('Invalid history');
        const base = { id: h.id, recommendationId: typeof h.recommendationId === 'string' ? h.recommendationId : h.id, at: h.at, restaurantId: h.restaurantId, people: h.people };
        // Whitelist user-owned fields. Remove any Google snapshots, including legacy ones.
        if (h.restaurantId.startsWith('google:'))
            return { ...base, provider: 'google-places', sourceId: h.restaurantId.slice(7), cuisines: [], order: [], totalCents: null };
        if (h.restaurantId.startsWith('osm:'))
            return { ...base, provider: 'openstreetmap', sourceId: h.restaurantId.slice(4), cuisines: [], order: [], totalCents: null };
        if (typeof h.restaurantName !== 'string' || !strings(h.cuisines) || !strings(h.order) || (h.totalCents !== null && !Number.isSafeInteger(h.totalCents)))
            throw new Error('Invalid fixture history');
        return { ...base, provider: 'fixture', restaurantName: h.restaurantName, cuisines: h.cuisines, order: h.order, totalCents: h.totalCents, isDemo: true };
    });
    data.events = value.events.slice(0, CONFIG.eventLimit).map((e: any) => {
        if (!e || typeof e.restaurantId !== 'string' || typeof e.id !== 'string' || !Number.isFinite(Date.parse(e.at)) || !['shown', 'reject', 'reroll-order', 'directions', 'menu', 'accepted'].includes(e.type))
            throw new Error('Invalid event');
        return { id: e.id, restaurantId: e.restaurantId, at: e.at, type: e.type };
    });
    return data;
}
export class LocalDatabase extends EventTarget {
    data = defaults();
    temporary = false;
    private adapter?: StorageAdapter;
    private key: string;
    constructor(namespace: string, adapter?: StorageAdapter) {
        super();
        // Keep the existing path namespace so installed CB01 users can migrate in place.
        this.key = `swwe:v1:${namespace}`;
        try {
            this.adapter = adapter ?? globalThis.localStorage;
            const saved = this.adapter.getItem(this.key);
            if (saved) {
                this.data = migrate(JSON.parse(saved));
                this.save();
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
    clear() { this.data = defaults(); this.temporary = false; this.save(); }
}
