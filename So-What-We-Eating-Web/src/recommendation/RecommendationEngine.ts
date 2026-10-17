import type { RestaurantProvider } from '../providers/RestaurantProvider.ts';
import type { MenuProvider } from '../providers/MenuProvider.ts';
import type { MealRecommendation } from '../domain/MealRecommendation.ts';
import type { SearchPreferences } from '../domain/SearchPreferences.ts';
import { validatePreferences } from '../domain/Budget.ts';
import { assertMenu } from '../catalog/validate.ts';
import { buildMeal } from './MealBuilder.ts';
import { isEligible, estimatedPriceCompatible } from './RestaurantPicker.ts';
import { restaurantWeight } from './RecommendationScorer.ts';
import type { LearningContext } from './RecommendationScorer.ts';
import { weightedPick } from './random.ts';
import type { Random } from './random.ts';
export class RecommendationFailure extends Error {
    code: 'unavailable' | 'empty' | 'budget';
    constructor(code: RecommendationFailure['code'], message: string) { super(message); this.code = code; }
}
export class RecommendationEngine {
    private restaurants: RestaurantProvider;
    private menus: MenuProvider;
    private random: Random;
    constructor(restaurants: RestaurantProvider, menus: MenuProvider, random: Random = Math.random) { this.restaurants = restaurants; this.menus = menus; this.random = random; }
    async recommend(preferences: SearchPreferences, learning: LearningContext, excludeId?: string): Promise<MealRecommendation> {
        validatePreferences(preferences);
        let discovered;
        try {
            discovered = await this.restaurants.searchNearby({ location: preferences.location, maxDistanceMeters: preferences.maxDistanceMeters });
        }
        catch {
            throw new RecommendationFailure('unavailable', 'The restaurant provider is taking a break. Try again in a moment.');
        }
        const restaurants = discovered.filter(r => isEligible(r, preferences, learning, excludeId));
        if (!restaurants.length)
            throw new RecommendationFailure('empty', excludeId ? 'No other spots fit right now. Edit your budget or restore an excluded restaurant in Preferences.' : 'No spots found here. Try the Pasadena demo, or check your exclusions in Preferences.');
        const candidates = await Promise.all(restaurants.map(async (restaurant) => {
            let menu = null;
            try {
                const found = await this.menus.getMenu(restaurant);
                if (found) {
                    assertMenu(found);
                    if (found.restaurantId === restaurant.id)
                        menu = found;
                }
            }
            catch { /* Discovery still works when a menu provider fails. */ }
            const meal = menu ? buildMeal(menu, preferences, this.random) : null;
            if (menu && !meal)
                return null;
            if (!menu && !estimatedPriceCompatible(restaurant, preferences))
                return null;
            const result: MealRecommendation = { id: crypto.randomUUID(), restaurant, menu, meal, menuStatus: menu ? 'available' : 'unavailable', preferences: structuredClone(preferences) };
            return { value: result, weight: restaurantWeight(restaurant, !!meal, preferences, learning) };
        }));
        const eligible = candidates.filter(c => c !== null);
        if (!eligible.length)
            throw new RecommendationFailure('budget', 'Nothing makes a full meal for everyone at this budget. Raise the party budget or try fewer people.');
        return weightedPick(eligible, this.random);
    }
    differentOrder(result: MealRecommendation): MealRecommendation {
        const meal = result.menu ? buildMeal(result.menu, result.preferences, this.random, result.meal?.signature) : null;
        return { ...result, id: crypto.randomUUID(), meal, menuStatus: !result.menu ? 'unavailable' : !meal ? 'unaffordable' : 'available' };
    }
}
