import type { App } from '../ui/App.ts';
import { el } from '../ui/dom.ts';

export function aboutView(app: App): HTMLElement {
    const demo = app.mode === 'demo';
    return el('article', { className: 'secondary-page about-page' },
        el('p', { className: 'eyebrow' }, demo ? 'EXPLICIT DEMO MODE' : 'REAL MENU. REAL PRICES.'),
        el('h1', {}, 'Less deciding.\nMore eating.'),
        el('p', { className: 'page-intro' }, 'Bring your party budget. Get a place, named menu items, and an itemized order that fits.'),
        el('h2', {}, 'The price is the point.'),
        el('p', {}, 'We read listed menu prices, reserve your chosen buffer from the whole party budget, and build a complete order. Every item has a price. If a menu has no usable prices or cannot fit your party, we try another restaurant. An unpriced restaurant is never a finished recommendation.'),
        el('p', {}, 'Live menus come from AllMenus, following the original app’s menu-first approach. The receipt links its source and shows when details were retrieved. Published menus can be out of date; the buffer is a planning allowance, and actual prices, taxes, and tips can differ.'),
        el('h2', {}, 'Nearby means your distance.'),
        el('p', {}, 'Choose 2, 5, 10, 20, or 30 miles. We check each restaurant’s coordinates against that straight-line radius and never expand it without your action. Coverage depends on priced menus listed for your US city; this is not every nearby restaurant. Confirm current availability before you travel.'),
        el('h2', {}, 'Your location, only when you choose.'),
        el('p', {}, 'Typed locations and optional browser coordinates go to Photon to find your area. Your browser reads the city listing and selected menus directly from AllMenus. No API key, billing account, sign-up, or backend setup is needed. Exact user coordinates and typed addresses are not saved. Live searches need a connection and depend on public-service availability.'),
        el('p', {}, 'Geocoding uses Photon and ', el('a', { href: 'https://www.openstreetmap.org/copyright' }, 'OpenStreetMap data © OpenStreetMap contributors · ODbL'), '.'),
        el('h2', {}, 'Remember the meal.'),
        el('p', {}, 'Only “We ate here” saves a completed meal: restaurant name, selected items and unit prices, planned total, party size, and time. History, favorites, exclusions, and preferences stay on this browser. You can clear them in Preferences.'),
        el('p', {}, el('a', { href: './privacy.html' }, 'Privacy policy'), ' · ', el('a', { href: './terms.html' }, 'Terms of use')),
        el('h2', {}, demo ? 'Fictional demo. Clearly separate.' : 'Want to try the test kitchen?'),
        el('p', {}, demo ? 'These original sample restaurants and menus near Pasadena are fictional. Don’t travel to their addresses.' : 'An explicitly selected demo has original fictional restaurants and menus for testing. It never substitutes for a failed real search.'),
        el('a', { href: demo ? '?mode=live#feed' : '?mode=demo#feed' }, demo ? 'Return to live mode ↗' : 'Open the fictional demo ↗'));
}
