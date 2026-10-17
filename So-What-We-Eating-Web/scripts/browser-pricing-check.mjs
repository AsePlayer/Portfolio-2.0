import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import assert from 'node:assert/strict';
const live = process.argv.includes('--live');
const searchLocation = process.env.PRICING_TEST_LOCATION || '91711';
const deployed = process.env.PRICING_TEST_URL;
const root = resolve('dist'), artifacts = resolve('artifacts');
await mkdir(artifacts, { recursive: true });
const base = '/projects/what-we-eating/';
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
const url = deployed || `http://127.0.0.1:${server.address().port}${base}`;
const requests = [], errors = [];
let scenario = 'normal', page, browser;
const rows = [[100, 'Outside radius'], [101, 'No Prices'], [102, 'Expensive'], [103, 'Noodle Kitchen'], [104, 'Taco Kitchen']];
const menuPath = (id, name) => `/ca/claremont/${id}-${name.toLowerCase().replaceAll(' ', '-')}/menu/`;
const listing = `<ul>${rows.map(([id, name]) => `<li class="restaurant-list-item"><h4 class="name"><a href="${menuPath(id, name)}">${name}</a></h4><p class="address">100 Example Street</p><p class="address">Claremont, CA 91711</p></li>`).join('')}</ul>`;
const item = (name, price) => `<li class="menu-items"><span class="item-title">${name}</span><span class="item-price">${price}</span></li>`;
function menuHtml(id, name) {
    const items = id === 101 || scenario === 'unpriced' ? item('No quote', 'Market price') : id === 102 ? item('Luxury Noodle Bowl', '$120.00') : `${item('Variable Bowl', '$2.00 - $8.00')}${item('From Bowl', '$2.00+')}${item('Conflicting Bowl', '$1.00')}${item('Conflicting Bowl', '$3.00')}${item('Noodle Bowl', '$9.50')}${item('Teriyaki Bowl', '$11.25')}`;
    return `<h1>Unrelated popup headline</h1><div class="restaurant-summary"><h1>${name}</h1></div><a class="menu-address" href="https://www.google.com/maps/dir/${id === 100 ? '36.10' : '34.10'},-117.72">100 Example Street, Claremont, CA 91711</a><ul><li class="menu-category"><div class="category-name">Entrees</div><ul>${items}</ul></li><li class="menu-category"><div class="category-name">Side Orders</div><ul>${item('Edamame', '$3.00')}</ul></li><li class="menu-category"><div class="category-name">Beverages</div><ul>${item('Iced Tea', '$2.50')}</ul></li><li class="menu-category"><div class="category-name">Lunch Specials</div><ul>${item('Restricted Bowl', '$1.00')}</ul></li></ul>`;
}
const cents = text => Math.round(Number(text.replace(/[^\d.]/g, '')) * 100);
const report = { live, deployed: !!deployed, sourcePriceMatch: false, pricedOnly: false, budget: false, orderReroll: false, restaurantReroll: false, history: false, mobile: [], errors };
try {
    const chrome = process.env.CHROME_PATH ?? (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
    browser = await chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['geolocation'], geolocation: { latitude: 34.10, longitude: -117.72 } });
    context.setDefaultTimeout(20_000);
    await context.addInitScript(() => { Math.random = () => 0; });
    if (!live) {
        await context.route('https://photon.komoot.io/**', route => route.fulfill({ json: { features: [{ geometry: { type: 'Point', coordinates: [-117.72, 34.10] }, properties: { countrycode: 'US', city: 'Claremont', state: 'California', type: 'city', osm_value: 'city', name: 'Claremont' } }] } }));
        await context.route('https://www.allmenus.com/**', async route => {
            const path = new URL(route.request().url()).pathname;
            if (path.endsWith('/-/')) return route.fulfill({ contentType: 'text/html', body: listing });
            const id = Number(path.match(/\/(\d+)-/)?.[1]);
            const row = rows.find(r => r[0] === id);
            return route.fulfill({ contentType: 'text/html', body: row ? menuHtml(id, row[1]) : '' });
        });
    }
    page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (new URL(request.url()).hostname !== '127.0.0.1') requests.push(request.url()); });
    await page.goto(url);
    await page.getByRole('heading', { name: 'SO, WHAT WE EATING?' }).waitFor();
    assert.equal(await page.getByLabel('Open now', { exact: true }).count(), 0);
    await page.getByLabel('Where are we eating?').fill(searchLocation);
    await page.getByLabel('Party budget', { exact: true }).fill('35');
    await page.getByRole('button', { name: 'FEED ME' }).click();
    await page.locator('.order-lines').waitFor({ timeout: 60_000 });
    const restaurant = await page.locator('.restaurant-intro h1').textContent();
    if (!live) assert.equal(restaurant, 'Noodle Kitchen', 'Skip outside-radius, unpriced, and unaffordable menus');
    assert(await page.getByRole('button', { name: 'Different order here' }).isEnabled());
    assert(!/unavailable|unpriced|the spot is sorted/i.test(await page.locator('.order-receipt').textContent()));
    report.pricedOnly = true;
    const sourceUrl = await page.getByRole('link', { name: /Menu & listed prices: AllMenus/ }).getAttribute('href');
    const source = await page.evaluate(async sourceUrl => {
        const response = await fetch(sourceUrl, { credentials: 'omit', signal: AbortSignal.timeout(15000) });
        const document = new DOMParser().parseFromString(await response.text(), 'text/html');
        return [...document.querySelectorAll('.menu-items')].map(row => ({ name: row.querySelector('.item-title')?.textContent?.trim(), price: row.querySelector('.item-price')?.textContent?.trim() }));
    }, sourceUrl);
    const lines = await page.locator('.order-lines li').evaluateAll(nodes => nodes.map(n => ({ name: n.querySelector('.item-name').textContent, total: n.querySelector('.item-price').textContent })));
    let subtotal = 0;
    for (const line of lines) {
        const [, quantity, name] = line.name.match(/^(\d+) × (.+)$/);
        const original = source.find(item => item.name === name);
        assert(original, `Missing actual source item: ${name}`);
        assert.equal(cents(line.total), Number(quantity) * cents(original.price));
        subtotal += cents(line.total);
    }
    const totals = await page.locator('.total-row').evaluateAll(nodes => Object.fromEntries(nodes.map(n => [n.querySelector('dt').textContent, n.querySelector('dd').textContent])));
    assert.equal(cents(totals['Food subtotal']), subtotal);
    assert.equal(cents(totals['Planned total']), subtotal + 700);
    assert(cents(totals['Planned total']) <= 3500);
    report.sourcePriceMatch = report.budget = true;
    const before = await page.locator('.order-lines').textContent(), beforeRequests = requests.length;
    await page.getByRole('button', { name: 'Different order here' }).click();
    assert.notEqual(await page.locator('.order-lines').textContent(), before);
    assert.equal(requests.length, beforeRequests, 'Same-restaurant reroll must not fetch the menu again');
    report.orderReroll = true;
    await page.getByRole('button', { name: 'WE ATE HERE' }).click();
    await page.getByRole('link', { name: 'Recent meals', exact: true }).click();
    await page.reload();
    await page.getByRole('heading', { name: restaurant, exact: true }).waitFor();
    assert((await page.locator('.history-description').textContent()).includes('$'));
    assert(!/fictional|unpriced/i.test(await page.locator('.history-list').textContent()));
    report.history = true;
    await page.getByRole('link', { name: 'Feed me', exact: true }).click();
    await page.getByLabel('Where are we eating?').fill(searchLocation);
    await page.getByRole('button', { name: 'FEED ME' }).click();
    await page.locator('.order-lines').waitFor({ timeout: 60_000 });
    const priorId = await page.evaluate(() => JSON.parse(localStorage.getItem(`swwe:v1:${location.pathname}`)).events[0].restaurantId);
    await page.getByRole('button', { name: 'Different restaurant' }).click();
    await page.waitForFunction(id => { const e = JSON.parse(localStorage.getItem(`swwe:v1:${location.pathname}`)).events[0]; return e.type === 'shown' && e.restaurantId !== id; }, priorId, { timeout: 60_000 });
    assert(await page.locator('.order-lines').isVisible());
    report.restaurantReroll = true;
    for (const width of [375, 390, 430]) { await page.setViewportSize({ width, height: 900 }); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); report.mobile.push(width); }
    await page.screenshot({ path: resolve(artifacts, live ? 'pricing-live-mobile.png' : 'pricing-mobile.png'), fullPage: true });
    if (!live) {
        await page.getByRole('link', { name: 'Feed me', exact: true }).click();
        await page.getByLabel('Party budget', { exact: true }).fill('5');
        await page.getByRole('button', { name: 'FEED ME' }).click();
        await page.getByText('No complete order in the menus we checked fits this party budget.', { exact: false }).waitFor();
        assert.equal(await page.locator('.order-lines').count(), 0);
        scenario = 'unpriced';
        await page.reload();
        await page.getByLabel('Where are we eating?').fill('91711');
        await page.getByRole('button', { name: 'FEED ME' }).click();
        await page.getByText('This search didn’t find a usable priced menu', { exact: false }).waitFor();
        assert.equal(await page.locator('.order-lines').count(), 0);
        scenario = 'normal';
        await page.reload();
        await page.getByLabel('Party budget', { exact: true }).fill('35');
        await page.getByLabel('People', { exact: true }).fill('2');
        await page.getByRole('button', { name: 'Use my location' }).click();
        await page.getByRole('button', { name: 'Current location ✓' }).waitFor();
        await page.getByRole('button', { name: 'FEED ME' }).click();
        await page.locator('.order-lines').waitFor();
        assert((await page.locator('.item-name').first().textContent()).startsWith('2 ×'));
        assert(cents(await page.locator('.grand-total dd').textContent()) <= 3500);
        const beforeDemo = requests.filter(u => u.includes('allmenus.com')).length;
        await page.goto(url + '?mode=demo');
        await page.getByRole('button', { name: 'FEED ME' }).click();
        await page.locator('.order-lines').waitFor();
        assert.equal(requests.filter(u => u.includes('allmenus.com')).length, beforeDemo);
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ...report, restaurant, sourceUrl, lines, totals, networkRequests: requests.length }, null, 2));
} catch (error) {
    console.error(await page?.locator('#notice').textContent().catch(() => ''));
    await page?.screenshot({ path: resolve(artifacts, 'pricing-failure.png'), fullPage: true }).catch(() => {});
    throw error;
} finally {
    await writeFile(resolve(artifacts, live ? 'pricing-live-report.json' : 'pricing-report.json'), JSON.stringify(report, null, 2));
    await browser?.close();
    await new Promise(r => server.close(r));
}
