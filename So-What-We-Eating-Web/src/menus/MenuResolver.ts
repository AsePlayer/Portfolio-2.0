import type { Restaurant } from '../domain/Restaurant.ts';
import type { Menu } from '../domain/Menu.ts';

export interface MatchEvidence {
    provider: string;
    providerRestaurantId: string;
    sourceUrl: string;
    matchedAt: string;
    confidence: number;
    reasons: string[];
    distanceMeters?: number;
}
export type MenuResolution =
    | { status: 'matched'; menu: Menu; evidence: MatchEvidence }
    | { status: 'not-found' | 'ambiguous' | 'unpriced' };

/** Discovery supplies the canonical venue; resolvers only enrich that venue. */
export interface MenuResolver {
    resolveMenu(restaurant: Restaurant): Promise<MenuResolution>;
}
