import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../worker/src/index.ts';
import type { Env } from '../worker/src/index.ts';
import { boundingBox, distanceMeters } from '../src/location/geo.ts';
import { RADII, milesToMeters, nextRadius, PROVIDER_MAX_RADIUS_METERS } from '../src/domain/Radius.ts';
import { GooglePlacesProvider } from '../src/providers/GooglePlacesProvider.ts';
import { RecommendationEngine } from '../src/recommendation/RecommendationEngine.ts';
import { emptyLearning } from '../src/recommendation/RecommendationScorer.ts';
import { LocalDatabase } from '../src/storage/LocalDatabase.ts';
import { HistoryStore } from '../src/storage/HistoryStore.ts';
import { parseLocation } from '../src/location/LocationParser.ts';
import { createRuntime } from '../src/providers/runtime.ts';
const point = { latitude: 34.0967, longitude: -117.7198 };
const allowed = 'https://ryanscott.org';
const env: Env = { GOOGLE_MAPS_API_KEY: 'server-only-test-key', ALLOWED_ORIGINS: allowed, IP_LIMITER: { limit: async () => ({ success: true }) }, EDGE_LIMITER: { limit: async () => ({ success: true }) } };
const place = (id: string, patch: Record<string, unknown> = {}) => ({ id, displayName: { text: `Test ${id}` }, formattedAddress: '1 Example Road', location: point, types: ['restaurant', 'thai_restaurant'], businessStatus: 'OPERATIONAL', currentOpeningHours: { openNow: true }, priceLevel: 'PRICE_LEVEL_MODERATE', rating: 4.5, userRatingCount: 22, websiteUri: 'https://restaurant.example/menu', attributions: [{ provider: 'Example credit', providerUri: 'https://credit.example/' }], ...patch });
const discover = (body: unknown, origin = allowed) => new Request('https://worker.example/discover', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
const query = { schemaVersion: 2, location: point, radiusMeters: 8047, openNow: true };
test('legacy Google configuration errors remain explicit and do not turn into fictional data', async () => {
    const provider = new GooglePlacesProvider();
    await assert.rejects(provider.searchNearby({ location: parseLocation('Claremont, CA'), maxDistanceMeters: 8047 }), /isn’t connected/);
    assert.throws(() => new GooglePlacesProvider('not-a-url'));
});
test('browser adapter independently deduplicates normalized records and rejects a false distance outside the circle', async () => {
    const near = { id: 'google:near', sourceId: 'near', source: 'google-places', name: 'Near', cuisines: ['Thai'], ...point, isOpen: true, distanceMeters: 0 };
    const far = { ...near, id: 'google:far', sourceId: 'far', latitude: point.latitude + 0.1, distanceMeters: 0 };
    const provider = new GooglePlacesProvider('https://worker.example/discover', (async () => Response.json({ schemaVersion: 2, origin: point, searchedAt: new Date().toISOString(), restaurants: [near, near, far] })) as typeof fetch);
    const found = await provider.searchNearby({ location: parseLocation(`${point.latitude},${point.longitude}`), maxDistanceMeters: 3219, openNow: true });
    assert.deepEqual(found.map(r => r.id), ['google:near']);
});
test('supported radius conversions, expansion, poles, and antimeridian bounds preserve the circle', () => {
    assert.deepEqual(RADII.map(milesToMeters), [3219, 8047, 16093, 32187, 48280]);
    assert.equal(nextRadius(3219), 8047);
    assert.equal(nextRadius(8047), 16093);
    assert.equal(nextRadius(16093), 32187);
    assert.equal(nextRadius(32187), 48280);
    assert.equal(nextRadius(48280), null);
    assert(milesToMeters(30) < PROVIDER_MAX_RADIUS_METERS);
    const across = boundingBox({ latitude: 0, longitude: 179.99 }, 8047);
    assert(across.low.longitude > across.high.longitude);
    const polar = boundingBox({ latitude: 89.99, longitude: 0 }, 48280);
    assert.equal(polar.low.longitude, -180);
    assert.equal(polar.high.longitude, 180);
    assert(distanceMeters(point, { ...point, latitude: point.latitude + 0.1 }) > 8047);
});
test('Worker geocodes arbitrary input server-side, pages a bounded pool, deduplicates, and filters closed/unknown/outside/non-operational places', async () => {
    const bodies: any[] = [];
    const upstream = (async (url: unknown, init: RequestInit) => {
        if (String(url).includes('/geocode/')) {
            assert(String(url).includes('Claremont'));
            assert(String(url).includes(env.GOOGLE_MAPS_API_KEY));
            return Response.json({ status: 'OK', results: [{ geometry: { location: { lat: point.latitude, lng: point.longitude } } }] });
        }
        const body = JSON.parse(String(init.body));
        bodies.push(body);
        assert.equal(new Headers(init.headers).get('X-Goog-Api-Key'), env.GOOGLE_MAPS_API_KEY);
        if (!body.pageToken)
            return Response.json({ places: [place('open'), place('closed', { currentOpeningHours: { openNow: false } }), place('unknown', { currentOpeningHours: {} }), place('far', { location: { ...point, latitude: point.latitude + 0.2 } }), place('shutdown', { businessStatus: 'CLOSED_PERMANENTLY' })], nextPageToken: 'page-2' });
        return Response.json({ places: [place('open'), place('other')], nextPageToken: 'ignored-third-page' });
    }) as typeof fetch;
    const response = await handleRequest(discover({ schemaVersion: 2, locationQuery: 'Claremont, CA', radiusMeters: 8047, openNow: true }), env, upstream);
    assert.equal(response.status, 200);
    assert(response.headers.get('cache-control')?.includes('no-store'));
    const value = await response.json();
    assert.deepEqual(value.restaurants.map((r: any) => r.id), ['google:open', 'google:other']);
    assert.equal(bodies.length, 2);
    assert(bodies.every(b => b.openNow && b.strictTypeFiltering && b.includedType === 'restaurant' && b.locationRestriction.rectangle));
    assert(value.restaurants.every((r: any) => r.distanceMeters <= 8047));
    assert(value.restaurants[0].directionsUrl.includes('destination_place_id=open'));
    assert.deepEqual(value.restaurants[0].attributions, [{ name: 'Example credit', uri: 'https://credit.example/' }]);
    assert(!JSON.stringify(value).includes(env.GOOGLE_MAPS_API_KEY));
});
test('legacy Worker opening-status contract remains opt-in; the current app sends false', async () => {
    const upstream = (async () => Response.json({ places: [place('late-night', { currentOpeningHours: { openNow: true } }), place('closed', { rating: 5, currentOpeningHours: { openNow: false } }), place('unknown', { currentOpeningHours: {} })] })) as typeof fetch;
    for (const openNow of [true, false]) {
        const response = await handleRequest(discover({ ...query, openNow }), env, upstream);
        const result = await response.json();
        assert.deepEqual(result.restaurants.map((r: any) => r.sourceId), openNow ? ['late-night'] : ['late-night', 'closed', 'unknown']);
    }
    // Google currentOpeningHours/openNow is search-time data; no device-time-zone inference.
    assert.equal(new Date('2026-10-17T06:30:00Z').toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' }), '11:30 PM');
});
test('nonsense/ambiguous locations, quotas, timeouts, and provider failures expose only clean error codes', async () => {
    const typed = { schemaVersion: 2, locationQuery: 'nonsense', radiusMeters: 8047, openNow: true };
    for (const [data, code] of [
        [{ status: 'ZERO_RESULTS', results: [] }, 'location'],
        [{ status: 'OK', results: [{ partial_match: true, geometry: { location: { lat: 1, lng: 1 } } }] }, 'ambiguous'],
        [{ status: 'OVER_QUERY_LIMIT', error_message: 'SECRET sensitive upstream info' }, 'quota'],
        [{ status: 'REQUEST_DENIED' }, 'configuration'],
    ] as const) {
        const response = await handleRequest(discover(typed), env, (async () => Response.json(data)) as typeof fetch);
        assert.equal((await response.json()).error.code, code);
    }
    const response = await handleRequest(discover(query), env, (async () => { throw new DOMException('sensitive upstream detail', 'TimeoutError'); }) as typeof fetch);
    assert.equal((await response.json()).error.code, 'timeout');
});
test('CORS, request size, radius/version validation, missing secret, and rate limiting prevent upstream calls', async () => {
    const never = (async () => { throw new Error('Upstream should not be called'); }) as typeof fetch;
    for (const body of [{ ...query, radiusMeters: 50001 }, { ...query, schemaVersion: 1 }, { ...query, locationQuery: 'both' }, { ...query, location: { latitude: 91, longitude: 0 } }, { ...query, unrecognized: 'x' }, { ...query, locationQuery: 'a'.repeat(3000) }]) {
        assert.equal((await handleRequest(discover(body), env, never)).status, 400);
    }
    assert.equal((await handleRequest(discover(query, 'https://other.example'), env, never)).status, 403);
    assert.equal((await handleRequest(discover(query), { ...env, GOOGLE_MAPS_API_KEY: '' }, never)).status, 503);
    assert.equal((await handleRequest(discover(query), { ...env, IP_LIMITER: { limit: async () => ({ success: false }) } }, never)).status, 429);
});
test('client recomputes circular distance and keeps reroll inputs while the engine requires priced menus', async () => {
    const live = [place('one'), place('two'), place('far', { location: { ...point, latitude: point.latitude + 0.2 } })];
    const bodies: any[] = [];
    const client = new GooglePlacesProvider('https://worker.example/discover', (async (_url: unknown, init: RequestInit) => {
        const body = JSON.parse(String(init.body));
        bodies.push(body);
        return handleRequest(discover(body), env, (async () => Response.json({ places: live })) as typeof fetch);
    }) as typeof fetch);
    const engine = new RecommendationEngine(client, { getMenu: async restaurant => ({ schemaVersion: 1, restaurantId: restaurant.id, restaurantName: restaurant.name, source: 'synthetic-test', updatedAt: new Date().toISOString(), currency: 'USD', items: [{ id: 'main', name: 'Test entree', price: 12.25, role: 'main' }] }) }, () => 0);
    const preferences = { location: parseLocation(`${point.latitude},${point.longitude}`), budget: 35, people: 1, bufferPercent: 0.2, diningMode: 'unknown' as const, adventure: 'balanced' as const, maxDistanceMeters: 3219, openNow: true };
    const first = await engine.recommend(preferences, emptyLearning());
    assert.equal(first.meal.subtotalCents, 1225);
    assert.equal(first.restaurant.id, 'google:one');
    const next = await engine.recommend(first.preferences, emptyLearning(), first.restaurant.id);
    assert.equal(next.restaurant.id, 'google:two');
    assert.deepEqual(bodies[0], bodies[1]);
});
test('Google completed history and v1 migration never retain place snapshots or typed coordinates', () => {
    const records = new Map<string, string>();
    const adapter = { getItem: (k: string) => records.get(k) ?? null, setItem: (k: string, v: string) => { records.set(k, v); } };
    const db = new LocalDatabase('/privacy/', adapter), history = new HistoryStore(db);
    const restaurant = { id: 'google:place-id', sourceId: 'place-id', source: 'google-places', name: 'Must never persist this name', address: 'Private address field', cuisines: ['Thai'], rating: 4.5, latitude: 34.123456, longitude: -118.123456 };
    history.accept({ id: 'accepted-live', restaurant, menu: null, meal: null, menuStatus: 'unavailable', preferences: { location: parseLocation('34.123456,-118.123456'), budget: 35, people: 1, bufferPercent: 0.2, diningMode: 'unknown', adventure: 'balanced', maxDistanceMeters: 8047, openNow: true } });
    const serialized = records.get('swwe:v1:/privacy/')!;
    assert(serialized.includes('place-id'));
    for (const secret of [restaurant.name, restaurant.address, '34.123456', '-118.123456', 'rating', 'latitude', 'longitude'])
        assert(!serialized.includes(secret));
    const legacy = { ...db.data, version: 1, history: [{ ...db.data.history[0], restaurantName: restaurant.name, address: restaurant.address, cuisines: ['Thai'] }], settings: { ...db.data.settings, locationLabel: '34.123456,-118.123456' } };
    adapter.setItem('swwe:v1:/privacy/', JSON.stringify(legacy));
    const upgraded = new LocalDatabase('/privacy/', adapter);
    assert.equal(upgraded.data.version, 2);
    assert(!JSON.stringify(upgraded.data).includes(restaurant.name));
    assert(!JSON.stringify(upgraded.data).includes('34.123456'));
});
