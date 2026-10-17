import test from 'node:test';
import assert from 'node:assert/strict';
import type { Menu } from '../src/domain/Menu.ts';
import type { MenuItem } from '../src/domain/MenuItem.ts';
import { buildMeal, mealCandidates, distinctAnchorPicks, PARTY_SIMULATIONS } from '../src/recommendation/MealBuilder.ts';
import { seededRandom } from '../src/recommendation/random.ts';
import { parseLocation } from '../src/location/LocationParser.ts';

const main = (id: string, price: number): MenuItem => ({ id, name: id, price, role: 'main' });
const menu = (items: MenuItem[]): Menu => ({ schemaVersion: 1, restaurantId: 'party', restaurantName: 'Test kitchen', source: 'test-only', updatedAt: '2026-10-17T00:00:00Z', currency: 'USD', items });
const preferences = (people: number, budget = 100) => ({ location: parseLocation('91711'), budget, people, bufferPercent: 0.2, diningMode: 'unknown' as const, adventure: 'balanced' as const, maxDistanceMeters: 8047 });
const quantity = (meal: NonNullable<ReturnType<typeof buildMeal>>) => meal.lines.filter(l => ['main', 'combo', 'shared'].includes(l.item.role)).reduce((sum, l) => sum + l.quantity * (l.item.serves ?? 1), 0);

test('one diner remains a complete meal; five diners get real variety and compressed duplicate selections', () => {
    const source = menu(Array.from({ length: 9 }, (_, i) => main(`main-${i}`, 7.5 + i * 0.25)));
    const one = buildMeal(source, preferences(1, 20), seededRandom(1))!;
    assert.equal(quantity(one), 1);
    const party = buildMeal(source, preferences(5), seededRandom(1))!;
    assert.equal(quantity(party), 5);
    assert(party.lines.length >= 3, 'Multiple independently selected mains, not party-size multiplication');
    const limited = buildMeal(menu([main('one', 9), main('two', 10)]), preferences(5), seededRandom(3))!;
    assert.equal(quantity(limited), 5);
    assert.equal(limited.lines.length, 2);
    assert(limited.lines.some(l => l.quantity > 1));
    assert.equal(new Set(limited.lines.map(l => l.item.id)).size, limited.lines.length, 'Duplicates aggregate into one receipt line per item');
    assert.equal(distinctAnchorPicks([{ item: { ...main('lunch', 9), name: 'Burger' }, quantity: 2 }, { item: { ...main('dinner', 10), name: 'Burger' }, quantity: 1 }]), 1, 'Identical named offers do not inflate the variety cue');
});

test('tight budgets finish all diners before extras, with an exact-cent cheapest fallback and no per-diner spending cap', () => {
    const tight = menu([main('affordable', 5.01), main('too-much', 9), { id: 'extra', name: 'Chips', price: 1, role: 'appetizer' }]);
    const meal = buildMeal(tight, preferences(5, 31.32), seededRandom(42))!;
    assert.equal(quantity(meal), 5);
    assert.equal(meal.lines.length, 1);
    assert.equal(meal.lines[0].quantity, 5);
    assert.equal(meal.subtotalCents, 2505);
    assert.equal(meal.totalCents, meal.subtotalCents + meal.bufferCents);
    assert(meal.totalCents <= 3132);
    assert.equal(buildMeal(tight, preferences(5, 30)), null);
    const uneven = mealCandidates(menu([main('big', 24), main('small', 4)]), preferences(2, 35), seededRandom(5));
    assert(uneven.some(m => m.lines.some(l => l.item.id === 'big') && m.subtotalCents === 2800), 'An expensive diner can use budget another diner does not need');
});

test('shared dishes need explicit servings and combos never consume individual side/drink slots', () => {
    const shared: MenuItem = { id: 'platter', name: 'Listed four-person platter', price: 33, role: 'shared', serves: 4 };
    const mixed = buildMeal(menu([shared, main('main', 10)]), preferences(5, 55), seededRandom(4))!;
    assert.equal(mixed.subtotalCents, 4300);
    assert.equal(quantity(mixed), 5);
    assert.equal(buildMeal(menu([{ ...shared, serves: undefined }]), preferences(5, 100)), null);
    const combos = menu([{ ...main('combo', 8), role: 'combo' }, { id: 'side', name: 'Side', price: 2, role: 'side' }, { id: 'drink', name: 'Drink', price: 2, role: 'drink' }]);
    assert(mealCandidates(combos, preferences(5), seededRandom(6)).every(m => m.lines.every(l => l.item.role === 'combo')));
});

test('party rerolls change anchor composition when available and keep exact-cent budgets over repeated rolls', () => {
    const source = menu(Array.from({ length: 12 }, (_, i) => main(`pick-${i}`, 6.25 + i * 0.1)));
    const random = seededRandom(19), prefs = preferences(5, 65);
    let prior = buildMeal(source, prefs, random)!;
    for (let roll = 0; roll < 12; roll++) {
        const next = buildMeal(source, prefs, random, prior.signature)!;
        assert.notEqual(next.signature, prior.signature);
        assert(next.lines.length >= 3);
        const overlap = next.lines.reduce((sum, l) => sum + Math.min(l.quantity, prior.lines.find(old => old.item.id === l.item.id)?.quantity ?? 0), 0);
        assert(overlap < 4, 'A useful composition change, not just an extra or one diner');
        assert.equal(quantity(next), 5);
        assert.equal(next.subtotalCents, next.lines.reduce((sum, l) => sum + Math.round(l.item.price * 100) * l.quantity, 0));
        assert(next.subtotalCents <= next.foodBudgetCents);
        assert(next.totalCents <= 6500);
        prior = next;
    }
    assert.equal(PARTY_SIMULATIONS, 100);
    const tiny = menu([main('main', 8), { id: 'side', name: 'Side', role: 'side', price: 2 }]);
    const first = buildMeal(tiny, preferences(1, 20), () => 0.9999)!;
    assert.notEqual(buildMeal(tiny, preferences(1, 20), () => 0.9999, first.signature)!.signature, first.signature);
});
