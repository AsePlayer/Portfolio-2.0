import type { MealRecommendation } from './MealRecommendation.ts';
export type EventType = 'shown' | 'reject' | 'reroll-order' | 'directions' | 'menu' | 'accepted';
export interface RecommendationEvent {
    id: string;
    type: EventType;
    restaurantId: string;
    at: string;
}
export interface CompletedMeal {
    id: string;
    recommendationId: string;
    at: string;
    restaurantId: string;
    restaurantName: string;
    cuisines: string[];
    order: string[];
    totalCents: number | null;
    people: number;
    isDemo?: boolean;
}
export function completedMeal(result: MealRecommendation, at = new Date().toISOString()): CompletedMeal {
    return {
        id: result.id, recommendationId: result.id, at,
        restaurantId: result.restaurant.id, restaurantName: result.restaurant.name,
        cuisines: result.restaurant.cuisines,
        order: result.meal?.lines.map(line => `${line.quantity} × ${line.item.name}`) ?? [],
        totalCents: result.meal?.totalCents ?? null, people: result.preferences.people, isDemo: result.restaurant.isDemo,
    };
}
