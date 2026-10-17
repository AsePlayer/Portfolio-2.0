import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import assert from 'node:assert/strict';

// Check the ordinary production artifact, with no provider environment overrides.
const live = process.argv.includes('--live');
const root = resolve('dist'), artifacts = resolve('artifacts'), base = '/projects/what-we-eating/';
await mkdir(artifacts, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (!pathname.startsWith(base)) return res.writeHead(404).end();
    const target = resolve(root, decodeURIComponent(pathname.slice(base.length)) || 'index.html');
    if (!target.startsWith(root + sep)) return res.writeHead(403).end();
    try { res.setHeader('content-type', types[extname(target)] ?? 'application/octet-stream'); res.end(await readFile(target)); }
    catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}${base}`;
const point = { latitude: 34.0967, longitude: -117.7198 };
const spot = (id, tags = {}, patch = {}) => ({ type: 'node', id, lat: point.latitude, lon: point.longitude, tags: { name: `Open-data diner ${id}`, amenity: 'restaurant', cuisine: 'american', opening_hours: '24/7', ...tags }, ...patch });
const calls = [], errors = [];
let scenario = 'normal', browser, page;
try {
    const chrome = process.env.CHROME_PATH ?? (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
    browser = await chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, geolocation: point, permissions: ['geolocation'] });
    context.setDefaultTimeout(15_000);
    if (!live) {
        await context.route('https://photon.komoot.io/**', async route => {
            calls.push(route.request().url());
            if (new URL(route.request().url()).pathname === '/reverse') return route.fulfill({ json: { features: [10, 11].map(id => ({ geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] }, properties: { osm_type: 'N', osm_id: id, osm_key: 'amenity', osm_value: 'restaurant', name: `Indexed venue ${id}` } })) } });
            await route.fulfill({ json: { features: [{ geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] } }] } });
        });
        await context.route('https://overpass.private.coffee/api/interpreter', async route => {
            calls.push(route.request().postData());
            const query = new URLSearchParams(route.request().postData()).get('data');
            if (scenario === 'outage') return route.fulfill({ status: 503, json: { error: 'Public service unavailable' } });
            const id = query.match(/node\((\d+)\)/)?.[1];
            const elements = id ? [spot(Number(id))] : scenario === 'unknown' ? [spot(3, { opening_hours: '' }), spot(4, { opening_hours: 'Mo-Su off' })] : [spot(1), spot(2), spot(1), spot(4, { opening_hours: 'Mo-Su off' }), spot(5, {}, { lat: point.latitude + 1 })];
            await route.fulfill({ json: { elements } });
        });
        await context.route('https://www.openstreetmap.org/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Directions</title>' }));
    }
    await context.addInitScript(() => { Math.random = () => 0; window.geoCalls = 0; const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation); navigator.geolocation.getCurrentPosition = (...args) => { window.geoCalls++; return original(...args); }; });
    page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    if (live) {
        page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
        page.on('response', r => { if (new URL(r.url()).hostname !== '127.0.0.1') console.log(`Live response ${r.status()} ${new URL(r.url()).hostname}`); });
        page.on('requestfailed', r => console.error(`Live request failed ${new URL(r.url()).hostname}: ${r.failure()?.errorText}`));
    }
    const external = [];
    page.on('request', req => { if (new URL(req.url()).hostname !== '127.0.0.1') external.push(req.url()); });
    await page.goto(url);
    await page.getByRole('heading', { name: 'SO, WHAT WE EATING?' }).waitFor();
    assert.equal(await page.evaluate(() => window.geoCalls), 0);
    assert.equal(calls.length, 0);
    assert.equal(await page.locator('.configuration-note').count(), 0);
    await page.getByLabel('Where are we eating?').fill('91711');
    const started = Date.now();
    await page.getByRole('button', { name: 'FEED ME' }).click();
    await page.waitForFunction(() => document.querySelector('.restaurant-intro h1') || /discovery (?:is|took)|No suitable spots/.test(document.querySelector('#notice')?.textContent ?? ''), {}, { timeout: 60_000 });
    let includedUnknownHours = false;
    if (live && !await page.locator('.restaurant-intro h1').isVisible() && await page.getByRole('button', { name: 'Include places with unknown hours' }).isVisible()) {
        includedUnknownHours = true;
        await page.getByRole('button', { name: 'Include places with unknown hours' }).click();
        await page.locator('.restaurant-intro h1').waitFor();
    }
    assert(await page.locator('.restaurant-intro h1').isVisible(), await page.locator('#notice').textContent());
    const realName = await page.locator('.restaurant-intro h1').textContent();
    assert(await page.getByRole('link', { name: /OpenStreetMap contributors/ }).isVisible());
    assert.equal(await page.locator('.grand-total').count(), 0);
    const before = external.length;
    const firstId = await page.evaluate(() => JSON.parse(localStorage.getItem(`swwe:v1:${location.pathname}`)).events[0].restaurantId);
    await page.getByRole('button', { name: 'Different restaurant' }).click();
    await page.waitForFunction(id => JSON.parse(localStorage.getItem(`swwe:v1:${location.pathname}`)).events[0].type === 'shown' && JSON.parse(localStorage.getItem(`swwe:v1:${location.pathname}`)).events[0].restaurantId !== id, firstId);
    assert.equal(external.length, before, 'A reroll must use cached discovery');
    assert(external.every(x => !/google|workers\.dev/.test(x)), 'Default discovery must never call Google or a Worker');
    if (!live) {
        assert.equal(calls.length, 2);
        await page.getByRole('button', { name: 'WE ATE HERE' }).click();
        const stored = await page.evaluate(() => localStorage.getItem(`swwe:v1:${location.pathname}`));
        assert(stored.includes('openstreetmap') && !stored.includes('Open-data diner') && !stored.includes(String(point.latitude)));
        await page.getByRole('link', { name: 'Recent meals', exact: true }).click();
        await page.reload();
        await page.getByRole('heading', { name: 'Saved restaurant', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Refresh current details' }).click();
        await page.getByRole('heading', { name: 'Open-data diner 2', exact: true }).waitFor();
        await page.getByRole('link', { name: 'Feed me', exact: true }).click();
        const geocodes = calls.filter(x => x.startsWith('https:')).length;
        await page.getByRole('button', { name: 'Use my location' }).click();
        await page.getByRole('button', { name: 'Current location ✓' }).waitFor();
        await page.getByLabel('How far?', { exact: true }).selectOption('3219');
        await page.getByRole('button', { name: 'FEED ME' }).click();
        await page.locator('.restaurant-intro h1').waitFor();
        assert.equal(calls.filter(x => x.startsWith('https:')).length, geocodes, 'GPS must skip geocoding');
        await page.getByRole('link', { name: 'Feed me', exact: true }).click();
        scenario = 'unknown';
        await page.reload();
        await page.getByLabel('Where are we eating?').fill('Claremont, CA');
        await page.getByRole('button', { name: 'FEED ME' }).click();
        await page.getByRole('button', { name: 'Include places with unknown hours' }).click();
        await page.getByRole('heading', { name: 'Open-data diner 3', exact: true }).waitFor();
        await page.getByText('Hours unknown', { exact: false }).waitFor();
        for (const width of [375, 430]) {
            await page.setViewportSize({ width, height: 850 });
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        }
        await page.screenshot({ path: resolve(artifacts, 'free-mobile-result.png'), fullPage: true });
        scenario = 'outage';
        await page.getByRole('link', { name: 'Feed me', exact: true }).click();
        await page.reload();
        await page.getByLabel('Where are we eating?').fill('91711');
        await page.getByLabel('Open now', { exact: true }).check();
        await page.getByLabel('How far?', { exact: true }).selectOption('48280');
        await page.getByRole('button', { name: 'FEED ME' }).click();
        await page.getByRole('button', { name: 'Include places with unknown hours' }).click();
        await page.getByRole('heading', { name: 'Indexed venue 10', exact: true }).waitFor();
        const reverse = new URL(calls.findLast(x => x.includes('/reverse?')));
        assert.equal(reverse.searchParams.get('radius'), '48.28');
        const count = calls.length;
        await page.getByRole('button', { name: 'Different restaurant' }).click();
        await page.getByRole('heading', { name: 'Indexed venue 11', exact: true }).waitFor();
        assert.equal(calls.length, count);
    }
    await page.screenshot({ path: resolve(artifacts, live ? 'free-live-result.png' : 'free-result.png'), fullPage: true });
    assert.deepEqual(errors, []);
    const report = { live, normalProductionArtifact: true, firstRestaurant: realName, includedUnknownHours, elapsedMs: Date.now() - started, externalRequests: external.length, noKeyOrBilling: true, cachedReroll: true, errors };
    await writeFile(resolve(artifacts, live ? 'free-live-check.json' : 'free-browser-check.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
} catch (error) {
    console.error(await page?.locator('#notice').textContent().catch(() => ''));
    await page?.screenshot({ path: resolve(artifacts, 'free-failure.png'), fullPage: true }).catch(() => {});
    throw error;
} finally {
    await browser?.close();
    await new Promise(r => server.close(r));
}
