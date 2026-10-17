import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { handleRequest } from '../worker/src/index.ts';
import { buildWorker } from './build-sw.mjs';
const artifacts = resolve('artifacts'), root = resolve(artifacts, 'browser-build');
await mkdir(artifacts, { recursive: true });
// A separate artifact uses a reserved test endpoint; production dist/config stays intact.
const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', root], { env: { ...process.env, VITE_RESTAURANT_PROVIDER: 'google-places', VITE_DISCOVERY_MODE: 'live', VITE_RESTAURANT_PROXY_URL: 'https://discovery.invalid/discover' }, encoding: 'utf8' });
if (build.status !== 0)
    throw new Error(build.stdout + build.stderr);
await buildWorker(root);
const bases = ['/So-What-We-Eating-Web/', '/projects/what-we-eating/'];
let updatedWorker = false, scenario = 'normal', offline = false;
const requests = [], point = { latitude: 34.0967, longitude: -117.7198 };
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (req, res) => {
    try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname), base = bases.find(b => pathname.startsWith(b));
        if (!base) {
            res.setHeader('content-type', 'text/html');
            res.end('<!doctype html><title>Outside app</title><p>Portfolio host</p>');
            return;
        }
        const local = pathname.slice(base.length) || 'index.html', target = resolve(root, local);
        if (!target.startsWith(root + sep)) {
            res.writeHead(403).end();
            return;
        }
        let bytes = await readFile(target);
        if (local === 'sw.js' && updatedWorker)
            bytes = Buffer.from(bytes.toString().replace(/const VERSION='[^']+'/, "const VERSION='browser-update-check'"));
        res.setHeader('content-type', types[extname(target)] ?? 'application/octet-stream');
        res.setHeader('cache-control', 'no-cache');
        res.end(bytes);
    }
    catch {
        res.writeHead(404).end();
    }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`, url = origin + bases[0];
function samplePlace(id = 'owl', patch = {}) {
    return { id, displayName: { text: id === 'owl' ? 'Night Owl Diner' : 'Sunrise Bowl' }, formattedAddress: '1 Mock Restaurant Road', location: point, types: ['restaurant', 'american_restaurant'], businessStatus: 'OPERATIONAL', currentOpeningHours: { openNow: true }, priceLevel: 'PRICE_LEVEL_MODERATE', rating: 4.6, userRatingCount: 30, websiteUri: 'https://restaurant.example/menu', attributions: [{ provider: 'Test data credit', providerUri: 'https://credit.example/' }], ...patch };
}
const upstream = async (input, init) => {
    if (String(input).includes('/geocode/')) {
        const text = new URL(String(input)).searchParams.get('address');
        if (text === 'nonsense')
            return Response.json({ status: 'ZERO_RESULTS', results: [] });
        if (text === 'ambiguous')
            return Response.json({ status: 'OK', results: [{ partial_match: true, geometry: { location: { lat: point.latitude, lng: point.longitude } } }] });
        return Response.json({ status: 'OK', results: [{ geometry: { location: { lat: point.latitude, lng: point.longitude } } }] });
    }
    if (String(input).includes('/v1/places/') && !String(input).includes(':searchText'))
        return Response.json(samplePlace(String(input).split('/').at(-1)));
    if (scenario === 'empty')
        return Response.json({ places: [] });
    if (scenario === 'unknown')
        return Response.json({ places: [samplePlace('unknown', { currentOpeningHours: {} })] });
    return Response.json({ places: [samplePlace(), samplePlace('bowl'), samplePlace('closed', { currentOpeningHours: { openNow: false }, rating: 5 }), samplePlace('far', { location: { ...point, latitude: point.latitude + 0.5 } })] });
};
const env = { GOOGLE_MAPS_API_KEY: 'server-only-fake-key', ALLOWED_ORIGINS: origin, IP_LIMITER: { limit: async () => ({ success: true }) }, EDGE_LIMITER: { limit: async () => ({ success: true }) } };
async function routeWorker(context) {
    await context.route('https://discovery.invalid/discover', async (route) => {
        if (offline)
            return route.abort('internetdisconnected');
        const body = route.request().postDataJSON();
        requests.push(body);
        const response = scenario === 'failure' ? Response.json({ schemaVersion: 2, error: { code: 'unavailable' } }, { status: 503 }) : await handleRequest(new Request('https://worker.invalid/discover', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }), env, upstream);
        await route.fulfill({ status: response.status, contentType: 'application/json', headers: { 'access-control-allow-origin': origin }, body: await response.text() });
    });
    await context.route('https://www.google.com/**', r => r.fulfill({ contentType: 'text/html', body: '<title>Directions handoff</title>' }));
    await context.route('https://restaurant.example/**', r => r.fulfill({ contentType: 'text/html', body: '<title>Restaurant website</title>' }));
}
const snapshot = page => page.evaluate(() => JSON.parse(localStorage.getItem(`swwe:v1:${location.pathname}`)));
const waitFor = async (fn) => { const start = Date.now(); while (!await fn()) {
    if (Date.now() - start > 15000)
        throw new Error('Browser acceptance wait timed out');
    await new Promise(r => setTimeout(r, 100));
} };
const report = { liveWorkerPath: false, currentLocation: false, typedLocations: [], mobileWidths: [], radius: false, hoursFeatureRemoved: false, expansion: false, noSilentFallback: false, historyPrivacy: false, directions: false, reroll: false, offlineShell: false, workerUpdate: false, scope: false, portfolioPath: false, deniedLocation: false, temporaryStorage: false, explicitDemo: false, errors: [] };
let browser;
try {
    const chrome = process.env.CHROME_PATH ?? (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
    browser = await chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, geolocation: point, permissions: ['geolocation'] });
    await routeWorker(context);
    await context.addInitScript(() => { Math.random = () => 0; window.geoCalls = 0; const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation); navigator.geolocation.getCurrentPosition = (...args) => { window.geoCalls++; return original(...args); }; });
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/(?:422|503)/.test(m.text()))
        report.errors.push(m.text()); });
    await page.goto(url);
    await page.getByRole('heading', { name: 'SO, WHAT WE EATING?' }).waitFor();
    assert.equal(await page.evaluate(() => window.geoCalls), 0);
    assert.equal(await page.getByLabel('Where are we eating?').inputValue(), '');
    assert(!await page.locator('body').textContent().then(t => t.includes('Pasadena')));
    await page.screenshot({ path: resolve(artifacts, 'cb02-desktop-feed.png'), fullPage: true });
    for (const typed of ['Claremont, CA', '91711', 'Ontario, CA', 'Los Angeles, CA', 'Las Vegas, NV', '10001', '123 Main Street, Paris, France']) {
        await page.getByRole('link', { name: 'Feed me', exact: true }).click();
        await page.getByLabel('Where are we eating?').fill(typed);
        await page.getByRole('button', { name: 'FEED ME' }).click();
        await page.getByRole('heading', { name: 'Night Owl Diner', exact: true }).waitFor();
        assert.equal(requests.at(-1).locationQuery, typed);
        report.typedLocations.push(typed);
    }
    report.liveWorkerPath = true;
    assert(await page.getByAltText('Google Maps', { exact: true }).isVisible());
    assert(await page.getByRole('link', { name: 'Test data credit' }).isVisible());
    assert(await page.getByRole('button', { name: 'Different order here' }).isDisabled());
    assert.equal(await page.locator('.grand-total').count(), 0);
    const before = requests.at(-1);
    await page.getByRole('button', { name: 'Different restaurant' }).click();
    await page.getByRole('heading', { name: 'Sunrise Bowl', exact: true }).waitFor();
    assert.deepEqual(requests.at(-1), before);
    report.reroll = true;
    const popup = context.waitForEvent('page');
    await page.getByRole('link', { name: 'Directions', exact: false }).click();
    const map = await popup;
    await map.waitForLoadState();
    assert(map.url().includes('destination_place_id=bowl'));
    await map.close();
    report.directions = true;
    assert.equal((await snapshot(page)).history.length, 0);
    await page.getByRole('button', { name: 'WE ATE HERE' }).click();
    assert.equal((await snapshot(page)).history.length, 1);
    const stored = JSON.stringify(await snapshot(page));
    for (const field of ['Sunrise Bowl', 'Mock Restaurant Road', 'latitude', 'longitude', String(point.latitude)])
        assert(!stored.includes(field));
    await page.getByRole('link', { name: 'Recent meals', exact: true }).click();
    await page.reload();
    await page.getByRole('heading', { name: 'Saved restaurant', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Refresh current details' }).click();
    await page.getByRole('heading', { name: 'Sunrise Bowl', exact: true }).waitFor();
    report.historyPrivacy = true;
    await page.getByRole('link', { name: 'Feed me', exact: true }).click();
    await page.getByLabel('How far?', { exact: true }).selectOption('3219');
    await page.getByRole('button', { name: 'Use my location' }).click();
    await page.getByRole('button', { name: 'Current location ✓' }).waitFor();
    await page.getByRole('button', { name: 'FEED ME' }).click();
    await page.getByRole('heading', { name: 'Night Owl Diner', exact: true }).waitFor();
    assert.deepEqual(requests.at(-1).location, point);
    assert.equal(requests.at(-1).radiusMeters, 3219);
    assert.equal(requests.at(-1).openNow, false);
    report.currentLocation = true;
    assert.equal((await snapshot(page)).settings.radiusMeters, 3219);
    assert(!JSON.stringify(await snapshot(page)).includes(String(point.latitude)));
    for (const width of [375, 390, 430]) {
        await page.setViewportSize({ width, height: 850 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        report.mobileWidths.push(width);
    }
    await page.screenshot({ path: resolve(artifacts, 'cb02-mobile-result.png'), fullPage: true });
    await page.getByRole('link', { name: 'Feed me', exact: true }).click();
    await page.screenshot({ path: resolve(artifacts, 'cb02-mobile-feed.png'), fullPage: true });
    scenario = 'empty';
    await page.getByLabel('How far?', { exact: true }).selectOption('8047');
    await page.getByRole('button', { name: 'FEED ME' }).click();
    await page.getByRole('button', { name: 'Expand to 10 miles' }).click();
    await page.getByRole('button', { name: 'Expand to 20 miles' }).click();
    await page.getByRole('button', { name: 'Expand to 30 miles' }).click();
    await page.getByText('No suitable spots within 30 miles.', { exact: false }).waitFor();
    assert.equal(await page.getByRole('button', { name: /Expand to/ }).count(), 0);
    assert.equal(requests.at(-1).radiusMeters, 48280);
    report.expansion = true;
    report.radius = true;
    scenario = 'unknown';
    await page.getByRole('button', { name: 'FEED ME' }).click();
    await page.locator('.restaurant-intro h1').waitFor();
    assert(!/hours|closed|\bopen\b/i.test(await page.locator('.restaurant-meta').textContent()));
    assert.equal(await page.getByLabel('Open now', { exact: true }).count(), 0);
    assert.equal(requests.at(-1).openNow, false);
    report.hoursFeatureRemoved = true;
    await page.getByRole('link', { name: 'Feed me', exact: true }).click();
    await page.reload();
    assert.equal(await page.getByLabel('How far?', { exact: true }).inputValue(), '48280');
    assert.equal(await page.getByLabel('Open now', { exact: true }).count(), 0);
    assert(!Object.hasOwn((await snapshot(page)).settings, 'openNow'));
    scenario = 'failure';
    await page.getByLabel('Where are we eating?').fill('Claremont, CA');
    await page.getByRole('button', { name: 'FEED ME' }).click();
    await page.getByText('Restaurant discovery is unavailable right now.', { exact: false }).waitFor();
    assert.equal(await page.locator('.restaurant-intro').count(), 0);
    assert(!await page.locator('body').textContent().then(t => t.includes('Pasadena')));
    report.noSilentFallback = true;
    scenario = 'normal';
    await page.getByLabel('Where are we eating?').fill('nonsense');
    await page.getByRole('button', { name: 'FEED ME' }).click();
    await page.getByText('We couldn’t find that location.', { exact: false }).waitFor();
    await waitFor(() => page.evaluate(() => !!navigator.serviceWorker.controller));
    offline = true;
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'SO, WHAT WE EATING?' }).waitFor();
    await page.getByText('real restaurant discovery needs a connection.', { exact: false }).waitFor();
    report.offlineShell = true;
    offline = false;
    await context.setOffline(false);
    updatedWorker = true;
    await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; await r.update(); });
    await waitFor(() => page.evaluate(async () => (await caches.keys()).includes(`swwe:${location.pathname}:browser-update-check`)));
    await page.getByRole('button', { name: 'Reload to update' }).waitFor();
    report.workerUpdate = true;
    const outside = await context.newPage();
    await outside.goto(origin);
    assert.equal(await outside.evaluate(() => navigator.serviceWorker.controller), null);
    await outside.close();
    report.scope = true;
    const portfolio = await context.newPage();
    await portfolio.goto(origin + bases[1]);
    await portfolio.getByLabel('Where are we eating?').fill('10001');
    await portfolio.getByRole('button', { name: 'FEED ME' }).click();
    await portfolio.locator('.restaurant-intro h1').waitFor();
    report.portfolioPath = true;
    await portfolio.close();
    const fallback = await browser.newContext();
    await routeWorker(fallback);
    await fallback.addInitScript(() => { Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: (_ok, fail) => fail({ code: 1 }) } }); Object.defineProperty(window, 'localStorage', { get() { throw new Error('Synthetic unavailable storage'); } }); });
    const denied = await fallback.newPage();
    denied.on('pageerror', e => report.errors.push(e.message));
    await denied.goto(url);
    await denied.getByRole('button', { name: 'Use my location' }).click();
    await denied.getByText('Couldn’t use your location.', { exact: false }).waitFor();
    report.deniedLocation = true;
    await denied.getByLabel('Where are we eating?').fill('10001');
    await denied.getByRole('button', { name: 'FEED ME' }).click();
    await denied.locator('.restaurant-intro h1').waitFor();
    await denied.getByRole('button', { name: 'WE ATE HERE' }).click();
    await denied.getByRole('link', { name: 'Recent meals', exact: true }).click();
    assert.equal(await denied.locator('.history-list li').count(), 1);
    report.temporaryStorage = true;
    await fallback.close();
    const demo = await context.newPage();
    const count = requests.length;
    await demo.goto(url + '?mode=demo');
    await demo.getByRole('button', { name: 'FEED ME' }).click();
    await demo.locator('.order-lines').waitFor();
    const first = await demo.locator('.order-lines').textContent();
    await demo.getByRole('button', { name: 'Different order here' }).click();
    assert.notEqual(await demo.locator('.order-lines').textContent(), first);
    assert.equal(requests.length, count);
    report.explicitDemo = true;
    await demo.close();
    await context.close();
    assert.deepEqual(report.errors, []);
    console.log(JSON.stringify(report, null, 2));
}
catch (error) {
    const failed = browser?.contexts()[0]?.pages()[0];
    console.error(JSON.stringify({ requests, notice: await failed?.locator('#notice').textContent().catch(() => ''), main: await failed?.locator('main').textContent().catch(() => '') }, null, 2));
    await failed?.screenshot({ path: resolve(artifacts, 'cb02-failure.png'), fullPage: true }).catch(() => { });
    throw error;
}
finally {
    await writeFile(resolve(artifacts, 'cb02-browser-acceptance.json'), JSON.stringify(report, null, 2));
    await browser?.close();
    await new Promise(r => server.close(r));
}
