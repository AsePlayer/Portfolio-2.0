import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenStreetMapProvider } from '../src/providers/OpenStreetMapProvider.ts';
import { createRuntime } from '../src/providers/runtime.ts';
import { parseLocation } from '../src/location/LocationParser.ts';
import { assertRestaurants } from '../src/catalog/validate.ts';
import { RecommendationEngine } from '../src/recommendation/RecommendationEngine.ts';
import { emptyLearning } from '../src/recommendation/RecommendationScorer.ts';
import { completedMeal } from '../src/domain/DiningHistory.ts';
import { LocalDatabase } from '../src/storage/LocalDatabase.ts';

const point = { latitude: 34.0967, longitude: -117.7198 };
const spot = (id: number, tags: Record<string, string> = {}, patch = {}) => ({
    type: 'node', id, lat: point.latitude, lon: point.longitude,
    tags: { amenity: 'restaurant', name: `Real-data shape ${id}`, cuisine: 'thai;noodle', opening_hours: 'Mo-Su 18:00-02:00', ...tags }, ...patch,
});

test('legacy open-data adapter remains independent from the priced-meal runtime', () => {
    assert(new OpenStreetMapProvider());
    assert.throws(() => new OpenStreetMapProvider('http://insecure.example/'));
});
test('free discovery geocodes only on submit, normalizes/deduplicates, ignores unreliable hours, respects radius, and reuses the pool on reroll', async () => {
    const calls: { url: string; body: string }[] = [];
    const request = (async (input: any, init: RequestInit = {}) => {
        calls.push({ url: String(input), body: String(init.body ?? '') });
        if (String(input).includes('photon')) return Response.json({ features: [{ geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] } }] });
        return Response.json({ elements: [spot(1, { website: 'https://example.org/', 'website:menu': 'javascript:alert(1)' }), spot(1), spot(2), spot(3, { opening_hours: 'Mo-Su 08:00-18:00' }), spot(4, { opening_hours: 'PH 10:00-22:00' }), spot(5, {}, { lat: point.latitude + 1 }), spot(6, {}, { type: 'way', lat: undefined, lon: undefined, center: { lat: point.latitude, lon: point.longitude } })] });
    }) as typeof fetch;
    const provider = new OpenStreetMapProvider(undefined, undefined, request);
    const query = { location: parseLocation('91711'), maxDistanceMeters: 8047 };
    const found = await provider.searchNearby(query);
    assertRestaurants(found);
    assert.deepEqual(found.map(r => r.id), ['osm:node/1', 'osm:node/2', 'osm:node/3', 'osm:node/4', 'osm:way/6']);
    assert.equal(found[0].menuUrl, undefined);
    assert.equal(found[0].rating, undefined);
    assert(found.every(r => r.source === 'openstreetmap' && r.distanceMeters! <= 8047));
    assert.equal(new URL(calls[0].url).searchParams.get('countrycode'), 'US');
    assert(new URLSearchParams(calls[1].body).get('data')?.includes('around:8047'));
    await provider.searchNearby(query);
    assert.equal(calls.length, 2);
    assert(found.every(r => r.isOpen === undefined));
    await provider.searchNearby(query);
    assert.equal(calls.length, 2);
});
test('free service failure/ambiguity/quota paths stay honest, and rate limits do not retry', async () => {
    const query = { location: parseLocation('34.0967,-117.7198'), maxDistanceMeters: 8047 };
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
test('an Overpass outage uses real Photon venues immediately without hours data and caches rerolls', async () => {
    let calls = 0;
    const provider = new OpenStreetMapProvider(undefined, undefined, (async (input: any) => {
        calls++;
        if (String(input).includes('overpass')) return new Response('', { status: 503 });
        return Response.json({ features: [1, 2].map(id => ({ geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] }, properties: { osm_type: 'N', osm_id: id, osm_key: 'amenity', osm_value: 'restaurant', name: `Real fallback ${id}` } })) });
    }) as typeof fetch);
    const query = { location: parseLocation('34.0967,-117.7198'), maxDistanceMeters: 8047 };
    const found = await provider.searchNearby(query);
    await provider.searchNearby(query);
    assert.equal(found.length, 2);
    assert(found.every(r => !r.isDemo && r.isOpen === undefined && r.source === 'openstreetmap'));
    assert.equal(calls, 2);
});
test('OpenStreetMap history survives reload as source IDs without location or fictional labels', () => {
    const records = new Map<string, string>();
    const adapter = { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); } };
    const db = new LocalDatabase('/free/', adapter);
    const meal = completedMeal({ id: 'meal', restaurant: { id: 'osm:node/123', sourceId: 'node/123', source: 'openstreetmap', name: 'Never persist', cuisines: [], ...point }, menu: null, meal: null, menuStatus: 'unavailable', preferences: { location: parseLocation('91711'), budget: 35, people: 1, bufferPercent: 0.2, diningMode: 'unknown', adventure: 'balanced', maxDistanceMeters: 8047 } });
    db.data.history.push(meal); db.save();
    const restored = new LocalDatabase('/free/', adapter).data.history[0];
    assert.equal(restored.provider, 'openstreetmap');
    assert.equal(restored.isDemo, undefined);
    assert.equal(restored.sourceId, 'node/123');
    for (const secret of ['Never persist', '91711', 'latitude', String(point.latitude)]) assert(!records.get('swwe:v1:/free/')!.includes(secret));
});
