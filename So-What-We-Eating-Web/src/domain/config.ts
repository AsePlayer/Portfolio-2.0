export const CONFIG = {
    defaultBudget: 35, minBudget: 5, maxBudget: 2000, maxPeople: 8,
    bufferPercent: 0.2, maxBufferPercent: 0.5, defaultRadiusMeters: 8047,
    historyLimit: 200, eventLimit: 600,
    repeatWindowMs: 7 * 86400000, rejectionWindowMs: 2 * 86400000,
    repeatPenalty: 3, rejectionPenalty: 2, favoriteBonus: 3,
} as const;
