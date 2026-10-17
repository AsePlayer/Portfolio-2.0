import { readFile, readdir, writeFile } from 'node:fs/promises';
import { assertMenu, assertRestaurants } from '../../src/catalog/validate.ts';
import { ManualJsonImporter } from './normalize.ts';
const [command = 'validate', input, output] = process.argv.slice(2);
if (command === 'validate') {
    const restaurants: unknown = JSON.parse(await readFile('content/restaurants/fixtures.json', 'utf8'));
    assertRestaurants(restaurants);
    const index = JSON.parse(await readFile('content/menus/index.json', 'utf8'));
    const files = await readdir('content/menus/restaurants');
    if (index.schemaVersion !== 1 || !Array.isArray(index.menus) || new Set(index.menus).size !== index.menus.length)
        throw new Error('Invalid menu index.');
    if (files.filter(f => f.endsWith('.json')).length !== index.menus.length)
        throw new Error('Menu files and index disagree.');
    for (const id of index.menus) {
        if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id))
            throw new Error('Invalid menu index ID.');
        const menu: unknown = JSON.parse(await readFile(`content/menus/restaurants/${id}.json`, 'utf8'));
        assertMenu(menu);
        const restaurant = restaurants.find(r => r.id === id);
        if (!restaurant || menu.restaurantId !== id || menu.restaurantName !== restaurant.name)
            throw new Error(`Menu identity mismatch: ${id}`);
    }
    console.log(`Validated ${restaurants.length} restaurants and ${index.menus.length} menus.`);
}
else if (command === 'import' && input && output) {
    const menu = new ManualJsonImporter().import(JSON.parse(await readFile(input, 'utf8')));
    // Never overwrite a committed or last-known-good menu automatically.
    await writeFile(output, JSON.stringify(menu, null, 2) + '\n', { flag: 'wx' });
    console.log('Wrote a validated candidate. Review it before adding it to the catalog index.');
}
else
    throw new Error('Usage: node tools/menus/cli.ts validate | import input.json new-output.json');
