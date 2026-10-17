import test from 'node:test';
import assert from 'node:assert/strict';
import type { Restaurant } from '../src/domain/Restaurant.ts';
import type { Menu } from '../src/domain/Menu.ts';
import { assessIdentity, matchRestaurant } from '../src/menus/RestaurantMatcher.ts';
import { allMenusCityUrl } from '../src/menus/normalizeIdentity.ts';
import { AllMenusMenuResolver } from '../src/menus/AllMenusMenuResolver.ts';
import { RecommendationEngine, RecommendationFailure } from '../src/recommendation/RecommendationEngine.ts';
import { emptyLearning } from '../src/recommendation/RecommendationScorer.ts';
import { parseLocation } from '../src/location/LocationParser.ts';
import { geocode } from '../worker/src/google/geocode.ts';
import { normalize } from '../worker/src/google/normalize.ts';
import { completedMeal } from '../src/domain/DiningHistory.ts';
import { LocalDatabase } from '../src/storage/LocalDatabase.ts';
import { buildMeal } from '../src/recommendation/MealBuilder.ts';

const google: Restaurant = { id: 'google:branch', source: 'google-places', sourceId: 'branch', name: "McDonald's", cuisines: ['Fast food'],
    streetAddress: '123 West First Street', address: '123 W 1st St, Claremont, CA 91711, USA',
    locality: 'Claremont', regionCode: 'CA', postalCode: '91711', countryCode: 'US', latitude: 34.1, longitude: -117.72, distanceMeters: 400 };
const candidate: Restaurant = { id: 'allmenus:123', source: 'allmenus', sourceId: '123', name: "McDonald's", cuisines: [],
    address: '123 W. First St, Claremont, CA, 91711', menuUrl: 'https://www.allmenus.com/ca/claremont/123-mcdonalds/menu/' };
const menu = (r = candidate, price = 10): Menu => ({ schemaVersion: 1, restaurantId: r.id, restaurantName: r.name, source: 'AllMenus',
    currency: 'USD', updatedAt: new Date().toISOString(), sourceUrl: r.menuUrl, items: [{ id: 'main', name: 'Chicken Bowl', price, role: 'main' }, { id: 'main-2', name: 'Noodle Bowl', price: price + 1, role: 'main' }] });
const preferences = { location: parseLocation('91711'), budget: 40, people: 2, bufferPercent: 0.2, adventure: 'balanced' as const, diningMode: 'unknown' as const, maxDistanceMeters: 8047 };

test('matching requires exact normalized name and physical address, rejecting branch and geographic conflicts', () => {
    assert.equal(matchRestaurant(google, [candidate]).status, 'matched');
    assert.equal(matchRestaurant(google, [{ ...candidate, name: 'McDonalds' }]).status, 'matched');
    for (const patch of [
        { address: '875 W First St, Claremont, CA 91711' },
        { address: '123 W First St, Pomona, CA 91711' },
        { address: '123 W First St, Claremont, NV 91711' },
        { address: '123 W First St, Claremont, CA 91765' },
        { latitude: 34.2, longitude: -117.72 },
        { address: '' },
    ]) assert.equal(matchRestaurant(google, [{ ...candidate, ...patch }]).status, 'not-found', JSON.stringify(patch));
    assert.equal(matchRestaurant(google, [candidate, { ...candidate, id: 'allmenus:124', sourceId: '124' }]).status, 'ambiguous');
    assert.equal(assessIdentity(google, { ...candidate, latitude: 34.1001, longitude: -117.72 }).rejected, false);
    assert.equal(allMenusCityUrl(google), 'https://www.allmenus.com/ca/claremont/-/');
});

test('resolver verifies the menu page itself before associating it to an immutable Google identity', async () => {
    const original = structuredClone(google);
    for (const patch of [{ address: '875 W First St, Claremont, CA 91711' }, { latitude: 35, longitude: -117.72 }, { name: 'Unrelated restaurant' }]) {
        const resolver = new AllMenusMenuResolver({ cityIndex: async () => [candidate], menuPage: async () => ({ restaurant: { ...candidate, ...patch }, menu: menu() }) });
        assert.equal((await resolver.resolveMenu(google)).status, 'not-found');
    }
    const resolver = new AllMenusMenuResolver({ cityIndex: async () => [candidate], menuPage: async () => ({ restaurant: { ...candidate, latitude: 34.1, longitude: -117.72 }, menu: menu() }) });
    const result = await resolver.resolveMenu(google);
    assert.equal(result.status, 'matched');
    if (result.status !== 'matched') return;
    assert.equal(result.menu.restaurantId, 'google:branch');
    assert.equal(result.menu.providerRestaurantId, '123');
    assert.equal(result.menu.provider, 'allmenus');
    assert.equal(result.evidence.sourceUrl, candidate.menuUrl);
    assert.deepEqual(google, original);
});

test('resolver distinguishes missing, ambiguous and unpriced menus; failures remain retryable and changed venues are rechecked', async () => {
    for (const [rows, detail, expected] of [
        [[], null, 'not-found'], [[candidate, { ...candidate, id: 'allmenus:124' }], null, 'ambiguous'],
        [[candidate], { restaurant: candidate, menu: null }, 'unpriced'],
    ] as const) {
        const resolver = new AllMenusMenuResolver({ cityIndex: async () => [...rows], menuPage: async () => detail });
        assert.equal((await resolver.resolveMenu(google)).status, expected);
    }
    let calls = 0;
    const resolver = new AllMenusMenuResolver({ cityIndex: async () => { if (++calls === 1) throw new Error('temporary failure'); return [candidate]; }, menuPage: async () => ({ restaurant: candidate, menu: menu() }) });
    await assert.rejects(resolver.resolveMenu(google));
    await Promise.all([resolver.resolveMenu(google), resolver.resolveMenu(google)]);
    assert.equal(calls, 2, 'Concurrent resolutions share one promise; errors are not cached');
    assert.equal((await resolver.resolveMenu({ ...google, streetAddress: '875 W First St' })).status, 'not-found');
});

test('hybrid recommendation skips no-menu, wrong-branch, outside-radius and unaffordable candidates and rerolls without discovery', async () => {
    const rows = ['missing', 'wrong', 'far', 'expensive', 'good', 'other-city'].map(sourceId => ({ ...google, id: `google:${sourceId}`, sourceId,
        ...(sourceId === 'far' ? { distanceMeters: 8200 } : {}), ...(sourceId === 'other-city' ? { locality: 'Pomona' } : {}) }));
    let searches = 0, resolutions = 0;
    const engine = new RecommendationEngine({ searchNearby: async () => { searches++; return rows; } }, { resolveMenu: async r => {
        resolutions++;
        if (r.sourceId === 'missing') return { status: 'not-found' };
        const source = menu(r, r.sourceId === 'expensive' ? 50 : 10);
        if (r.sourceId === 'wrong') source.restaurantId = 'allmenus:wrong';
        return { status: 'matched', menu: source, evidence: { provider: 'allmenus', providerRestaurantId: '123', sourceUrl: candidate.menuUrl!, matchedAt: source.updatedAt, confidence: 100, reasons: [] } };
    } }, () => 0);
    const first = await engine.recommend(preferences, emptyLearning());
    assert.equal(first.restaurant.sourceId, 'good');
    assert.equal(first.meal.subtotalCents, 2100);
    assert.equal(first.meal.totalCents, 2900);
    assert(first.meal.totalCents <= 4000);
    const before = resolutions;
    const anotherOrder = engine.differentOrder(first);
    assert.notEqual(anotherOrder.meal.signature, first.meal.signature);
    assert.equal(resolutions, before, 'Different order uses the already resolved menu');
    assert.equal(searches, 1);
    const next = await engine.recommend(first.preferences, emptyLearning(), first.restaurant.id);
    assert.equal(next.restaurant.locality, 'Pomona', 'City boundaries do not restrict Google candidates inside the radius');
    assert.equal(searches, 1);
    const none = new RecommendationEngine({ searchNearby: async () => rows }, { resolveMenu: async () => ({ status: 'ambiguous' }) });
    await assert.rejects(none.recommend(preferences, emptyLearning()), (e: unknown) => e instanceof RecommendationFailure && e.code === 'menus' && e.message.includes('found restaurants nearby'));
});

test('corrected region-qualified localities resolve while unqualified or geographically distinct locations require clarification', async () => {
    const result = { partial_match: true, types: ['locality', 'political'], formatted_address: 'Diamond Bar, CA, USA',
        address_components: [{ long_name: 'Diamond Bar', short_name: 'Diamond Bar', types: ['locality'] }, { long_name: 'California', short_name: 'CA', types: ['administrative_area_level_1'] }],
        geometry: { location: { lat: 34.0286, lng: -117.8103 } } };
    const request = (results: unknown[]) => (async () => Response.json({ status: 'OK', results })) as typeof fetch;
    for (const query of ['Diamond Bar, CA', 'Diamond Bar CA', 'Diamond Bar, California', 'Diamondbar, CA']) {
        const resolved = await geocode(query, 'test-key', request([result]), AbortSignal.timeout(1000));
        assert.equal(resolved.resolvedLabel, 'Diamond Bar, CA, USA');
    }
    await assert.rejects(geocode('Springfield', 'test-key', request([{ ...result, partial_match: false }]), AbortSignal.timeout(1000)), /more than one place/);
    await assert.rejects(geocode('Diamondbar, CA', 'test-key', request([result, { ...result, geometry: { location: { lat: 40, lng: -117 } } }]), AbortSignal.timeout(1000)), /more than one place/);
    await assert.rejects(geocode('123 Main St, Diamond Bar, CA', 'test-key', request([result]), AbortSignal.timeout(1000)), /more than one place/);
    const address = { ...result, types: ['street_address'], address_components: [...result.address_components,
        { types: ['street_number'], long_name: '123' }, { types: ['route'], long_name: 'Main Street' }] };
    await geocode('123 Main St, Diamond Bar, CA', 'test-key', request([address]), AbortSignal.timeout(1000));
    await assert.rejects(geocode('123 Elm St, Diamond Bar, CA', 'test-key', request([address]), AbortSignal.timeout(1000)), /more than one place/);
    for (const zip of ['91711', '91765']) {
        await geocode(zip, 'test-key', request([{ ...result, types: ['postal_code'], partial_match: false, address_components: [{ types: ['postal_code'], long_name: zip }] }]), AbortSignal.timeout(1000));
    }
});

test('Google normalization uses structured address components for locality and branch evidence', () => {
    const part = (type: string, longText: string, shortText = longText) => ({ types: [type], longText, shortText });
    const row = normalize({ id: 'structured', displayName: { text: 'Example' }, location: { latitude: 34.1, longitude: -117.72 }, formattedAddress: 'Display format is not parsed',
        addressComponents: [part('street_number', '580'), part('route', 'West First Street'), part('locality', 'Claremont'), part('administrative_area_level_1', 'California', 'CA'), part('postal_code', '91711'), part('country', 'United States', 'US')] }, new Date().toISOString());
    assert.equal(row?.streetAddress, '580 West First Street');
    assert.equal(row?.locality, 'Claremont');
    assert.equal(row?.regionCode, 'CA');
    assert.equal(row?.postalCode, '91711');
    assert.equal(row?.countryCode, 'US');
});

test('hybrid history preserves the chosen AllMenus receipt while stripping Google venue snapshots on reload', () => {
    let stored = '';
    const storage = { getItem: () => stored || null, setItem: (_key: string, value: string) => { stored = value; } };
    const db = new LocalDatabase('/hybrid/', storage);
    const source = { ...menu(google), provider: 'allmenus', providerRestaurantId: '123' };
    const meal = buildMeal(source, preferences, () => 0)!;
    db.data.history.push(completedMeal({ id: 'hybrid-receipt', restaurant: { ...google, name: 'Google-only name' }, menu: source, meal, menuStatus: 'available', preferences }));
    db.save();
    const restored = new LocalDatabase('/hybrid/', storage).data.history[0];
    assert.equal(restored.restaurantId, google.id);
    assert.equal(restored.orderProvider, 'allmenus');
    assert.equal(restored.totalCents, meal.totalCents);
    assert(restored.order[0].includes('Chicken Bowl'));
    for (const value of ['Google-only name', google.address!, 'latitude', 'longitude', 'Claremont', 'Fast food']) assert(!stored.includes(value));
});
