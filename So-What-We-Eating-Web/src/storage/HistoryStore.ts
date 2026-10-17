import { completedMeal } from '../domain/DiningHistory.ts';
import type { EventType } from '../domain/DiningHistory.ts';
import type { MealRecommendation } from '../domain/MealRecommendation.ts';
import { CONFIG } from '../domain/config.ts';
import type { LocalDatabase } from './LocalDatabase.ts';
export class HistoryStore {
    private db: LocalDatabase;
    constructor(db: LocalDatabase) { this.db = db; }
    get meals() { return this.db.data.history; }
    get events() { return this.db.data.events; }
    record(type: EventType, restaurantId: string) {
        this.db.data.events.unshift({ id: crypto.randomUUID(), type, restaurantId, at: new Date().toISOString() });
        this.db.data.events = this.db.data.events.slice(0, CONFIG.eventLimit);
        this.db.save();
    }
    accept(result: MealRecommendation): boolean {
        if (this.meals.some(m => m.recommendationId === result.id))
            return false;
        this.db.data.history.unshift(completedMeal(result));
        this.db.data.history = this.meals.slice(0, CONFIG.historyLimit);
        this.record('accepted', result.restaurant.id);
        return true;
    }
    isAccepted(id: string) { return this.meals.some(m => m.recommendationId === id); }
}
