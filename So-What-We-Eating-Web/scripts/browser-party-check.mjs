import { build } from 'vite';
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import assert from 'node:assert/strict';

const live = process.argv.includes('--live');
const artifacts = resolve('artifacts'), root = resolve(artifacts, 'party-browser-build');
await mkdir(artifacts, { recursive: true });
await build({ configFile: false, base: './', logLevel: 'error', build: { outDir: root, emptyOutDir: true,
    lib: { entry: resolve('scripts/party-check-entry.ts'), formats: ['es'], fileName: () => 'harness.js' } } });
const css = (await readdir(root)).find(file => file.endsWith('.css'));
const html = (await readFile('index.html', 'utf8')).replace('<script type="module" src="./src/main.ts"></script>',
    `<link rel="stylesheet" href="./${css}"><script type="module">import * as harness from './harness.js'; window.harness = harness;</script>`);
await writeFile(resolve(root, 'index.html'), html);
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (request, response) => {
    const file = resolve(root, decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(1) || 'index.html');
    if (!file.startsWith(root + sep)) return response.writeHead(403).end();
    try { response.setHeader('content-type', types[extname(file)] ?? 'application/octet-stream'); response.end(await readFile(file)); }
    catch { response.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const report = { liveSource: live, discovery: 'Fixed restaurant context for UI QA; production providers untouched', examples: [], loops: [], errors: [] };
let browser, page;
try {
    const chrome = process.env.CHROME_PATH ?? (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
    browser = await chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : {}) });
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', error => report.errors.push(error.message));
    const external = [];
    page.on('request', request => { if (new URL(request.url()).hostname !== '127.0.0.1') external.push(request.url()); });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => !!window.harness);
    const source = await page.evaluate(async live => {
        const { App, LocalDatabase, RecommendationEngine, BrowserLocationService, seededRandom, AllMenusMenuProvider } = window.harness;
        let restaurant, menu;
        if (live) {
            const provider = new AllMenusMenuProvider();
            const rows = await provider.cityIndex('https://www.allmenus.com/ca/claremont/-/');
            const row = rows.find(r => r.sourceId === '407489');
            if (!row) throw new Error('Real Eureka source listing missing');
            const detail = await provider.menuPage(row);
            if (!detail?.menu) throw new Error('Real priced Eureka menu missing');
            restaurant = { ...detail.restaurant, distanceMeters: undefined };
            menu = detail.menu;
        } else {
            restaurant = { id: 'party-qa', name: 'The Party Test Kitchen', source: 'fixture', cuisines: ['Test menu'], isDemo: true };
            const items = Array.from({ length: 12 }, (_, i) => ({ id: `main-${i}`, name: `Test kitchen main ${i + 1}`, price: 7.25 + i * 0.5, role: 'main' }));
            for (const [role, names, price] of [['side', ['Garlic rice', 'Fries'], 3], ['drink', ['Iced tea', 'Lemonade', 'Sparkling water'], 2.5], ['appetizer', ['Chips & salsa', 'Garlic bread'], 4.5], ['dessert', ['Cookie'], 2.75]])
                for (const name of names) items.push({ id: name.toLowerCase().replaceAll(' ', '-'), name, price, role });
            menu = { schemaVersion: 1, restaurantId: restaurant.id, restaurantName: restaurant.name, source: 'test-only fixture', updatedAt: new Date().toISOString(), currency: 'USD', items };
        }
        window.partyMenu = menu;
        const db = new LocalDatabase('/party-qa/');
        db.clear();
        window.partyApp = new App(db, new RecommendationEngine({ searchNearby: async () => [restaurant] }, { getMenu: async () => menu }, seededRandom(41)), new BrowserLocationService(), [restaurant], { mode: live ? 'live' : 'demo', configured: true });
        window.partyApp.start();
        return { name: restaurant.name, sourceUrl: menu.sourceUrl, items: menu.items.length };
    }, live);
    report.source = source;
    for (const people of [1, 2, 5]) {
        await page.getByRole('link', { name: 'Feed me', exact: true }).click();
        await page.getByLabel('Where are we eating?').fill('91711');
        await page.getByLabel('People', { exact: true }).fill(String(people));
        await page.getByLabel('Party budget', { exact: true }).fill(String(people === 5 ? 100 : 40));
        await page.getByRole('button', { name: 'FEED ME' }).click();
        await page.locator('.order-lines').waitFor();
        report.examples.push(await page.evaluate(() => {
            const { meal, preferences, menu } = window.partyApp.result;
            const exact = meal.lines.every(line => menu.items.some(item => item.id === line.item.id && item.price === line.item.price));
            if (!exact || meal.totalCents > meal.budgetCents) throw new Error('Source or party budget mismatch');
            const fed = meal.lines.filter(line => line.item.role === 'main' || line.item.role === 'combo' || line.item.role === 'shared' && line.item.serves)
                .reduce((sum, line) => sum + line.quantity * (line.item.role === 'shared' ? line.item.serves : 1), 0);
            if (fed < preferences.people) throw new Error('A diner is missing a valid meal anchor');
            return { people: preferences.people, budget: preferences.budget, lines: meal.lines.map(l => ({ quantity: l.quantity, name: l.item.name, unitPrice: l.item.price })), subtotalCents: meal.subtotalCents, bufferCents: meal.bufferCents, totalCents: meal.totalCents };
        }));
    }
    // Exercise the real control repeatedly at fixed mouse coordinates, rather
    // than letting locator.click hunt down a moving target after every reroll.
    for (const width of [1440, 375, 390, 430]) {
        await page.setViewportSize({ width, height: width > 1000 ? 1000 : 844 });
        await page.evaluate(() => {
            window.scrollTo({ top: 0, behavior: 'instant' });
            const controls = document.querySelector('.decision-controls');
            window.scrollTo({ top: controls.getBoundingClientRect().top + scrollY - 24, behavior: 'instant' });
            window.originalReroll = document.querySelector('.order-reroll');
            window.originalReroll.focus({ preventScroll: true });
        });
        const initial = await page.locator('.order-reroll').boundingBox(), scroll = await page.evaluate(() => scrollY);
        const x = initial.x + initial.width / 2, y = initial.y + initial.height / 2;
        const beforeNetwork = external.length, heights = [], lineCounts = [], times = [];
        let shortest = Infinity, longest = 0;
        for (let roll = 0; roll < 18; roll++) {
            const start = performance.now();
            const before = await page.locator('.order-lines').textContent();
            await page.mouse.click(x, y);
            times.push(performance.now() - start);
            assert.notEqual(await page.locator('.order-lines').textContent(), before, 'The same physical click still rerolls');
            const box = await page.locator('.order-reroll').boundingBox();
            assert(Math.abs(box.y - initial.y) < 1 && Math.abs(box.x - initial.x) < 1, 'Control moved as receipt changed');
            assert.equal(await page.evaluate(() => scrollY), scroll, 'Reroll moved the viewport');
            assert(await page.evaluate(() => document.querySelector('.order-reroll') === window.originalReroll && document.activeElement === window.originalReroll), 'Control/focus was replaced');
            const height = await page.locator('.order-receipt').evaluate(node => node.offsetHeight);
            const lines = await page.locator('.order-lines li').count();
            heights.push(height); lineCounts.push(lines);
            if (width === 390 && (height < shortest || height > longest)) {
                const name = height < shortest ? 'short' : 'long';
                // Let only the screenshot settle; interactions above never wait for animation.
                await page.screenshot({ path: resolve(artifacts, `party-${live ? 'live-' : ''}${name}-mobile.png`), animations: 'disabled' });
            }
            shortest = Math.min(shortest, height); longest = Math.max(longest, height);
        }
        assert.equal(external.length, beforeNetwork, 'Same-restaurant rerolls made an external request');
        assert(longest > shortest + (live ? 20 : 60), 'Actually exercised both shorter and longer receipts');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
        await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight - innerHeight - 24, behavior: 'instant' }));
        const deepBox = await page.locator('.order-reroll').boundingBox(), deepScroll = await page.evaluate(() => scrollY);
        await page.mouse.click(deepBox.x + deepBox.width / 2, deepBox.y + deepBox.height / 2);
        assert.equal(await page.evaluate(() => scrollY), deepScroll, 'Deep receipt reroll clamped document scroll');
        assert(Math.abs((await page.locator('.order-reroll').boundingBox()).y - deepBox.y) < 1, 'Deep receipt control moved');
        report.loops.push({ width, rolls: heights.length + 1, minReceiptHeight: shortest, maxReceiptHeight: longest, minLines: Math.min(...lineCounts), maxLines: Math.max(...lineCounts), stableCoordinates: true, stableScroll: true, deepScrollStable: true, maxInteractionMs: Math.round(Math.max(...times)) });
    }
    await page.keyboard.press('Enter');
    assert(await page.evaluate(() => document.activeElement === window.originalReroll), 'Keyboard focus must stay on reroll');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Different order here' }).click();
    assert.equal(await page.locator('.order-receipt').evaluate(node => node.getAnimations().length), 0);
    assert.equal(await page.locator('.reroll-icon').evaluate(node => node.getAnimations().length), 0);
    await page.getByRole('button', { name: 'WE ATE HERE' }).click();
    assert(await page.getByRole('button', { name: 'Saved to recent meals' }).isDisabled());
    report.reducedMotion = report.keyboardFocus = report.accepted = true;
    report.largeMenuMs = await page.evaluate(() => {
        const { buildMeal, seededRandom } = window.harness;
        const menu = { ...window.partyMenu, items: Array.from({ length: 1000 }, (_, i) => ({ id: `large-${i}`, name: `Test main ${i}`, price: 5 + (i % 20), role: 'main' })) };
        const start = performance.now();
        buildMeal(menu, { ...window.partyApp.result.preferences, people: 8, budget: 200 }, seededRandom(91));
        return Math.round(performance.now() - start);
    });
    report.externalRequests = external.length;
    assert.deepEqual(report.errors, []);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: resolve(artifacts, `party-${live ? 'live-' : ''}desktop.png`), fullPage: true, animations: 'disabled' });
    console.log(JSON.stringify(report, null, 2));
} catch (error) {
    report.error = error.message;
    await page?.screenshot({ path: resolve(artifacts, 'party-failure.png'), fullPage: true }).catch(() => {});
    throw error;
} finally {
    await writeFile(resolve(artifacts, live ? 'party-live-report.json' : 'party-report.json'), JSON.stringify(report, null, 2));
    await browser?.close();
    await new Promise(r => server.close(r));
}
