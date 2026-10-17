import type { Restaurant } from '../domain/Restaurant.ts';
import type { MenuResolution, MenuResolver, MatchEvidence } from './MenuResolver.ts';
import type { AllMenusSource } from '../providers/AllMenusMenuProvider.ts';
import { AllMenusMenuProvider } from '../providers/AllMenusMenuProvider.ts';
import { allMenusCityUrl } from './normalizeIdentity.ts';
import { assessIdentity, matchRestaurant } from './RestaurantMatcher.ts';

export class AllMenusMenuResolver implements MenuResolver {
    private resolutions = new Map<string, { expires: number; value: Promise<MenuResolution> }>();
    private source: AllMenusSource;
    constructor(source: AllMenusSource = new AllMenusMenuProvider()) { this.source = source; }
    resolveMenu(restaurant: Restaurant): Promise<MenuResolution> {
        if (restaurant.source !== 'google-places' || !restaurant.sourceId || restaurant.id !== `google:${restaurant.sourceId}`) return Promise.resolve({ status: 'not-found' });
        // Do not reuse a resolution after a venue's address/coordinates have changed.
        // This transient key and its result disappear on reload; nothing is persisted.
        const key = JSON.stringify([restaurant.id, restaurant.name, restaurant.address, restaurant.streetAddress,
            restaurant.locality, restaurant.regionCode, restaurant.postalCode, restaurant.countryCode, restaurant.latitude, restaurant.longitude]);
        const cached = this.resolutions.get(key);
        if (cached && cached.expires > Date.now()) return cached.value;
        const value = this.resolve(restaurant).catch(error => { this.resolutions.delete(key); throw error; });
        if (this.resolutions.size >= 64) this.resolutions.delete(this.resolutions.keys().next().value!);
        this.resolutions.set(key, { expires: Date.now() + 15 * 60000, value });
        return value;
    }
    private async resolve(restaurant: Restaurant): Promise<MenuResolution> {
        const city = allMenusCityUrl(restaurant);
        if (!city) return { status: 'not-found' };
        const match = matchRestaurant(restaurant, await this.source.cityIndex(city));
        if (match.status !== 'matched') return match;
        const page = await this.source.menuPage(match.candidate);
        if (!page) return { status: 'not-found' };
        if (page.restaurant.id !== match.candidate.id || page.restaurant.sourceId !== match.candidate.sourceId) return { status: 'not-found' };
        const verified = assessIdentity(restaurant, page.restaurant);
        if (verified.rejected || verified.confidence < 90) return { status: 'not-found' };
        if (!page.menu) return { status: 'unpriced' };
        if (page.menu.restaurantId !== match.candidate.id) return { status: 'not-found' };
        const matchedAt = new Date().toISOString();
        const evidence: MatchEvidence = {
            provider: 'allmenus', providerRestaurantId: match.candidate.sourceId!, sourceUrl: match.candidate.menuUrl!,
            matchedAt, confidence: verified.confidence, reasons: verified.reasons, distanceMeters: verified.distanceMeters,
        };
        return { status: 'matched', evidence, menu: {
            ...page.menu, restaurantId: restaurant.id, provider: 'allmenus', providerRestaurantId: evidence.providerRestaurantId,
            sourceUrl: evidence.sourceUrl, matchedAt, matchConfidence: evidence.confidence,
        } };
    }
}
