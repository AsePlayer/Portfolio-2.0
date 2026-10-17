import { CONFIG } from './config.ts';
import type { SearchPreferences } from './SearchPreferences.ts';
import { validRadius } from './Radius.ts';
export const cents = (dollars: number) => Math.round(dollars * 100);
export function budgetAllocation(budget: number, bufferPercent: number) {
    if (!Number.isFinite(budget) || budget < CONFIG.minBudget || budget > CONFIG.maxBudget)
        throw new Error(`Choose a party budget between $${CONFIG.minBudget} and $${CONFIG.maxBudget}.`);
    if (!Number.isFinite(bufferPercent) || bufferPercent < 0 || bufferPercent > CONFIG.maxBufferPercent)
        throw new Error('Choose a buffer between 0% and 50%.');
    const budgetCents = cents(budget);
    const bufferCents = Math.ceil(budgetCents * bufferPercent);
    return { budgetCents, bufferCents, foodBudgetCents: budgetCents - bufferCents };
}
export function validatePreferences(preferences: SearchPreferences) {
    if (!validRadius(preferences.maxDistanceMeters))
        throw new Error('Choose a supported distance.');
    budgetAllocation(preferences.budget, preferences.bufferPercent);
    if (!Number.isInteger(preferences.people) || preferences.people < 1 || preferences.people > CONFIG.maxPeople)
        throw new Error('Choose 1–8 people. The budget covers everyone.');
}
