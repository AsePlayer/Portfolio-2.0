import type { Menu } from '../domain/Menu.ts';
import type { MenuItem } from '../domain/MenuItem.ts';
import type { Meal, OrderLine } from '../domain/MealRecommendation.ts';
import type { SearchPreferences } from '../domain/SearchPreferences.ts';
import { budgetAllocation, cents, validatePreferences } from '../domain/Budget.ts';
import { assertMenu } from '../catalog/validate.ts';
import { weightedPick } from './random.ts';
import type { Random } from './random.ts';

export const PARTY_SIMULATIONS = 100;
const isAnchor = (item: MenuItem) => item.role === 'main' || item.role === 'combo' || item.role === 'shared' && item.serves !== undefined;
const capacity = (item: MenuItem) => item.role === 'shared' ? item.serves! : 1;
const pickName = (item: MenuItem) => item.name.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
export const distinctAnchorPicks = (lines: OrderLine[]) => new Set(lines.filter(line => isAnchor(line.item)).map(line => pickName(line.item))).size;

export function mealSignature(lines: OrderLine[]): string {
    return lines.map(l => `${l.item.id}:${l.quantity}`).sort().join('|');
}

/** One line per real menu item; quantities count actual selections. */
function compress(items: MenuItem[]): OrderLine[] {
    const lines = new Map<string, OrderLine>();
    for (const item of items) {
        const line = lines.get(item.id);
        if (line) line.quantity++;
        else lines.set(item.id, { item, quantity: 1 });
    }
    return [...lines.values()];
}

export function mealCandidates(menu: Menu, preferences: SearchPreferences, random: Random = Math.random): Meal[] {
    validatePreferences(preferences);
    assertMenu(menu);
    const allocation = budgetAllocation(preferences.budget, preferences.bufferPercent), people = preferences.people;
    const priced = menu.items.map(item => ({ item, cost: cents(item.price), key: pickName(item) }));
    const anchors = priced.filter(({ item, cost }) => isAnchor(item) && cost <= allocation.foodBudgetCents);
    // Reserve the cheapest viable completion, including only shared meals whose
    // serving metadata explicitly establishes their capacity.
    const minimum = [0];
    for (let diners = 1; diners <= people; diners++) {
        minimum[diners] = Infinity;
        for (const { item, cost } of anchors) minimum[diners] = Math.min(minimum[diners], cost + minimum[Math.max(0, diners - capacity(item))]);
    }
    if (minimum[people] > allocation.foodBudgetCents) return [];
    const meals = new Map<string, Meal>();
    const add = (items: MenuItem[]) => {
        const lines = compress(items), subtotalCents = lines.reduce((sum, line) => sum + cents(line.item.price) * line.quantity, 0);
        if (subtotalCents > allocation.foodBudgetCents) return;
        const signature = mealSignature(lines);
        meals.set(signature, { lines, signature, subtotalCents, ...allocation, totalCents: subtotalCents + allocation.bufferCents });
    };
    // Guaranteed feasible fallback, independent of luck or desired variety.
    const fallback: MenuItem[] = [];
    for (let left = people; left > 0;) {
        const pick = anchors.find(({ item, cost }) => cost + minimum[Math.max(0, left - capacity(item))] === minimum[left])!;
        fallback.push(pick.item);
        left = Math.max(0, left - capacity(pick.item));
    }
    add(fallback);

    for (let attempt = 0; attempt < PARTY_SIMULATIONS; attempt++) {
        const selected: MenuItem[] = [], counts = new Map<string, number>();
        let left = people, spent = 0, extraSlots = 0;
        while (left > 0) {
            const viable = anchors.filter(({ item, cost }) => spent + cost + minimum[Math.max(0, left - capacity(item))] <= allocation.foodBudgetCents);
            const choices = viable.map(value => {
                const used = counts.get(value.key) ?? 0;
                return { value, weight: (used ? 1 / (used * used) : 5) * (value.item.role === 'shared' ? 0.7 : 1) };
            });
            // Rotate the first anchor across bounded attempts. Remaining diners
            // use novelty-weighted sampling; even a constant test RNG explores.
            const unused = choices.filter(c => !counts.has(c.value.key));
            const used = choices.filter(c => counts.has(c.value.key));
            const pick = selected.length === 0 && attempt < viable.length ? viable[attempt] : weightedPick([...unused, ...used], random);
            selected.push(pick.item);
            counts.set(pick.key, (counts.get(pick.key) ?? 0) + 1);
            if (pick.item.role !== 'combo') extraSlots += Math.min(left, capacity(pick.item));
            spent += pick.cost;
            left = Math.max(0, left - capacity(pick.item));
        }
        add(selected);
        // Everyone is fed before extras spend anything. Table food is one listed
        // unit, never an inferred serving count. Combos get no side/drink slots.
        if (attempt % 4 === 0) continue;
        const extras = [...selected];
        const supplement = (roles: string[], chance: number, excluded = new Set<string>()) => {
            if (random() >= chance) return;
            const options = priced.filter(({ item, cost }) => roles.includes(item.role) && cost + spent <= allocation.foodBudgetCents && !excluded.has(item.id));
            if (!options.length) return;
            const pick = weightedPick(options.map(value => ({ value, weight: 1 })), random);
            extras.push(pick.item);
            spent += pick.cost;
            excluded.add(pick.item.id);
        };
        if (attempt === 1) {
            // A tiny menu still gets a real alternative even when stochastic
            // extra choices happen to skip every optional item.
            supplement(extraSlots ? ['side', 'drink', 'appetizer', 'dessert'] : ['appetizer', 'dessert'], 1);
            add(extras);
            continue;
        }
        supplement(['appetizer'], 0.4);
        const sideIds = new Set<string>();
        for (let diner = 0; diner < Math.min(extraSlots, people > 3 ? 2 : 1); diner++) supplement(['side'], 0.55, sideIds);
        for (let diner = 0; diner < extraSlots; diner++) supplement(['drink'], 0.55);
        supplement(['dessert'], 0.2);
        add(extras);
    }
    return [...meals.values()];
}

function quality(meal: Meal, people: number): number {
    const distinct = distinctAnchorPicks(meal.lines);
    const extras = meal.lines.filter(line => !isAnchor(line.item));
    // Spending reward plateaus at 85%; no reward for awkward last-cent extras.
    return distinct / people * 8 + Math.min(1, meal.subtotalCents / Math.max(1, meal.foodBudgetCents * 0.85)) * 2
        + Math.min(1.5, extras.length * 0.5);
}

function previousAnchors(signature: string, menu: Menu): Map<string, number> {
    const anchors = new Map(menu.items.filter(isAnchor).map(item => [item.id, item]));
    const counts = new Map<string, number>();
    for (const part of signature.split('|')) {
        const split = part.lastIndexOf(':');
        const item = anchors.get(part.slice(0, split)), quantity = Number(part.slice(split + 1));
        if (item && Number.isInteger(quantity) && quantity > 0) counts.set(pickName(item), (counts.get(pickName(item)) ?? 0) + quantity * capacity(item));
    }
    return counts;
}

export function buildMeal(menu: Menu, preferences: SearchPreferences, random: Random = Math.random, previousSignature?: string): Meal | null {
    const all = mealCandidates(menu, preferences, random);
    if (!all.length) return null;
    const alternatives = all.filter(meal => meal.signature !== previousSignature);
    const choices = alternatives.length ? alternatives : all;
    const best = Math.max(...choices.map(meal => quality(meal, preferences.people)));
    let promising = choices.filter(meal => quality(meal, preferences.people) >= best - 2);
    if (previousSignature) {
        const previous = previousAnchors(previousSignature, menu);
        const overlap = (meal: Meal) => {
            const current = previousAnchors(meal.signature, menu);
            return [...current].reduce((sum, [name, quantity]) => sum + Math.min(quantity, previous.get(name) ?? 0), 0) / preferences.people;
        };
        const lowest = Math.min(...promising.map(overlap));
        promising = promising.filter(meal => overlap(meal) <= lowest + 0.15);
    }
    promising.sort((a, b) => quality(b, preferences.people) - quality(a, preferences.people));
    return weightedPick(promising.map(value => ({ value, weight: 1 + quality(value, preferences.people) })), random);
}
