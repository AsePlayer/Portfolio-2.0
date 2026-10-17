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
    restaurantName?: string;
    provider?: string;
    orderProvider?: 'allmenus';
    sourceId?: string;
    cuisines: string[];
    order: string[];
    totalCents: number | null;
    people: number;
    isDemo?: boolean;
}
export function completedMeal(result: MealRecommendation, at = new Date().toISOString()): CompletedMeal {
    const pricedOrder = result.menu?.provider === 'allmenus' && result.meal ? {
        orderProvider: 'allmenus' as const,
        order: result.meal.lines.map(line => `${line.quantity} × ${line.item.name} · $${line.item.price.toFixed(2)} each`),
        totalCents: result.meal.totalCents,
    } : { order: [], totalCents: null };
    if (['google-places', 'openstreetmap'].includes(result.restaurant.source))
        return {
            id: result.id, recommendationId: result.id, at, restaurantId: result.restaurant.id,
            provider: result.restaurant.source, sourceId: result.restaurant.sourceId,
            cuisines: [], ...pricedOrder, people: result.preferences.people,
        };
    return {
        id: result.id, recommendationId: result.id, at, provider: result.restaurant.isDemo ? 'fixture' : result.restaurant.source,
        sourceId: result.restaurant.sourceId,
        restaurantId: result.restaurant.id, restaurantName: result.restaurant.name,
        cuisines: result.restaurant.cuisines,
        order: result.meal?.lines.map(line => `${line.quantity} × ${line.item.name} · $${line.item.price.toFixed(2)} each`) ?? [],
        totalCents: result.meal?.totalCents ?? null, people: result.preferences.people, isDemo: result.restaurant.isDemo,
    };
}
