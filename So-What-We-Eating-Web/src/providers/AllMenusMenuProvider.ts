import type { Restaurant } from '../domain/Restaurant.ts';
import type { Menu } from '../domain/Menu.ts';
import { DiscoveryError } from '../domain/Discovery.ts';
import { menuUrl, parseMenuRestaurant, parsePricedMenu, parseRestaurants } from './allmenus/parse.ts';

export interface AllMenusPage {
    restaurant: Restaurant;
    menu: Menu | null;
}
export interface AllMenusSource {
    cityIndex(url: string): Promise<Restaurant[]>;
    menuPage(restaurant: Restaurant): Promise<AllMenusPage | null>;
}

/** Transport and conservative parsing only. Entity resolution lives in menus/. */
export class AllMenusMenuProvider implements AllMenusSource {
    private cache = new Map<string, { expires: number; value: Promise<unknown> }>();
    private cooldown = 0;
    private request: typeof fetch;
    private parseDocument: (html: string) => Document;
    constructor(request: typeof fetch = fetch, parseDocument = (html: string) => new DOMParser().parseFromString(html, 'text/html')) {
        this.request = request.bind(globalThis);
        this.parseDocument = parseDocument;
    }

    private load<T>(url: string, parse: (html: string) => T): Promise<T | null> {
        const cached = this.cache.get(url);
        if (cached && cached.expires > Date.now()) return cached.value as Promise<T | null>;
        if (Date.now() < this.cooldown) return Promise.reject(new DiscoveryError('quota'));
        const value = (async () => {
            try {
                const response = await this.request(url, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(8000) });
                if (response.status === 429) {
                    const retryAfter = response.headers.get('retry-after');
                    const delay = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : Date.parse(retryAfter ?? '') - Date.now();
                    this.cooldown = Date.now() + Math.max(60000, Number.isFinite(delay) ? delay : 0);
                    throw new DiscoveryError('quota');
                }
                if (response.status === 404) return null;
                if (!response.ok) throw new DiscoveryError('unavailable');
                // A redirect must never silently substitute a different menu or city.
                if (response.url && new URL(response.url).href !== new URL(url).href) throw new DiscoveryError('unavailable');
                return parse(await response.text());
            } catch (error) {
                this.cache.delete(url);
                if (error instanceof DiscoveryError) throw error;
                throw new DiscoveryError(error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout' : 'unavailable');
            }
        })();
        if (this.cache.size >= 64) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(url, { expires: Date.now() + 15 * 60000, value });
        return value;
    }
    async cityIndex(url: string): Promise<Restaurant[]> {
        if (!/^https:\/\/www\.allmenus\.com\/[a-z]{2}\/[a-z0-9-]+\/-\/$/.test(url)) throw new DiscoveryError('invalid');
        return await this.load(url, html => {
            const document = this.parseDocument(html);
            if (!document.querySelector('.restaurant-list-item') && !document.querySelector('.restaurant-list')) throw new DiscoveryError('unavailable');
            return parseRestaurants(document);
        }) ?? [];
    }
    async menuPage(restaurant: Restaurant): Promise<AllMenusPage | null> {
        const url = menuUrl(restaurant.menuUrl ?? '');
        if (!url || restaurant.source !== 'allmenus') return null;
        return this.load(url.href, html => {
            const document = this.parseDocument(html), retrievedAt = new Date().toISOString();
            const detail = parseMenuRestaurant(document, restaurant, retrievedAt);
            if (!detail) throw new DiscoveryError('unavailable');
            return { restaurant: detail, menu: parsePricedMenu(document, restaurant, retrievedAt)?.menu ?? null };
        });
    }
}
