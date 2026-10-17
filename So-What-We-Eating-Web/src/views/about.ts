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
        el('p', {}, 'Live restaurants and listed menu prices come from AllMenus. The receipt links the menu and shows when we retrieved its prices. Published menus can be out of date; the buffer is a planning allowance, and actual prices, taxes, and tips can differ.'),
        el('h2', {}, 'Nearby means your distance.'),
        el('p', {}, 'Choose 2, 5, 10, 20, or 30 miles. We check restaurant coordinates against your straight-line radius and never expand it without your action. Coverage depends on AllMenus listings for your US city. Confirm current availability before you travel.'),
        el('h2', {}, 'Your location, only when you choose.'),
        el('p', {}, 'Photon resolves your chosen location. Your browser reads the city listings and selected menus directly from AllMenus. Live searches need a connection, but no API key or account. Exact user coordinates and typed addresses are not saved. An explicitly selected experimental Google mode uses a configured discovery service; normal live mode uses Photon and AllMenus.'),
        el('h2', {}, 'Remember the meal.'),
        el('p', {}, 'Only “We ate here” saves a completed meal: the AllMenus restaurant, selected items and unit prices, planned total, party size, and time. History, favorites, exclusions, and preferences stay on this browser. Experimental Google visits retain Place IDs and selected AllMenus orders while Google venue details remain transient. You can clear local records in Preferences.'),
        el('p', {}, el('a', { href: './privacy.html' }, 'Privacy policy'), ' · ', el('a', { href: './terms.html' }, 'Terms of use')),
        el('h2', {}, demo ? 'Fictional demo. Clearly separate.' : 'Want to try the test kitchen?'),
        el('p', {}, demo ? 'These original sample restaurants and menus near Pasadena are fictional. Don’t travel to their addresses.' : 'An explicitly selected demo has original fictional restaurants and menus for testing. It never substitutes for a failed real search.'),
        el('a', { href: demo ? '?mode=live#feed' : '?mode=demo#feed' }, demo ? 'Return to live mode ↗' : 'Open the fictional demo ↗'));
}
