import type { Restaurant } from '../domain/Restaurant.ts';
import { el, safeLink } from './dom.ts';
export function attribution(restaurant: Restaurant): HTMLElement | null {
    if (restaurant.source !== 'google-places')
        return null;
    const base = new URL(import.meta.env.BASE_URL, document.baseURI);
    const node = el('div', { className: 'provider-attribution' }, el('img', { src: new URL('attribution/google-maps.svg', base).href, alt: 'Google Maps', height: 18 }));
    for (const credit of restaurant.attributions ?? []) {
        const link = safeLink(credit.name, credit.uri);
        if (link) {
            link.className = 'attribution-link';
            node.append(link);
        }
        else
            node.append(el('span', {}, credit.name));
    }
    return node;
}
