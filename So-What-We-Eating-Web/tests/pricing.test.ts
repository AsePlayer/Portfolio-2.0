import test from 'node:test';
import assert from 'node:assert/strict';
import { exactPrice, menuUrl } from '../src/providers/allmenus/parse.ts';
import { resolveMenuArea, DEFAULT_GEOCODER } from '../src/providers/allmenus/location.ts';
import { createRuntime } from '../src/providers/runtime.ts';
import { GooglePlacesProvider } from '../src/providers/GooglePlacesProvider.ts';
import { AllMenusMenuResolver } from '../src/menus/AllMenusMenuResolver.ts';
import { AllMenusProvider } from '../src/providers/AllMenusProvider.ts';
import { parseLocation } from '../src/location/LocationParser.ts';
import { RecommendationEngine, RecommendationFailure } from '../src/recommendation/RecommendationEngine.ts';
import { emptyLearning } from '../src/recommendation/RecommendationScorer.ts';
import { completedMeal } from '../src/domain/DiningHistory.ts';
import { LocalDatabase } from '../src/storage/LocalDatabase.ts';
import type { Restaurant } from '../src/domain/Restaurant.ts';
import type { Menu } from '../src/domain/Menu.ts';
import { inferRole } from '../tools/menus/inferRole.ts';

const preferences = { location: parseLocation('91711'), budget: 40, people: 2, bufferPercent: 0.2, adventure: 'balanced' as const, diningMode: 'unknown' as const, maxDistanceMeters: 8047 };
const restaurant = (id: string): Restaurant => ({ id: `allmenus:${id}`, name: id, source: 'allmenus', sourceId: id, cuisines: [] });
const menu = (r: Restaurant, price = 9.75): Menu => ({ schemaVersion: 1, restaurantId: r.id, restaurantName: r.name, source: 'synthetic-test', updatedAt: new Date().toISOString(), currency: 'USD', items: [{ id: 'main', name: 'Noodle Bowl', price, role: 'main' }] });

test('production keeps AllMenus/Photon; Google requires explicit opt-in and configuration', async () => {
    const runtime = await createRuntime(undefined);
    assert.equal(runtime.mode, 'live');
    assert.equal(runtime.configured, true);
    assert(runtime.restaurants instanceof AllMenusProvider);
    assert.equal(runtime.menus, runtime.restaurants);
    assert.deepEqual(runtime.catalog, []);
    await assert.rejects(createRuntime(undefined, 'http://insecure.example/'));
    const google = await createRuntime('google');
    assert.equal(google.configured, false);
    assert(google.restaurants instanceof GooglePlacesProvider);
    assert(google.menus instanceof AllMenusMenuResolver);
    assert.equal((await createRuntime('google', 'https://worker.example/discover')).configured, true);
    assert.equal((await createRuntime('google', 'http://insecure.example/')).configured, false);
});
test('prices are exact single amounts; ranges, from-prices, missing amounts, and invalid menu URLs are rejected', () => {
    for (const [text, value] of [['$12.49', 12.49], ['$1,234.56', 1234.56], ['$9', 9], ['$9.5', 9.5]] as const) assert.equal(exactPrice(text), value);
    for (const text of ['', '$0', '-$3', '$9+', 'from $9', '$9 - $12', '$1.234', 'Market price', '9.99', '$9 / $12']) assert.equal(exactPrice(text), null, text);
    assert(menuUrl('/ca/claremont/407489-eureka/menu/'));
    for (const url of ['https://evil.example/ca/claremont/1-menu/menu/', 'javascript:alert(1)', 'https://www.allmenus.com@evil.example/ca/a/1-menu/menu/']) assert.equal(menuUrl(url), null);
    assert.equal(inferRole('American Cheeseburger', 'Burgers'), 'main');
    assert.equal(inferRole('Chicken Fried Rice', 'Fried Rice'), 'main');
    assert.equal(inferRole('Tea', 'Beverages'), 'drink');
    assert.equal(inferRole('House Ranch', 'Dressings'), 'other');
    assert.equal(inferRole('Add Chicken', 'Salads'), 'other');
});
test('typed ZIP/city and current coordinates resolve live city/state menu URLs without a city table', async () => {
    const cases = [['91711', 'Claremont', 'California', 'ca/claremont'], ['10001', 'New York', 'New York', 'ny/new-york'], ['Las Vegas, NV', 'Las Vegas', 'Nevada', 'nv/las-vegas']] as const;
    for (const [query, city, state, path] of cases) {
        const result = await resolveMenuArea(parseLocation(query), DEFAULT_GEOCODER, async url => {
            assert.equal(new URL(url).searchParams.get('q'), query);
            return { features: [{ geometry: { type: 'Point', coordinates: [-117.72, 34.10] }, properties: { countrycode: 'US', city, state } }] };
        });
        assert.equal(result.cityUrls[0], `https://www.allmenus.com/${path}/-/`);
    }
    const gps = await resolveMenuArea({ label: 'Current location', source: 'browser', latitude: 34.10, longitude: -117.72 }, DEFAULT_GEOCODER, async url => {
        assert.equal(new URL(url).pathname, '/reverse');
        assert.equal(new URL(url).searchParams.has('q'), false);
        return { features: [{ geometry: { type: 'Point', coordinates: [-117.72, 34.10] }, properties: { countrycode: 'US', city: 'Claremont', state: 'California' } }] };
    });
    assert.deepEqual(gps.origin, { latitude: 34.10, longitude: -117.72 });
});
test('priced selection skips unusable, unaffordable, and out-of-radius menus and stops at a complete order', async () => {
    const rows = ['missing', 'expensive', 'outside', 'usable', 'unnecessary'].map(restaurant), calls: string[] = [];
    const engine = new RecommendationEngine({ searchNearby: async () => rows }, { getMenu: async r => {
        calls.push(r.sourceId!);
        if (r.sourceId === 'missing') return null;
        if (r.sourceId === 'outside') r.distanceMeters = 100000;
        return menu(r, r.sourceId === 'expensive' ? 100 : 9.75);
    } }, () => 0);
    const result = await engine.recommend(preferences, emptyLearning());
    assert.equal(result.restaurant.sourceId, 'usable');
    assert.deepEqual(calls, ['missing', 'expensive', 'outside', 'usable']);
    assert.equal(result.meal.lines[0].quantity, 2);
    assert.equal(result.meal.subtotalCents, 1950);
    assert.equal(result.meal.totalCents, 2750);
    assert(result.meal.totalCents <= 4000);
    const unavailable = new RecommendationEngine({ searchNearby: async () => [restaurant('none')] }, { getMenu: async () => null });
    await assert.rejects(unavailable.recommend(preferences, emptyLearning()), (error: unknown) => error instanceof RecommendationFailure && error.code === 'menus');
});
test('priced history retains the selected names, unit prices, and total after reload without saving user coordinates', () => {
    const records = new Map<string, string>();
    const storage = { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); } };
    const db = new LocalDatabase('/priced/', storage), r = restaurant('103'), source = menu(r);
    const meal = { lines: [{ item: source.items[0], quantity: 2 }], signature: 'main:2', subtotalCents: 1950, bufferCents: 800, totalCents: 2750, budgetCents: 4000, foodBudgetCents: 3200 };
    db.data.history.push(completedMeal({ id: 'quote', restaurant: r, menu: source, meal, menuStatus: 'available', preferences })); db.save();
    const restored = new LocalDatabase('/priced/', storage).data.history[0];
    assert.equal(restored.provider, 'allmenus');
    assert.equal(restored.isDemo, false);
    assert.equal(restored.totalCents, 2750);
    assert(restored.order[0].includes('$9.75 each'));
    assert.equal(restored.restaurantName, '103');
    assert(!records.get('swwe:v1:/priced/')!.includes('latitude'));
});
