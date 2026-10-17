import type { App } from '../ui/App.ts';
import { el, button, money, safeLink } from '../ui/dom.ts';
import { attribution } from '../ui/attribution.ts';
import { radiusMiles } from '../domain/Radius.ts';
export function resultView(app: App): HTMLElement {
    const result = app.result!;
    const { restaurant: r, meal, preferences: p } = result;
    const metadata = [r.cuisines.join(' / '), r.priceLevel ? '$'.repeat(r.priceLevel) : '', r.distanceMeters !== undefined ? `${(r.distanceMeters / 1609.344).toFixed(1)} mi away` : '', r.isOpen === undefined ? 'Hours unknown' : `${r.isOpen ? 'Open' : 'Closed'}${r.isDemo ? ' (sample)' : ''}`].filter(Boolean);
    const favorite = app.preferences.restaurant(r.id).favorite;
    const favoriteButton = button(favorite ? '♥  Favorited' : '♡  Favorite this spot', () => { app.preferences.updateRestaurant(r.id, { favorite: !favorite }); app.render(); }, 'text-button');
    favoriteButton.setAttribute('aria-pressed', String(favorite));
    favoriteButton.setAttribute('data-focus', 'favorite-restaurant');
    const header = el('section', { className: 'restaurant-intro' }, button('← Edit the basics', () => app.navigate('feed'), 'text-button back-button'), el('p', { className: 'eyebrow' }, 'DECISION MADE. WE’RE EATING AT'), el('h1', {}, r.name), el('p', { className: 'restaurant-meta' }, metadata.join(' · ')), r.rating !== undefined ? el('p', { className: 'rating' }, `★ ${r.rating.toFixed(1)}`, r.reviewCount ? el('span', {}, ` / 5 · ${r.reviewCount} ${r.isDemo ? 'sample ' : ''}reviews`) : null) : null, el('p', { className: 'address' }, r.address ?? 'Address unavailable'), r.isDemo ? el('p', { className: 'sample-note' }, 'Fictional demo restaurant · Sample prices, ratings, and distance') : null, favoriteButton, el('p', { className: 'result-context' }, `${p.location.label} · ${p.people} ${p.people === 1 ? 'person' : 'people'} · ${money(Math.round(p.budget * 100))} party budget`));
    header.append(attribution(r) ?? el('span'));
    if (r.checkedAt)
        header.append(el('p', { className: 'sample-note' }, `Hours checked ${new Date(r.checkedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Confirm availability before you go.`));
    header.append(el('p', { className: 'sample-note' }, `${radiusMiles(p.maxDistanceMeters)}-mile straight-line radius · ${p.openNow ? 'Confirmed open only' : 'Unknown hours allowed'}`));
    const order = el('section', { className: 'order-receipt', 'aria-labelledby': 'order-title' }, el('div', { className: 'receipt-heading' }, el('h2', { id: 'order-title' }, meal ? 'HERE’S YOUR ORDER.' : 'THE SPOT IS SORTED.'), el('span', { 'aria-hidden': true }, '✳')), el('p', { className: 'receipt-caption' }, `FOR ${p.people === 1 ? 'ONE HUNGRY HUMAN' : `${p.people} HUNGRY HUMANS`}`));
    if (meal) {
        const list = el('ul', { className: 'order-lines' });
        for (const line of meal.lines)
            list.append(el('li', {}, el('div', {}, el('span', { className: 'item-name' }, `${line.quantity} × ${line.item.name}`), line.item.description ? el('small', {}, line.item.description) : null), el('span', { className: 'item-price' }, money(Math.round(line.item.price * 100) * line.quantity))));
        const row = (name: string, value: number, className = '') => el('div', { className: `total-row ${className}` }, el('dt', {}, name), el('dd', {}, money(value)));
        order.append(list, el('dl', { className: 'totals' }, row('Food subtotal', meal.subtotalCents), row(`Budget buffer (${Math.round(p.bufferPercent * 100)}%)`, meal.bufferCents), row('Planned total', meal.totalCents, 'grand-total'), row('Party budget', meal.budgetCents), row('Left in your pocket', meal.budgetCents - meal.totalCents, 'remaining')), el('p', { className: 'receipt-disclaimer' }, 'Buffer is reserved from your total budget. Actual tax, tips, and prices can differ.'));
    }
    else {
        order.append(el('p', { className: 'fallback-copy' }, result.menuStatus === 'unaffordable' ? 'No complete order fits this budget here. Try a higher budget or another spot.' : 'We’ve picked the place. Detailed menu data isn’t available, so you get the final say on the order.'), el('p', {}, 'No priced order or total is estimated. Check the menu and prices before you go.'), el('p', { className: 'fallback-budget' }, `Your party budget: ${money(Math.round(p.budget * 100))}`));
    }
    const reroll = button('↻  Different order here', () => app.differentOrder(), 'button secondary');
    reroll.disabled = !meal;
    if (!meal)
        reroll.title = 'A detailed menu is needed to choose an order.';
    const accepted = app.history.isAccepted(result.id);
    const accept = button(accepted ? '✓  Saved to recent meals' : 'WE ATE HERE  ✓', () => app.accept(), 'button primary');
    accept.disabled = accepted;
    const directions = safeLink('Directions ↗', r.isDemo ? undefined : r.directionsUrl ?? (r.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.address)}` : undefined));
    if (directions)
        directions.addEventListener('click', () => app.history.record('directions', r.id));
    const menuLink = safeLink(r.menuUrl ? 'View menu ↗' : 'Website / Menu ↗', r.isDemo ? undefined : r.menuUrl ?? r.websiteUrl);
    if (menuLink)
        menuLink.addEventListener('click', () => app.history.record('menu', r.id));
    const actions = el('div', { className: 'result-actions' }, el('div', { className: 'reroll-actions' }, reroll, button('↻  Different restaurant', () => void app.differentRestaurant(), 'button dark')), el('div', { className: 'handoff-actions' }, directions ?? button('Directions ↗', () => app.directions()), menuLink ?? button('View menu ↗', () => app.menu())), accept, el('p', { className: 'form-note' }, 'Only “We ate here” adds a completed meal to your history.'), button('Skip this spot in future', () => app.excludeCurrent(), 'text-button muted'));
    return el('div', { className: 'result-page' }, el('div', { className: 'result-layout' }, header, el('div', { className: 'order-column' }, order, actions)));
}
