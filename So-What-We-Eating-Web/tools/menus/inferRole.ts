import type { MenuItemRole } from '../../src/domain/MenuItem.ts';
export function inferRole(name: string, category = ''): MenuItemRole {
    const input = `${category} ${name}`.toLowerCase();
    const rules: [
        MenuItemRole,
        RegExp
    ][] = [
        ['combo', /\b(combo|meal deal)\b/], ['shared', /\b(sharing|family|whole pizza|platter for)\b/],
        ['drink', /\b(soda|tea|coffee|juice|drink|beverage|lemonade)\b/],
        ['dessert', /\b(dessert|cake|cookie|churro|ice cream|brownie|mochi)\b/],
        ['appetizer', /\b(appetizer|starter|gyoza|chips|garlic knots)\b/],
        ['side', /\b(side|fries|rice|beans|vegetable)\b/],
        ['main', /\b(burger|sandwich|entree|entrée|pizza|pasta|bowl|taco|burrito|plate|noodle|ramen|steak|chicken|seafood)\b/],
    ];
    // Specific meal names override incidental ingredients such as rice or beans.
    if (/\b(bowl|plate|sandwich|burrito)\b/.test(input) && !/\b(side|dessert|drink)\b/.test(category.toLowerCase()))
        return 'main';
    return rules.find(([, pattern]) => pattern.test(input))?.[0] ?? 'other';
}
