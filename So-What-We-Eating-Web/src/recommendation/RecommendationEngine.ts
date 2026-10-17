import type { RestaurantProvider } from '../providers/RestaurantProvider.ts';
import type { MenuProvider } from '../providers/MenuProvider.ts';
import type { PricedMealRecommendation } from '../domain/MealRecommendation.ts';
import type { SearchPreferences } from '../domain/SearchPreferences.ts';
import { validatePreferences } from '../domain/Budget.ts';
import { assertMenu } from '../catalog/validate.ts';
import { buildMeal } from './MealBuilder.ts';
import { isEligible } from './RestaurantPicker.ts';
import { restaurantWeight } from './RecommendationScorer.ts';
import type { LearningContext } from './RecommendationScorer.ts';
import { weightedPick } from './random.ts';
import type { Random } from './random.ts';
import { DiscoveryError } from '../domain/Discovery.ts';
import { radiusMiles } from '../domain/Radius.ts';
export class RecommendationFailure extends Error {
    code: 'unavailable' | 'empty' | 'budget' | 'menus';
    constructor(code: RecommendationFailure['code'], message: string) { super(message); this.code = code; }
}
export class RecommendationEngine {
    private restaurants: RestaurantProvider;
    private menus: MenuProvider;
    private random: Random;
    constructor(restaurants: RestaurantProvider, menus: MenuProvider, random: Random = Math.random) { this.restaurants = restaurants; this.menus = menus; this.random = random; }
    async recommend(preferences: SearchPreferences, learning: LearningContext, excludeId?: string): Promise<PricedMealRecommendation> {
        validatePreferences(preferences);
        let discovered;
        try {
            discovered = await this.restaurants.searchNearby({ location: preferences.location, maxDistanceMeters: preferences.maxDistanceMeters });
        } catch (error) {
            if (error instanceof DiscoveryError) throw error;
            throw new RecommendationFailure('unavailable', 'The menu source is unavailable right now. Try again in a moment.');
        }
        const remaining = discovered.filter(r => isEligible(r, preferences, learning, excludeId));
        if (!remaining.length) throw new RecommendationFailure('empty', `No ${excludeId ? 'other ' : ''}restaurants found in this search within ${radiusMiles(preferences.maxDistanceMeters)} miles. Try another area or expand the distance.`);
        let pricedMeals = 0, attempts = 0;
        const deadline = Date.now() + 25000;
        // Like the original app: try a restaurant, read its actual menu, and stop at an affordable order.
        // Never download every menu in a city or call an unpriced place a successful result.
        while (remaining.length && attempts++ < 24 && Date.now() < deadline) {
            const restaurant = weightedPick(remaining.map(r => ({ value: r, weight: restaurantWeight(r, true, preferences, learning) })), this.random);
            remaining.splice(remaining.indexOf(restaurant), 1);
            let menu;
            try {
                menu = await this.menus.getMenu(restaurant);
                if (!menu) continue;
                assertMenu(menu);
                if (menu.restaurantId !== restaurant.id) continue;
            } catch (error) {
                if (error instanceof DiscoveryError) throw error;
                continue;
            }
            // Menu loading can resolve the venue's precise coordinates; recheck the requested circle.
            if (!isEligible(restaurant, preferences, learning, excludeId)) continue;
            if (!menu.items.some(item => ['main', 'combo', 'shared'].includes(item.role))) continue;
            pricedMeals++;
            const meal = buildMeal(menu, preferences, this.random);
            if (!meal) continue;
            return { id: crypto.randomUUID(), restaurant, menu, meal, menuStatus: 'available', preferences: structuredClone(preferences) };
        }
        if (pricedMeals) throw new RecommendationFailure('budget', 'No complete order in the menus we checked fits this party budget. Try a higher budget, fewer people, or another area.');
        throw new RecommendationFailure('menus', `This search didn’t find a usable priced menu within ${radiusMiles(preferences.maxDistanceMeters)} miles. Try another area or expand the distance.`);
    }
    differentOrder(result: PricedMealRecommendation): PricedMealRecommendation {
        const meal = buildMeal(result.menu, result.preferences, this.random, result.meal.signature);
        return meal ? { ...result, id: crypto.randomUUID(), meal } : result;
    }
}
