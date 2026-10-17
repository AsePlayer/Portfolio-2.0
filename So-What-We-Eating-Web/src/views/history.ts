import type { App } from '../ui/App.ts';
import { el, money, button, safeLink } from '../ui/dom.ts';
import { attribution } from '../ui/attribution.ts';
export function historyView(app: App): HTMLElement {
    const page = el('section', { className: 'secondary-page' }, el('p', { className: 'eyebrow' }, 'THE GOOD CALLS'), el('h1', {}, 'Recent meals.'), el('p', { className: 'page-intro' }, 'The places, items, and listed prices from meals you marked as eaten. Saved on this browser.'));
    if (!app.history.meals.length)
        page.append(el('div', { className: 'empty-state' }, el('span', { className: 'empty-mark', 'aria-hidden': true }, '✳'), el('h2', {}, 'A clean plate.'), el('p', {}, 'Your first meal is one decision away.'), button('LET’S EAT ↗', () => app.navigate('feed'), 'button primary')));
    else {
        const list = el('ol', { className: 'history-list' });
        for (const meal of app.history.meals) {
            const live = ['google-places', 'openstreetmap'].includes(meal.provider ?? '');
            const fresh = live ? app.restaurants.find(r => r.id === meal.restaurantId) : undefined;
            const favorite = app.preferences.restaurant(meal.restaurantId).favorite;
            const toggle = button(favorite ? '♥ Favorited' : '♡ Favorite', () => { app.preferences.updateRestaurant(meal.restaurantId, { favorite: !favorite }); app.render(); }, 'text-button');
            toggle.setAttribute('data-focus', `favorite-${meal.id}`);
            const description = el('div', { className: 'history-description' }, el('h2', {}, fresh?.name ?? meal.restaurantName ?? 'Saved restaurant'), el('p', {}, meal.order.length ? meal.order.join(' · ') : live ? 'Visit recorded · place ID saved' : 'Restaurant only · order not recorded'), el('small', {}, `${meal.people} ${meal.people === 1 ? 'person' : 'people'}${meal.isDemo ? ' · fictional demo meal' : ''}${meal.orderProvider === 'allmenus' ? ' · AllMenus listed prices' : ''}`));
            if (fresh)
                description.append(attribution(fresh)!);
            if (live)
                description.append(button('Refresh current details', () => void app.refreshPlace(meal.restaurantId), 'text-button'));
            list.append(el('li', {}, el('time', { datetime: meal.at }, new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(meal.at))), description, el('strong', {}, meal.totalCents === null ? 'Unpriced' : money(meal.totalCents)), toggle));
        }
        page.append(list);
    }
    return page;
}
