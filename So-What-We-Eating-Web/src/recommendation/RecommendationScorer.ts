import type { Restaurant } from '../domain/Restaurant.ts';
import type { UserPreferences } from '../domain/RestaurantPreference.ts';
import type { CompletedMeal, RecommendationEvent } from '../domain/DiningHistory.ts';
import type { SearchPreferences } from '../domain/SearchPreferences.ts';
import { CONFIG } from '../domain/config.ts';
export interface LearningContext {
    preferences: UserPreferences;
    history: CompletedMeal[];
    events: RecommendationEvent[];
}
export const emptyLearning = (): LearningContext => ({ preferences: { restaurants: [], favoriteCuisines: [], avoidedCuisines: [] }, history: [], events: [] });
export function restaurantWeight(restaurant: Restaurant, hasMeal: boolean, search: SearchPreferences, learning: LearningContext, now = Date.now()): number {
    const pref = learning.preferences.restaurants.find(p => p.restaurantId === restaurant.id);
    const recentMeals = learning.history.filter(h => h.restaurantId === restaurant.id && now - Date.parse(h.at) < CONFIG.repeatWindowMs).length;
    const recentRejections = learning.events.filter(e => e.restaurantId === restaurant.id && e.type === 'reject' && now - Date.parse(e.at) < CONFIG.rejectionWindowMs).length;
    const accepts = learning.history.filter(h => h.restaurantId === restaurant.id).length;
    const cuisineLikes = restaurant.cuisines.filter(c => learning.preferences.favoriteCuisines.includes(c)).length;
    const acceptedCuisine = learning.history.some(h => h.cuisines.some(c => restaurant.cuisines.includes(c)));
    const adventure = search.adventure === 'familiar' ? Math.min(3, accepts) + (acceptedCuisine ? 1 : 0) : search.adventure === 'surprise' ? (accepts ? 0 : 2) : Math.min(1, accepts * 0.25);
    const score = 6 + (restaurant.rating ? restaurant.rating - 3 : 0) + (hasMeal ? 2 : 0)
        + (pref?.favorite ? CONFIG.favoriteBonus : 0) + cuisineLikes * 2 + adventure
        - Math.min(3, (restaurant.distanceMeters ?? 0) / 5000)
        - recentMeals * CONFIG.repeatPenalty - recentRejections * CONFIG.rejectionPenalty;
    return Math.max(0.25, score);
}
