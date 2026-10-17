import type { Restaurant } from '../domain/Restaurant.ts';
import type { MealRecommendation } from '../domain/MealRecommendation.ts';
import type { DiningLocation, SearchPreferences } from '../domain/SearchPreferences.ts';
import type { LocationService } from '../location/LocationService.ts';
import { RecommendationEngine, RecommendationFailure } from '../recommendation/RecommendationEngine.ts';
import { LocalDatabase } from '../storage/LocalDatabase.ts';
import { HistoryStore } from '../storage/HistoryStore.ts';
import { PreferenceStore } from '../storage/PreferenceStore.ts';
import { SettingsStore } from '../storage/SettingsStore.ts';
import { CONFIG } from '../domain/config.ts';
import { DiscoveryError } from '../domain/Discovery.ts';
import { nextRadius, radiusMiles, validRadius } from '../domain/Radius.ts';
import { feedView } from '../views/feed.ts';
import { resultView } from '../views/result.ts';
import { historyView } from '../views/history.ts';
import { settingsView } from '../views/settings.ts';
import { aboutView } from '../views/about.ts';
import { button, el, money } from './dom.ts';
type Route = 'feed' | 'result' | 'history' | 'settings' | 'about';
export class App {
    readonly history: HistoryStore;
    readonly preferences: PreferenceStore;
    readonly settings: SettingsStore;
    readonly restaurants: Restaurant[];
    result?: MealRecommendation;
    browserLocation?: DiningLocation;
    busy = false;
    draftLocation = '';
    readonly mode: 'live' | 'demo';
    readonly configured: boolean;
    private lookupRestaurant?: (ids: string[]) => Promise<Restaurant[]>;
    private route: Route = 'feed';
    private db: LocalDatabase;
    private engine: RecommendationEngine;
    private locationService: LocationService;
    private main = document.querySelector<HTMLElement>('#main')!;
    constructor(db: LocalDatabase, engine: RecommendationEngine, locationService: LocationService, restaurants: Restaurant[], runtime: {
        mode: 'live' | 'demo';
        configured: boolean;
        lookup?: (ids: string[]) => Promise<Restaurant[]>;
    }) {
        this.db = db;
        this.engine = engine;
        this.locationService = locationService;
        this.restaurants = restaurants;
        this.mode = runtime.mode;
        this.configured = runtime.configured;
        this.lookupRestaurant = runtime.lookup;
        if (this.mode === 'demo')
            this.draftLocation = 'Pasadena, CA';
        this.history = new HistoryStore(db);
        this.preferences = new PreferenceStore(db);
        this.settings = new SettingsStore(db);
    }
    start() {
        document.body.dataset.providerMode = this.mode;
        const banner = document.querySelector<HTMLElement>('.demo-banner')!;
        banner.replaceChildren(el('span', { className: 'status-dot', 'aria-hidden': true }), this.mode === 'demo' ? 'EXPLICIT DEMO MODE' : 'YOUR NEXT MEAL. NEARBY.', el('span', { className: 'banner-detail' }, this.mode === 'demo' ? 'Fictional places and sample menus.' : 'One good call, wherever you are.'), el('a', { href: '#about' }, 'About & privacy ↗'));
        addEventListener('hashchange', () => this.readRoute());
        this.db.addEventListener('storagefailure', () => this.storageStatus());
        document.querySelector('.skip-link')!.addEventListener('click', event => { event.preventDefault(); this.main.focus(); });
        this.storageStatus();
        this.readRoute(false);
    }
    private storageStatus() {
        const node = document.querySelector<HTMLElement>('#storage-status')!;
        node.hidden = !this.db.temporary;
        node.textContent = 'Temporary mode: storage is unavailable, full, or unreadable. Changes stay in this tab. Existing saved data has not been overwritten.';
    }
    private readRoute(focus = true) {
        const hash = location.hash.slice(1);
        this.route = ['feed', 'history', 'settings', 'about'].includes(hash) ? hash as Route : hash === 'result' && this.result ? 'result' : 'feed';
        this.render();
        if (focus) {
            this.main.focus({ preventScroll: true });
            window.scrollTo(0, 0);
        }
    }
    navigate(route: Route) {
        if (location.hash === `#${route}`)
            this.readRoute();
        else
            location.hash = route;
    }
    render() {
        const focused = document.activeElement?.getAttribute('data-focus');
        const views = { feed: feedView, result: resultView, history: historyView, settings: settingsView, about: aboutView };
        this.main.replaceChildren(views[this.route](this));
        this.main.setAttribute('aria-busy', String(this.busy));
        if (this.busy)
            this.main.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('button,input,select').forEach(input => { input.disabled = true; });
        document.querySelectorAll<HTMLAnchorElement>('nav a').forEach(link => {
            if (link.hash === `#${this.route}` || this.route === 'result' && link.hash === '#feed')
                link.setAttribute('aria-current', 'page');
            else
                link.removeAttribute('aria-current');
        });
        if (focused)
            [...this.main.querySelectorAll<HTMLElement>('[data-focus]')].find(node => node.dataset.focus === focused)?.focus({ preventScroll: true });
    }
    notice(text: string) {
        const node = document.querySelector<HTMLElement>('#notice')!;
        node.replaceChildren(text);
        node.hidden = !text;
    }
    async locate() {
        if (this.busy)
            return;
        // Save the current form values before a geolocation-triggered render.
        const budget = document.querySelector<HTMLInputElement>('#budget')!, people = document.querySelector<HTMLInputElement>('#people')!;
        this.draftLocation = document.querySelector<HTMLInputElement>('#location')?.value ?? this.draftLocation;
        const radius = Number(document.querySelector<HTMLSelectElement>('#radius')?.value);
        if (validRadius(radius))
            this.settings.update({ radiusMeters: radius });
        if (budget.validity.valid && people.validity.valid)
            this.settings.update({ budget: Number(budget.value), people: Number(people.value) });
        this.busy = true;
        this.render();
        this.notice('Finding your location. Coordinates stay in memory and are used only to find nearby spots.');
        try {
            this.browserLocation = await this.locationService.current();
            this.notice('Current location ✓. Choose a distance and hit Feed me.');
        }
        catch (error) {
            this.notice(error instanceof Error ? error.message : 'Type a city, ZIP, or address instead.');
        }
        finally {
            this.busy = false;
            this.render();
            document.querySelector<HTMLInputElement>('#location')?.focus();
        }
    }
    private learning() { return { preferences: this.preferences.value, history: this.history.meals, events: this.history.events }; }
    async feed(rawLocation: string, budget: number, people: number, radiusMeters: number) {
        if (this.busy)
            return;
        let location: DiningLocation;
        try {
            location = this.browserLocation ?? this.locationService.parse(rawLocation);
        }
        catch (error) {
            this.notice(error instanceof Error ? error.message : 'Enter a city, ZIP, or address.');
            document.querySelector<HTMLInputElement>('#location')?.focus();
            return;
        }
        const s = this.settings.value;
        this.draftLocation = rawLocation;
        const preferences: SearchPreferences = { location, budget, people, bufferPercent: s.bufferPercent, adventure: s.adventure, diningMode: s.diningMode, maxDistanceMeters: radiusMeters };
        this.settings.update({ budget, people, radiusMeters });
        await this.search(preferences);
    }
    private async search(preferences: SearchPreferences, excludeId?: string) {
        this.busy = true;
        this.render();
        this.notice('Consulting the stomach… making one good call.');
        try {
            this.result = await this.engine.recommend(preferences, this.learning(), excludeId);
            this.remember(this.result.restaurant);
            this.history.record('shown', this.result.restaurant.id);
            this.notice('Decision made. Your next spot is ready.');
            this.navigate('result');
        }
        catch (error) {
            this.notice(error instanceof RecommendationFailure || error instanceof DiscoveryError ? error.message : 'That decision didn’t come together. Check the basics and try again.');
            if (error instanceof RecommendationFailure && error.code === 'empty') {
                const expanded = nextRadius(preferences.maxDistanceMeters);
                if (expanded)
                    document.querySelector('#notice')!.append(button(`Expand to ${radiusMiles(expanded)} miles`, () => { this.settings.update({ radiusMeters: expanded }); void this.search({ ...preferences, maxDistanceMeters: expanded }, excludeId); }, 'text-button'));
            }
            if (error instanceof RecommendationFailure && error.code === 'budget') {
                const next = Math.min(CONFIG.maxBudget, Math.ceil(preferences.budget * 1.4 / 5) * 5);
                document.querySelector('#notice')!.append(button(`Try a ${money(next * 100)} party budget`, () => { this.settings.update({ budget: next }); this.navigate('feed'); }, 'text-button'));
            }
        }
        finally {
            this.busy = false;
            this.render();
        }
    }
    differentOrder() {
        if (!this.result?.meal || this.busy)
            return;
        const previous = this.result;
        this.history.record('reroll-order', previous.restaurant.id);
        this.result = this.engine.differentOrder(previous);
        this.history.record('shown', this.result.restaurant.id);
        this.notice(this.result.meal?.signature === previous.meal?.signature ? 'This is the only complete order that fits here. Try a higher budget or a different spot.' : 'Same spot. Fresh order.');
        this.render();
        document.querySelector<HTMLElement>('#order-title')?.setAttribute('tabindex', '-1');
        document.querySelector<HTMLElement>('#order-title')?.focus({ preventScroll: true });
    }
    async differentRestaurant() {
        if (!this.result || this.busy)
            return;
        this.history.record('reject', this.result.restaurant.id);
        await this.search(this.result.preferences, this.result.restaurant.id);
    }
    accept() {
        if (!this.result)
            return;
        const saved = this.history.accept(this.result);
        this.notice(saved ? this.db.temporary ? 'Meal saved for this tab. Browser storage is unavailable.' : 'Good call. Saved to your recent meals.' : 'This meal is already in your history.');
        this.render();
    }
    private remember(restaurant: Restaurant) {
        const index = this.restaurants.findIndex(r => r.id === restaurant.id);
        if (index >= 0)
            this.restaurants[index] = restaurant;
        else
            this.restaurants.push(restaurant);
    }
    async refreshPlace(restaurantId: string) {
        if (!this.lookupRestaurant || this.busy || !/^(google:|osm:)/.test(restaurantId)) {
            this.notice('Current restaurant details need a connected live service.');
            return;
        }
        this.busy = true;
        this.render();
        this.notice('Refreshing this restaurant’s current details…');
        try {
            const restaurants = await this.lookupRestaurant([restaurantId.slice(restaurantId.startsWith('osm:') ? 4 : 7)]);
            for (const restaurant of restaurants)
                this.remember(restaurant);
            this.notice(restaurants.length ? 'Current details loaded. They stay in memory only.' : 'Current details are unavailable. Your saved visit is still here.');
        }
        catch (error) {
            this.notice(error instanceof DiscoveryError ? error.message : 'Couldn’t refresh this restaurant. Try again later.');
        }
        finally {
            this.busy = false;
            this.render();
        }
    }
    excludeCurrent() {
        if (!this.result)
            return;
        this.preferences.updateRestaurant(this.result.restaurant.id, { excluded: true });
        this.notice('Skipped for future picks. You can bring it back in Preferences.');
        void this.differentRestaurant();
    }
    showDialog(title: string, ...children: Node[]) {
        const dialog = document.querySelector<HTMLDialogElement>('#details-dialog')!;
        dialog.replaceChildren(el('div', { className: 'dialog-heading' }, el('h2', { id: 'dialog-title' }, title), button('Close ×', () => dialog.close(), 'text-button')), ...children);
        dialog.showModal();
    }
    directions() {
        if (!this.result)
            return;
        this.history.record('directions', this.result.restaurant.id);
        this.showDialog(this.result.restaurant.isDemo ? 'This spot is make-believe.' : 'Directions unavailable.', el('p', {}, this.result.restaurant.isDemo ? 'The test kitchen uses fictional restaurants and addresses. There is no real destination to travel to. With a live restaurant provider, this action opens map directions.' : 'This restaurant has no address or directions link. Check its website for directions.'));
    }
    menu() {
        if (!this.result)
            return;
        this.history.record('menu', this.result.restaurant.id);
        const menu = this.result.menu;
        const content = menu ? el('ul', { className: 'menu-list' }, ...menu.items.map(item => el('li', {}, el('span', {}, item.name, item.serves ? ` · serves ${item.serves}` : ''), el('strong', {}, money(Math.round(item.price * 100)))))) : el('p', {}, 'Detailed menu data isn’t available for this spot. Check its website or ask the restaurant for current options and prices.');
        this.showDialog(menu ? `${menu.restaurantName}${this.result.restaurant.isDemo ? ' · sample menu' : ' · menu'}` : 'The menu is off the grid.', el('p', { className: 'sample-note' }, this.result.restaurant.isDemo ? 'Original fictional sample · not a real restaurant menu' : menu ? `Source: ${menu.source}. Updated ${new Date(menu.updatedAt).toLocaleDateString()}.` : ''), content);
    }
    confirmClear() {
        this.showDialog('Start with a clean plate?', el('p', {}, 'This removes your completed meals, interaction history, favorites, exclusions, and settings from this browser.'), button('Clear my local data', () => {
            this.db.clear();
            this.result = undefined;
            this.browserLocation = undefined;
            this.draftLocation = '';
            if (this.mode === 'live')
                this.restaurants.length = 0;
            document.querySelector<HTMLDialogElement>('#details-dialog')!.close();
            this.render();
            this.notice(this.db.temporary ? 'This tab is cleared; browser storage could not be changed.' : 'Local data cleared. Fresh start.');
        }, 'button primary'));
    }
}
