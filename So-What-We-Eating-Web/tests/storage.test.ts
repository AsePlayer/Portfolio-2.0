import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalDatabase } from '../src/storage/LocalDatabase.ts';
import { HistoryStore } from '../src/storage/HistoryStore.ts';
import { PreferenceStore } from '../src/storage/PreferenceStore.ts';
import { SettingsStore } from '../src/storage/SettingsStore.ts';
import type { MealRecommendation } from '../src/domain/MealRecommendation.ts';
const result: MealRecommendation = { id: 'recommendation-1', restaurant: { id: 'sample', name: 'Sample', cuisines: ['Thai'], source: 'fixture' }, menu: null, meal: null, menuStatus: 'unavailable', preferences: { location: { latitude: 34.123456, longitude: -118.123456, source: 'browser', label: 'Current location' }, budget: 35, people: 1, bufferPercent: 0.2, diningMode: 'unknown', adventure: 'balanced', maxDistanceMeters: 8047, openNow: true } };
function memory() { const items = new Map<string, string>(); return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key, value); }, items }; }
test('viewing, rejecting, directions, menus, and rerolls do not create completed meals; acceptance is idempotent and survives reload', () => {
    const adapter = memory(), db = new LocalDatabase('/demo/', adapter), history = new HistoryStore(db);
    for (const type of ['shown', 'reject', 'directions', 'menu', 'reroll-order'] as const)
        history.record(type, 'sample');
    assert.equal(history.meals.length, 0);
    assert.equal(history.accept(result), true);
    assert.equal(history.accept(result), false);
    assert.equal(history.meals.length, 1);
    const reloaded = new LocalDatabase('/demo/', adapter);
    assert.equal(new HistoryStore(reloaded).meals.length, 1);
    assert(![...adapter.items.values()].join('').includes('34.123456'));
    assert(![...adapter.items.values()].join('').includes('-118.123456'));
    assert.equal(new LocalDatabase('/other-app/', adapter).data.history.length, 0);
});
test('favorites, exclusions, cuisine preferences and settings persist independently of completed history', () => {
    const adapter = memory(), db = new LocalDatabase('/demo/', adapter), preferences = new PreferenceStore(db), settings = new SettingsStore(db);
    preferences.updateRestaurant('sample', { favorite: true, excluded: true });
    preferences.setCuisine('Thai', 'favorite');
    preferences.setCuisine('Italian', 'avoid');
    settings.update({ budget: 80, people: 4, bufferPercent: 0.25 });
    const restored = new LocalDatabase('/demo/', adapter);
    assert.equal(restored.data.history.length, 0);
    assert.deepEqual(restored.data.preferences, db.data.preferences);
    assert.equal(restored.data.settings.people, 4);
    assert.equal(restored.data.settings.budget, 80);
    preferences.setCuisine('Thai', 'avoid');
    assert(!preferences.value.favoriteCuisines.includes('Thai'));
    assert(preferences.value.avoidedCuisines.includes('Thai'));
});
test('storage denial, full quota and malformed saved data retain a working temporary session', () => {
    const denied = new LocalDatabase('/denied/', { getItem() { throw new Error('Denied'); }, setItem() { throw new Error('Denied'); } });
    assert(denied.temporary);
    new HistoryStore(denied).accept(result);
    assert.equal(denied.data.history.length, 1);
    const full = new LocalDatabase('/full/', { getItem: () => null, setItem() { throw new Error('Quota'); } });
    new PreferenceStore(full).updateRestaurant('sample', { favorite: true });
    assert(full.temporary);
    assert(full.data.preferences.restaurants[0].favorite);
    const adapter = memory();
    adapter.setItem('swwe:v1:/bad/', '{"version":9}');
    const bad = new LocalDatabase('/bad/', adapter);
    assert(bad.temporary);
    new HistoryStore(bad).accept(result);
    assert.equal(adapter.getItem('swwe:v1:/bad/'), '{"version":9}');
});
