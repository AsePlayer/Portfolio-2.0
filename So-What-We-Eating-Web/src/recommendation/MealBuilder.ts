import type { Menu } from '../domain/Menu.ts';
import type { Meal, OrderLine } from '../domain/MealRecommendation.ts';
import type { SearchPreferences } from '../domain/SearchPreferences.ts';
import { budgetAllocation, cents, validatePreferences } from '../domain/Budget.ts';
import { assertMenu } from '../catalog/validate.ts';
import { weightedPick } from './random.ts';
import type { Random } from './random.ts';
export function mealSignature(lines: OrderLine[]): string {
    return lines.map(l => `${l.item.id}:${l.quantity}`).sort().join('|');
}
export function mealCandidates(menu: Menu, preferences: SearchPreferences): Meal[] {
    validatePreferences(preferences);
    assertMenu(menu);
    const allocation = budgetAllocation(preferences.budget, preferences.bufferPercent);
    const people = preferences.people;
    const meals = new Map<string, Meal>();
    const add = (lines: OrderLine[]) => {
        const subtotalCents = lines.reduce((sum, line) => sum + cents(line.item.price) * line.quantity, 0);
        if (subtotalCents > allocation.foodBudgetCents)
            return;
        const signature = mealSignature(lines);
        meals.set(signature, { lines, signature, subtotalCents, ...allocation, totalCents: subtotalCents + allocation.bufferCents });
    };
    const anchors = menu.items.filter(i => ['main', 'combo', 'shared'].includes(i.role));
    for (const anchor of anchors) {
        const base = [{ item: anchor, quantity: Math.ceil(people / (anchor.role === 'shared' ? anchor.serves ?? 1 : 1)) }];
        add(base);
        // A combo already includes accompaniments. Never stack another main onto it.
        // Large real menus must not create millions of side/drink combinations on a phone.
        const extras = (role: string) => menu.items.filter(i => i.role === role).sort((a, b) => a.price - b.price).slice(0, 8);
        const sides = anchor.role === 'combo' ? [] : extras('side');
        const drinks = anchor.role === 'combo' ? [] : extras('drink');
        for (const side of sides) {
            const withSide = [...base, { item: side, quantity: people }];
            add(withSide);
            for (const drink of drinks)
                add([...withSide, { item: drink, quantity: people }]);
        }
        for (const drink of drinks)
            add([...base, { item: drink, quantity: people }]);
        // One starter per two diners; one dessert per diner. Extras are optional templates.
        for (const extra of [...extras('appetizer'), ...extras('dessert')]) {
            add([...base, { item: extra, quantity: extra.role === 'appetizer' ? Math.ceil(people / 2) : people }]);
        }
    }
    return [...meals.values()];
}
export function buildMeal(menu: Menu, preferences: SearchPreferences, random: Random = Math.random, previousSignature?: string): Meal | null {
    const all = mealCandidates(menu, preferences);
    const alternatives = all.filter(meal => meal.signature !== previousSignature);
    const choices = alternatives.length ? alternatives : all;
    if (!choices.length)
        return null;
    return weightedPick(choices.map(meal => ({ value: meal, weight: 1 + Math.min(1, meal.subtotalCents / Math.max(1, meal.foodBudgetCents)) * 2 + (meal.lines.some(l => l.item.role === 'side') ? 0.5 : 0) })), random);
}
