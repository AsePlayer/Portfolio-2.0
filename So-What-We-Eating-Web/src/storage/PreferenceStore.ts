import type { LocalDatabase } from './LocalDatabase.ts';
export class PreferenceStore {
    private db: LocalDatabase;
    constructor(db: LocalDatabase) { this.db = db; }
    get value() { return this.db.data.preferences; }
    restaurant(id: string) { return this.value.restaurants.find(r => r.restaurantId === id) ?? { restaurantId: id, favorite: false, excluded: false }; }
    updateRestaurant(id: string, patch: Partial<{
        favorite: boolean;
        excluded: boolean;
    }>) {
        const value = { ...this.restaurant(id), ...patch };
        this.value.restaurants = [...this.value.restaurants.filter(r => r.restaurantId !== id), value];
        this.db.save();
    }
    setCuisine(cuisine: string, mode: 'favorite' | 'avoid' | 'neutral') {
        this.value.favoriteCuisines = this.value.favoriteCuisines.filter(c => c !== cuisine);
        this.value.avoidedCuisines = this.value.avoidedCuisines.filter(c => c !== cuisine);
        if (mode === 'favorite')
            this.value.favoriteCuisines.push(cuisine);
        if (mode === 'avoid')
            this.value.avoidedCuisines.push(cuisine);
        this.db.save();
    }
}
