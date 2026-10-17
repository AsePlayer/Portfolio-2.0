import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import type { Menu } from '../src/domain/Menu.ts';
import type { Restaurant } from '../src/domain/Restaurant.ts';
import type { SearchPreferences } from '../src/domain/SearchPreferences.ts';
import { mealCandidates, buildMeal } from '../src/recommendation/MealBuilder.ts';
import { seededRandom } from '../src/recommendation/random.ts';
import { emptyLearning, restaurantWeight } from '../src/recommendation/RecommendationScorer.ts';
import { RecommendationEngine, RecommendationFailure } from '../src/recommendation/RecommendationEngine.ts';
import { FixtureRestaurantProvider, FixtureMenuProvider } from '../src/providers/FixtureProviders.ts';
import { GooglePlacesProvider } from '../src/providers/GooglePlacesProvider.ts';
import { assertMenu } from '../src/catalog/validate.ts';
import { parseLocation, DEMO_CENTER } from '../src/location/LocationParser.ts';
import { ManualJsonImporter } from '../tools/menus/normalize.ts';
import { inferRole } from '../tools/menus/inferRole.ts';
const restaurants: Restaurant[] = JSON.parse(await readFile('content/restaurants/fixtures.json', 'utf8'));
const menus: Menu[] = await Promise.all((await readdir('content/menus/restaurants')).map(async (path) => JSON.parse(await readFile(`content/menus/restaurants/${path}`, 'utf8'))));
const menuMap = new Map(menus.map(m => [m.restaurantId, m]));
const preferences = (budget = 35, people = 1): SearchPreferences => ({ location: parseLocation('91101'), budget, people, bufferPercent: 0.2, diningMode: 'unknown', adventure: 'balanced', maxDistanceMeters: 20000 });
const engine = (seed = 1) => new RecommendationEngine(new FixtureRestaurantProvider(restaurants), new FixtureMenuProvider(menuMap), seededRandom(seed));
test('all generated meal templates respect cents, the reserved buffer, and servings for budgets $10–100 and parties 1–8', () => {
    let checked = 0;
    for (const budget of [10, 20, 35, 60, 100])
        for (let people = 1; people <= 8; people++)
            for (const menu of menus) {
                for (const meal of mealCandidates(menu, preferences(budget, people))) {
                    assert(meal.subtotalCents <= meal.foodBudgetCents);
                    assert(meal.totalCents <= budget * 100);
                    assert.equal(meal.bufferCents, budget * 20);
                    assert.equal(meal.totalCents, meal.subtotalCents + meal.bufferCents);
                    const anchors = meal.lines.filter(l => ['main', 'combo', 'shared'].includes(l.item.role));
                    assert.equal(anchors.length, 1, 'No pile of unrelated entrées');
                    assert(anchors[0].quantity * (anchors[0].item.serves ?? 1) >= people);
                    if (anchors[0].item.role === 'combo')
                        assert(!meal.lines.some(l => ['side', 'drink'].includes(l.item.role)));
                    assert(Number.isSafeInteger(meal.totalCents));
                    checked++;
                }
            }
    assert(checked > 1000);
});
test('shared dishes cover the party, and an empty or side-only budget never creates a fake meal', () => {
    const pizza = menuMap.get('slice-theory')!;
    const shared = mealCandidates(pizza, preferences(60, 4)).filter(m => m.lines[0].item.role === 'shared');
    assert(shared.length > 0);
    assert(shared.every(m => m.lines[0].quantity * (m.lines[0].item.serves ?? 1) >= 4));
    assert.equal(buildMeal(pizza, preferences(5)), null);
    const sideOnly = structuredClone(pizza);
    sideOnly.items = sideOnly.items.filter(i => i.role === 'side');
    assert.equal(buildMeal(sideOnly, preferences(35)), null);
    assert.throws(() => buildMeal(pizza, preferences(35, 0)));
    assert.throws(() => buildMeal(pizza, { ...preferences(), budget: NaN }));
});
test('different-order reroll guarantees another signature when an affordable alternative exists', () => {
    const menu = menuMap.get('citrus-taco')!, p = preferences();
    const first = buildMeal(menu, p, () => 0)!;
    const second = buildMeal(menu, p, () => 0, first.signature)!;
    assert.notEqual(first.signature, second.signature);
    const single = { ...menu, items: [menu.items[0]] };
    const only = buildMeal(single, p, () => 0)!;
    assert.equal(buildMeal(single, p, () => 0, only.signature)?.signature, only.signature);
});
test('different-restaurant avoids immediate repeat; different-order preserves restaurant, location, budget, and party', async () => {
    const e = engine(), learning = emptyLearning();
    const first = await e.recommend(preferences(), learning);
    const next = await e.recommend(first.preferences, learning, first.restaurant.id);
    assert.notEqual(first.restaurant.id, next.restaurant.id);
    const reroll = e.differentOrder(first);
    assert.equal(reroll.restaurant.id, first.restaurant.id);
    assert.deepEqual(reroll.preferences, first.preferences);
});
test('closed, excluded, avoided, far-away, and unaffordable restaurants cannot win', async () => {
    const learning = emptyLearning();
    learning.preferences.avoidedCuisines = ['Italian'];
    learning.preferences.restaurants.push({ restaurantId: 'citrus-taco', favorite: true, excluded: true });
    for (let i = 0; i < 12; i++) {
        const result = await engine(i).recommend(preferences(20), learning);
        assert(result.restaurant.isOpen !== false);
        assert.notEqual(result.restaurant.id, 'citrus-taco');
        assert(!result.restaurant.cuisines.includes('Italian'));
    }
    await assert.rejects(engine().recommend(preferences(10, 8), emptyLearning()), (e: unknown) => e instanceof RecommendationFailure && e.code === 'budget');
    await assert.rejects(engine().recommend({ ...preferences(), location: { ...DEMO_CENTER, latitude: 0, longitude: 0, label: 'Far away', source: 'manual' } }, emptyLearning()), /No spots found/);
});
test('missing, malformed, and failed menus preserve restaurant-only discovery with no invented total', async () => {
    const only = [restaurants.find(r => r.id === 'basil-street')!];
    for (const getMenu of [async () => null, async () => { throw new Error('Network failure'); }, async () => ({ broken: true }) as unknown as Promise<Menu>]) {
        const e = new RecommendationEngine(new FixtureRestaurantProvider(only), { getMenu });
        const result = await e.recommend(preferences(), emptyLearning());
        assert.equal(result.restaurant.id, 'basil-street');
        assert.equal(result.meal, null);
        assert.equal(result.menuStatus, 'unavailable');
    }
});
test('recent rejection reduces weight temporarily; favorites help but do not remove randomness', () => {
    const r = restaurants[0], p = preferences(), learning = emptyLearning(), now = Date.now();
    const base = restaurantWeight(r, true, p, learning, now);
    learning.events.push({ id: 'reject-1', restaurantId: r.id, type: 'reject', at: new Date(now).toISOString() });
    assert(restaurantWeight(r, true, p, learning, now) < base);
    assert.equal(restaurantWeight(r, true, p, learning, now + 3 * 86400000), base);
    learning.events = [];
    learning.preferences.restaurants.push({ restaurantId: r.id, favorite: true, excluded: false });
    assert(restaurantWeight(r, true, p, learning, now) > base);
});
test('catalog rejects malformed prices, identity, duplicate IDs, invalid roles, servings, and URLs', () => {
    const original = menus[0];
    for (const price of [NaN, Infinity, -1, 0, 1.001, '$12']) {
        const m = structuredClone(original);
        m.items[0].price = price as number;
        assert.throws(() => assertMenu(m));
    }
    const duplicate = structuredClone(original);
    duplicate.items.push(duplicate.items[0]);
    assert.throws(() => assertMenu(duplicate), /Duplicate/);
    for (const patch of [{ restaurantId: '' }, { restaurantName: '' }, { updatedAt: 'no date' }, { items: [] }, { sourceUrl: 'javascript:alert(1)' }])
        assert.throws(() => assertMenu({ ...original, ...patch }));
    const role = structuredClone(original);
    role.items[0].role = 'invalid' as never;
    assert.throws(() => assertMenu(role));
    const servings = structuredClone(original);
    servings.items[0].serves = 3;
    assert.throws(() => assertMenu(servings));
});
test('manual importer infers missing roles, preserves overrides, and never guesses prices', () => {
    assert.equal(inferRole('Bean rice bowl'), 'main');
    assert.equal(inferRole('Side rice'), 'side');
    assert.equal(inferRole('Green tea'), 'drink');
    const input = structuredClone(menus[0]);
    delete (input.items[0] as {
        role?: string;
    }).role;
    const result = new ManualJsonImporter().import(input);
    assert.notEqual(result.items[0].role, undefined);
    input.items[0].role = 'other';
    assert.equal(new ManualJsonImporter().import(input).items[0].role, 'other');
    input.items[0].price = '$5' as unknown as number;
    assert.throws(() => new ManualJsonImporter().import(input));
});
test('location parsing supports local ZIP/city and manual coordinates without pretending nationwide discovery', () => {
    assert.equal(parseLocation('  Pasadena, CA ').source, 'city');
    assert.equal(parseLocation('91101').source, 'zip');
    assert.equal(parseLocation('34.1478,-118.1445').source, 'manual');
    for (const input of ['', '99999', 'New York, NY', '91,181'])
        assert.throws(() => parseLocation(input));
});
test('future Google client sends only normalized coordinates to a proxy and validates its response', async () => {
    let body = '';
    const request = (async (_url: unknown, init: RequestInit) => { body = String(init.body); return new Response(JSON.stringify({ schemaVersion: 1, restaurants })); }) as typeof fetch;
    const provider = new GooglePlacesProvider('https://proxy.example/nearby', request);
    assert.equal((await provider.searchNearby({ location: parseLocation('91101'), maxDistanceMeters: 20000 })).length, 8);
    assert.deepEqual(JSON.parse(body), { schemaVersion: 1, location: DEMO_CENTER, radiusMeters: 20000 });
    assert(!body.includes('key'));
    assert.throws(() => new GooglePlacesProvider('http://insecure.example/nearby'));
    const bad = new GooglePlacesProvider('https://proxy.example/nearby', (async () => new Response('{"schemaVersion":1,"restaurants":[{}]}')) as typeof fetch);
    await assert.rejects(bad.searchNearby({ location: parseLocation('91101'), maxDistanceMeters: 20000 }));
});
