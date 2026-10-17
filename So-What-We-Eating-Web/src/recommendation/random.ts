export type Random = () => number;
export function weightedPick<T>(choices: {
    value: T;
    weight: number;
}[], random: Random): T {
    if (!choices.length)
        throw new Error('No choices available.');
    const total = choices.reduce((sum, c) => sum + c.weight, 0);
    let ticket = Math.max(0, Math.min(0.999999999, random())) * total;
    for (const choice of choices) {
        ticket -= choice.weight;
        if (ticket < 0)
            return choice.value;
    }
    return choices[choices.length - 1].value;
}
export function seededRandom(seed: number): Random {
    let state = seed >>> 0;
    return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
}
