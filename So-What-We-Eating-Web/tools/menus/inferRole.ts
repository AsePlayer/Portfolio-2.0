import type { MenuItemRole } from '../../src/domain/MenuItem.ts';
export function inferRole(name: string, category = ''): MenuItemRole {
    const input = `${category} ${name}`.toLowerCase();
    if (/^(?:add|extra|substitute|upgrade|make it)\s/i.test(name)) return 'other';
    if (/\b(extras?|add[ -]?ons?|toppings?|dressings?|sauces?|condiments?)\b/i.test(category)) return 'other';
    if (/\b(beverages?|drinks?|soft drinks)\b/i.test(category)) return 'drink';
    if (/\b(desserts?|sweets?)\b/i.test(category)) return 'dessert';
    if (/\b(sides?|side orders)\b/i.test(category)) return 'side';
    if (/\b(appetizers?|starters?|share it)\b/i.test(category)) return 'appetizer';
    if (/\b(combo|meal deal)\b/.test(input)) return 'combo';
    if (/\b(sharing|family|whole pizza|platter for)\b/.test(input)) return 'shared';
    if (/^(?:side of |french fries$|fries$|steamed rice$|white rice$|brown rice$)/i.test(name)) return 'side';
    if (/\b(cheeseburgers?|burgers?|sandwiches|sandwich|entrees?|entrées?|pizzas?|pastas?|tacos?|burritos?|noodles?|ramen|steaks?|fried rice|pad thai|pho|quesadillas?|enchiladas?|omelettes?|omelets?|pancakes?|wraps?|gyros?)\b/.test(input)) return 'main';
    if (/\b(salads?|greens|seafood|beef|pork|poultry|chicken entrees)\b/i.test(category)) return 'main';
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
