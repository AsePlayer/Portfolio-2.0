import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenStreetMapProvider } from '../src/providers/OpenStreetMapProvider.ts';
import { osmOpenNow } from '../src/providers/osmHours.ts';
import { createRuntime } from '../src/providers/runtime.ts';
import { parseLocation } from '../src/location/LocationParser.ts';
import { assertRestaurants } from '../src/catalog/validate.ts';
import { RecommendationEngine } from '../src/recommendation/RecommendationEngine.ts';
import { emptyLearning } from '../src/recommendation/RecommendationScorer.ts';
import { completedMeal } from '../src/domain/DiningHistory.ts';
import { LocalDatabase } from '../src/storage/LocalDatabase.ts';

const point = { latitude: 34.0967, longitude: -117.7198 };
const late = new Date('2026-10-17T06:30:00Z'); // Friday 11:30 PM at the restaurant, independent of the device zone.
const spot = (id: number, tags: Record<string, string> = {}, patch = {}) => ({
    type: 'node', id, lat: point.latitude, lon: point.longitude,
    tags: { amenity: 'restaurant', name: `Real-data shape ${id}`, cuisine: 'thai;noodle', opening_hours: 'Mo-Su 18:00-02:00', ...tags }, ...patch,
});

test('normal runtime is a configured free provider even with a leftover Google URL', async () => {
    for (const endpoint of ['', 'https://old-worker.example/discover']) {
        const runtime = await createRuntime(undefined, endpoint);
        assert.equal(runtime.mode, 'live');
        assert.equal(runtime.configured, true);
        assert(runtime.restaurants instanceof OpenStreetMapProvider);
        assert.deepEqual(runtime.catalog, []);
    }
});
test('listed hours use the restaurant time zone, handle overnight/split/closed schedules, and leave complex rules unknown', () => {
    const state = (hours: string | undefined, now = late) => osmOpenNow(hours, point.latitude, point.longitude, now);
    assert.equal(state('24/7'), true);
    assert.equal(state('Mo-Su 18:00-02:00'), true);
    assert.equal(state('Mo-Su 18:00-02:00', new Date('2026-10-17T08:30:00Z')), true);
    assert.equal(state('Mo-Su 18:00-02:00', new Date('2026-10-17T10:00:00Z')), false);
    assert.equal(state('Mo-Fr 08:00-12:00,18:00-24:00; Sa-Su off'), true);
    assert.equal(state('Mo-Su 18:00-02:00; Fr off'), false);
    for (const value of [undefined, '', 'Mo-Su 18:00-02:00; PH off', 'sunrise-sunset', 'Mo-Fr 99:00-24:00', 'open "call first"', 'Jan-Mar 12:00-20:00']) assert.equal(state(value), undefined);
    // New York is already Saturday 2:30 AM at the same instant.
    assert.equal(osmOpenNow('Fr 23:00-24:00', 40.75, -73.99, late), false);
});
test('free discovery geocodes only on submit, normalizes/deduplicates, respects radius/hours, and reuses the pool on reroll', async () => {
    const calls: { url: string; body: string }[] = [];
    const request = (async (input: any, init: RequestInit = {}) => {
        calls.push({ url: String(input), body: String(init.body ?? '') });
        if (String(input).includes('photon')) return Response.json({ features: [{ geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] } }] });
        return Response.json({ elements: [spot(1, { website: 'https://example.org/', 'website:menu': 'javascript:alert(1)' }), spot(1), spot(2), spot(3, { opening_hours: 'Mo-Su 08:00-18:00' }), spot(4, { opening_hours: 'PH 10:00-22:00' }), spot(5, {}, { lat: point.latitude + 1 }), spot(6, {}, { type: 'way', lat: undefined, lon: undefined, center: { lat: point.latitude, lon: point.longitude } })] });
    }) as typeof fetch;
    const provider = new OpenStreetMapProvider(undefined, undefined, request, () => late);
    const query = { location: parseLocation('91711'), maxDistanceMeters: 8047, openNow: true };
    const found = await provider.searchNearby(query);
    assertRestaurants(found);
    assert.deepEqual(found.map(r => r.id), ['osm:node/1', 'osm:node/2', 'osm:way/6']);
    assert.equal(found[0].menuUrl, undefined);
    assert.equal(found[0].rating, undefined);
    assert(found.every(r => r.source === 'openstreetmap' && r.distanceMeters! <= 8047));
    assert.equal(new URL(calls[0].url).searchParams.get('countrycode'), 'US');
    assert(new URLSearchParams(calls[1].body).get('data')?.includes('around:8047'));
    const preferences = { ...query, budget: 35, people: 1, bufferPercent: 0.2, diningMode: 'unknown' as const, adventure: 'balanced' as const };
    const engine = new RecommendationEngine(provider, { getMenu: async () => null }, () => 0);
    const first = await engine.recommend(preferences, emptyLearning());
    const second = await engine.recommend(preferences, emptyLearning(), first.restaurant.id);
    assert.notEqual(first.restaurant.id, second.restaurant.id);
    assert.equal(first.meal, null);
    assert.equal(calls.length, 2);
    const unknownAllowed = await provider.searchNearby({ ...query, openNow: false });
    assert(unknownAllowed.some(r => r.id === 'osm:node/4' && r.isOpen === undefined));
    assert(!unknownAllowed.some(r => r.id === 'osm:node/3'));
    assert.equal(calls.length, 2);
});
test('free service failure/ambiguity/quota paths stay honest, and rate limits do not retry', async () => {
    const query = { location: parseLocation('34.0967,-117.7198'), maxDistanceMeters: 8047, openNow: true };
    for (const response of [Response.json({}), Response.json({ elements: [], remark: 'runtime error' }), new Response('Unavailable', { status: 503 })]) {
        const provider = new OpenStreetMapProvider(undefined, undefined, (async () => response) as typeof fetch);
        await assert.rejects(provider.searchNearby(query), /unavailable/);
    }
    let count = 0;
    const limited = new OpenStreetMapProvider(undefined, undefined, (async () => { count++; return new Response('', { status: 429 }); }) as typeof fetch);
    await assert.rejects(limited.searchNearby(query), /busy/);
    await assert.rejects(limited.searchNearby(query), /busy/);
    assert.equal(count, 1);
    const missing = new OpenStreetMapProvider(undefined, undefined, (async () => Response.json({ features: [] })) as typeof fetch);
    await assert.rejects(missing.searchNearby({ ...query, location: parseLocation('not a real place') }), /couldn’t find/);
    const ambiguous = new OpenStreetMapProvider(undefined, undefined, (async () => Response.json({ features: [point, { latitude: 40, longitude: -73 }].map(p => ({ geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] } })) })) as typeof fetch);
    await assert.rejects(ambiguous.searchNearby({ ...query, location: parseLocation('Springfield') }), /more than one/);
});
test('an Overpass outage can use real Photon venues with unknown hours, never bypasses open-now, and caches rerolls', async () => {
    let calls = 0;
    const provider = new OpenStreetMapProvider(undefined, undefined, (async (input: any) => {
        calls++;
        if (String(input).includes('overpass')) return new Response('', { status: 503 });
        return Response.json({ features: [1, 2].map(id => ({ geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] }, properties: { osm_type: 'N', osm_id: id, osm_key: 'amenity', osm_value: 'restaurant', name: `Real fallback ${id}` } })) });
    }) as typeof fetch);
    const query = { location: parseLocation('34.0967,-117.7198'), maxDistanceMeters: 8047, openNow: true };
    assert.deepEqual(await provider.searchNearby(query), []);
    const found = await provider.searchNearby({ ...query, openNow: false });
    assert.equal(found.length, 2);
    assert(found.every(r => !r.isDemo && r.isOpen === undefined && r.source === 'openstreetmap'));
    assert.equal(calls, 2);
});
test('OpenStreetMap history survives reload as source IDs without location or fictional labels', () => {
    const records = new Map<string, string>();
    const adapter = { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); } };
    const db = new LocalDatabase('/free/', adapter);
    const meal = completedMeal({ id: 'meal', restaurant: { id: 'osm:node/123', sourceId: 'node/123', source: 'openstreetmap', name: 'Never persist', cuisines: [], ...point }, menu: null, meal: null, menuStatus: 'unavailable', preferences: { location: parseLocation('91711'), budget: 35, people: 1, bufferPercent: 0.2, diningMode: 'unknown', adventure: 'balanced', maxDistanceMeters: 8047, openNow: true } });
    db.data.history.push(meal); db.save();
    const restored = new LocalDatabase('/free/', adapter).data.history[0];
    assert.equal(restored.provider, 'openstreetmap');
    assert.equal(restored.isDemo, undefined);
    assert.equal(restored.sourceId, 'node/123');
    for (const secret of ['Never persist', '91711', 'latitude', String(point.latitude)]) assert(!records.get('swwe:v1:/free/')!.includes(secret));
});
