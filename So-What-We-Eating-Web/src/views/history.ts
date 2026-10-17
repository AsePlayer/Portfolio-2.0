import type { App } from '../ui/App.ts';
import { el, money, button } from '../ui/dom.ts';
export function historyView(app: App): HTMLElement {
    const page = el('section', { className: 'secondary-page' }, el('p', { className: 'eyebrow' }, 'THE GOOD CALLS'), el('h1', {}, 'Recent meals.'), el('p', { className: 'page-intro' }, 'A little history of “that hit the spot.” Only meals you marked as eaten show up here.'));
    if (!app.history.meals.length)
        page.append(el('div', { className: 'empty-state' }, el('span', { className: 'empty-mark', 'aria-hidden': true }, '✳'), el('h2', {}, 'A clean plate.'), el('p', {}, 'Your first meal is one decision away.'), button('LET’S EAT ↗', () => app.navigate('feed'), 'button primary')));
    else {
        const list = el('ol', { className: 'history-list' });
        for (const meal of app.history.meals) {
            const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(meal.at));
            const favorite = app.preferences.restaurant(meal.restaurantId).favorite;
            const toggle = button(favorite ? '♥ Favorited' : '♡ Favorite', () => { app.preferences.updateRestaurant(meal.restaurantId, { favorite: !favorite }); app.render(); }, 'text-button');
            toggle.setAttribute('data-focus', `favorite-${meal.id}`);
            list.append(el('li', {}, el('time', { datetime: meal.at }, date), el('div', { className: 'history-description' }, el('h2', {}, meal.restaurantName), el('p', {}, meal.order.length ? meal.order.join(' · ') : 'Restaurant only · order not recorded'), el('small', {}, `${meal.people} ${meal.people === 1 ? 'person' : 'people'}${meal.isDemo ? ' · fictional demo meal' : ''}`)), el('strong', {}, meal.totalCents === null ? 'Unpriced' : money(meal.totalCents)), toggle));
        }
        page.append(list);
    }
    return page;
}
