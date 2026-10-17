import { build } from 'vite';
import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Only a public URL is accepted. Google secrets never enter this browser harness.
const endpoint = process.env.VITE_RESTAURANT_PROXY_URL ?? '';
const artifacts = resolve('artifacts'), root = resolve(artifacts, 'live-hybrid-build');
await mkdir(artifacts, { recursive: true });
await build({ configFile: false, logLevel: 'error', build: { outDir: root, emptyOutDir: true,
    lib: { entry: resolve('scripts/hybrid-check-entry.ts'), formats: ['es'], fileName: () => 'harness.js' }, rollupOptions: { output: { inlineDynamicImports: true } } } });
const locations = ['91711', 'Claremont, CA', 'Diamond Bar, CA', 'Diamondbar, CA', '91765', 'Las Vegas, NV', 'New York, NY', 'Use my location', 'Municipal boundary: Claremont / Pomona'];
const report = { checkedAt: new Date().toISOString(), status: 'NOT VERIFIED',
    note: 'Google content remains transient. Saved names, addresses and prices below come independently from AllMenus. GPS uses a fixed test coordinate, not the device location.',
    endpointConfigured: !!endpoint, allMenus: null, cases: [] };
let browser;
try {
    const chrome = process.env.CHROME_PATH ?? (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
    browser = await chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : {}) });
    const context = await browser.newContext({ permissions: ['geolocation'], geolocation: { latitude: 34.0967, longitude: -117.7198 } });
    const page = await context.newPage();
    // Run under the deployed origin so the Worker's actual CORS allowlist is tested.
    await page.goto(endpoint ? process.env.PRICING_TEST_URL ?? 'https://ryanscott.org/projects/what-we-eating/' : 'about:blank');
    await page.evaluate(async script => { window.harness = await import(URL.createObjectURL(new Blob([script], { type: 'text/javascript' }))); }, await readFile(resolve(root, 'harness.js'), 'utf8'));
    // Even without Google configuration, verify the actual browser CORS/parser boundary.
    report.allMenus = await page.evaluate(async () => {
        const { AllMenusMenuProvider, buildMeal, parseLocation } = window.harness;
        let calls = 0;
        const provider = new AllMenusMenuProvider((...args) => { calls++; return fetch(...args); });
        try {
            const url = 'https://www.allmenus.com/ca/claremont/-/';
            const [rows, again] = await Promise.all([provider.cityIndex(url), provider.cityIndex(url)]);
            if (rows !== again || calls !== 1) throw new Error('City cache did not coalesce');
            const row = rows.find(r => r.sourceId === '407489');
            if (!row) throw new Error('Eureka listing not found');
            const detail = await provider.menuPage(row);
            if (!detail?.menu) throw new Error('No exact priced menu');
            const meal = buildMeal(detail.menu, { location: parseLocation('91711'), budget: 40, people: 2, bufferPercent: 0.2, adventure: 'balanced', diningMode: 'unknown', maxDistanceMeters: 8047 }, () => 0);
            if (!meal || meal.totalCents > 4000) throw new Error('No complete $40 order for two');
            return { status: 'verified-source-only', googleFlow: false, sourceUrl: row.menuUrl, name: detail.restaurant.name,
                address: detail.restaurant.address, listedItems: detail.menu.items.length, networkCalls: calls,
                lines: meal.lines.map(line => ({ name: line.item.name, unitPrice: line.item.price, quantity: line.quantity })), subtotalCents: meal.subtotalCents, totalCents: meal.totalCents };
        } catch (error) { return { status: 'failed', reason: error.message }; }
    });
    for (const location of locations) {
        if (!endpoint) {
            report.cases.push({ location, status: 'blocked', reason: 'No public Google Worker /discover URL configured.' });
            continue;
        }
        const result = await page.evaluate(async ({ endpoint, location }) => {
            const { createRuntime, RecommendationEngine, emptyLearning, parseLocation, BrowserLocationService, AllMenusMenuProvider, assessIdentity, exactPrice } = window.harness;
            try {
                window.liveRuntime ??= await createRuntime('google', endpoint);
                window.liveEngine ??= new RecommendationEngine({
                    get resolvedLabel() { return window.liveRuntime.restaurants.resolvedLabel; },
                    searchNearby: async query => {
                        const candidates = await window.liveRuntime.restaurants.searchNearby(query);
                        window.liveCandidateLocalities = new Set(candidates.map(r => r.locality).filter(Boolean));
                        return candidates;
                    },
                }, window.liveRuntime.menus);
                const gps = location === 'Use my location';
                const input = gps ? await new BrowserLocationService().current() : parseLocation(location.startsWith('Municipal boundary:') ? 'Claremont, CA' : location);
                const result = await window.liveEngine.recommend({ location: input, budget: 40, people: 2, bufferPercent: 0.2, adventure: 'balanced', diningMode: 'unknown', maxDistanceMeters: 8047 }, emptyLearning());
                if (!result.restaurant.id.startsWith('google:') || result.menu.restaurantId !== result.restaurant.id || result.restaurant.distanceMeters > 8047) throw new Error('Canonical identity or radius failure');
                const source = new AllMenusMenuProvider();
                const detail = await source.menuPage({ id: `allmenus:${result.menu.providerRestaurantId}`, sourceId: result.menu.providerRestaurantId, source: 'allmenus', menuUrl: result.menu.sourceUrl, name: result.menu.restaurantName, cuisines: [] });
                if (!detail?.menu) throw new Error('Could not independently reread source menu');
                const match = assessIdentity(result.restaurant, detail.restaurant);
                if (match.rejected || match.confidence < 90) throw new Error('Branch evidence failed independent verification');
                const html = new DOMParser().parseFromString(await (await fetch(result.menu.sourceUrl, { cache: 'no-store', credentials: 'omit' })).text(), 'text/html');
                const rows = [...html.querySelectorAll('.menu-items')].map(row => ({ name: row.querySelector('.item-title')?.textContent?.replace(/\s+/g, ' ').trim(), price: exactPrice(row.querySelector('.item-price')?.textContent ?? '') }));
                let subtotal = 0;
                for (const line of result.meal.lines) {
                    if (!rows.some(row => row.name === line.item.name && row.price === line.item.price)) throw new Error('Item/price missing from independently retrieved HTML');
                    subtotal += Math.round(line.item.price * 100) * line.quantity;
                }
                if (subtotal !== result.meal.subtotalCents || subtotal + result.meal.bufferCents !== result.meal.totalCents || result.meal.totalCents > 4000) throw new Error('Arithmetic failure');
                window.liveEngine.differentOrder(result);
                return { status: 'verified', googlePlaceId: result.restaurant.sourceId, withinRadius: true,
                    sourceUrl: result.menu.sourceUrl, name: detail.restaurant.name, address: detail.restaurant.address,
                    lines: result.meal.lines.map(line => ({ name: line.item.name, unitPrice: line.item.price, quantity: line.quantity })),
                    subtotalCents: subtotal, totalCents: result.meal.totalCents, gps: gps ? 'simulated-browser-coordinate' : undefined,
                    boundaryConfirmed: location.startsWith('Municipal boundary:') ? window.liveCandidateLocalities.size > 1 : undefined };
            } catch (error) { return { status: 'failed', code: error.code, reason: error.message }; }
        }, { endpoint, location });
        report.cases.push({ location, ...result });
        console.log(`${location}: ${result.status}${result.reason ? ` (${result.reason})` : ''}`);
    }
    if (report.cases.some(row => row.status === 'verified')) report.status = 'LIVE FLOW VERIFIED; inspect individual cases';
    console.log(JSON.stringify(report, null, 2));
} finally {
    await writeFile(resolve(artifacts, 'hybrid-live-report.json'), JSON.stringify(report, null, 2));
    await browser?.close();
}
