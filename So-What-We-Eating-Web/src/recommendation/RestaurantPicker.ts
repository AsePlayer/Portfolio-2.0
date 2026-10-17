import type { Restaurant } from '../domain/Restaurant.ts';
import type { SearchPreferences } from '../domain/SearchPreferences.ts';
import { budgetAllocation } from '../domain/Budget.ts';
import type { LearningContext } from './RecommendationScorer.ts';
export function isEligible(restaurant: Restaurant, preferences: SearchPreferences, learning: LearningContext, excludeId?: string): boolean {
    return restaurant.id !== excludeId
        && (restaurant.distanceMeters === undefined || restaurant.distanceMeters <= preferences.maxDistanceMeters)
        && !learning.preferences.restaurants.some(p => p.restaurantId === restaurant.id && p.excluded)
        && !restaurant.cuisines.some(c => learning.preferences.avoidedCuisines.includes(c));
}
export function estimatedPriceCompatible(restaurant: Restaurant, preferences: SearchPreferences): boolean {
    // Discovery-only results are a rough price screen, never a priced order or guarantee.
    if (restaurant.priceLevel === undefined)
        return true; // Missing price data is not proof of unaffordability.
    const estimatedMain = [0, 6, 14, 25, 40][restaurant.priceLevel];
    return estimatedMain * preferences.people * 100 <= budgetAllocation(preferences.budget, preferences.bufferPercent).foodBudgetCents;
}
