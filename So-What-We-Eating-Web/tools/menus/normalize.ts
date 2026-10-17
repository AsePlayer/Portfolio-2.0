import type { Menu } from '../../src/domain/Menu.ts';
import { assertMenu } from '../../src/catalog/validate.ts';
import { inferRole } from './inferRole.ts';
export interface MenuImporter {
    import(input: unknown): Menu;
}
export class ManualJsonImporter implements MenuImporter {
    import(input: unknown): Menu {
        const result = structuredClone(input) as Menu;
        if (result && Array.isArray(result.items)) {
            for (const item of result.items) {
                if (item && typeof item.name === 'string' && item.role === undefined)
                    item.role = inferRole(item.name, typeof item.category === 'string' ? item.category : '');
            }
        }
        assertMenu(result);
        return result;
    }
}
