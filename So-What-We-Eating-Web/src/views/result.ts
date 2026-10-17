import type { App } from '../ui/App.ts';
import { el, button, money, safeLink } from '../ui/dom.ts';
import { attribution } from '../ui/attribution.ts';
import { radiusMiles } from '../domain/Radius.ts';
import type { PricedMealRecommendation } from '../domain/MealRecommendation.ts';
import { brandMark } from '../ui/brand.ts';
import { distinctAnchorPicks } from '../recommendation/MealBuilder.ts';

export function receiptView(result: PricedMealRecommendation): HTMLElement {
    const { meal, preferences: p } = result;
    const distinct = distinctAnchorPicks(meal.lines);
    const order = el('section', { className: 'order-receipt', 'aria-labelledby': 'order-title' },
        el('div', { className: 'receipt-heading' }, el('h2', { id: 'order-title' }, 'HERE’S YOUR ORDER.'), brandMark()),
        el('p', { className: 'receipt-caption' }, p.people === 1 ? 'FOR ONE HUNGRY HUMAN' : `FEEDING ${p.people} · ${distinct} DIFFERENT ${distinct === 1 ? 'PICK' : 'PICKS'}`));
    const list = el('ul', { className: 'order-lines' });
    for (const line of meal.lines)
        list.append(el('li', {}, el('div', {}, el('span', { className: 'item-name' }, `${line.quantity} × ${line.item.name}`), line.quantity > 1 ? el('small', {}, `${money(Math.round(line.item.price * 100))} each`) : null), el('span', { className: 'item-price' }, money(Math.round(line.item.price * 100) * line.quantity))));
    const row = (name: string, value: number, className = '') => el('div', { className: `total-row ${className}` }, el('dt', {}, name), el('dd', {}, money(value)));
    order.append(list, el('dl', { className: 'totals' }, row('Food subtotal', meal.subtotalCents), row(`Budget buffer (${Math.round(p.bufferPercent * 100)}%)`, meal.bufferCents), row('Planned total', meal.totalCents, 'grand-total'), row('Party budget', meal.budgetCents), row('Left in your pocket', meal.budgetCents - meal.totalCents, 'remaining')), el('p', { className: 'receipt-disclaimer' }, 'Item prices come from the linked menu. Your buffer is reserved separately; final tax, tips, and restaurant prices can differ.'));
    if (result.menu.provider === 'allmenus') {
        order.append(el('div', { className: 'provider-attribution' }, safeLink('Menu & listed prices: AllMenus ↗', result.menu.sourceUrl)),
            el('p', { className: 'sample-note' }, `Listed menu prices retrieved at ${new Date(result.menu.retrievedAt ?? result.menu.updatedAt).toLocaleString()}. Restaurant pricing may differ. Tax and tip are not included in item prices.`));
    }
    return order;
}

export function acceptButton(app: App): HTMLButtonElement {
    const accepted = app.history.isAccepted(app.result!.id);
    const accept = button(accepted ? '✓ Saved to recent meals' : 'WE ATE HERE  ✓', () => app.accept(), `button primary accept-meal${accepted ? ' is-accepted' : ''}`);
    accept.disabled = accepted;
    return accept;
}
export function resultView(app: App): HTMLElement {
    const result = app.result!;
    const { restaurant: r, preferences: p } = result;
    const metadata = [r.cuisines.join(' / '), r.priceLevel ? '$'.repeat(r.priceLevel) : '', r.distanceMeters !== undefined ? `${(r.distanceMeters / 1609.344).toFixed(1)} mi away` : ''].filter(Boolean);
    const favorite = app.preferences.restaurant(r.id).favorite;
    const favoriteButton = button(favorite ? '♥  Favorited' : '♡  Favorite this spot', () => { app.preferences.updateRestaurant(r.id, { favorite: !favorite }); app.render(); }, 'text-button');
    favoriteButton.setAttribute('aria-pressed', String(favorite));
    favoriteButton.setAttribute('data-focus', 'favorite-restaurant');
    const header = el('section', { className: 'restaurant-intro' }, button('← Edit the basics', () => app.navigate('feed'), 'text-button back-button'), el('p', { className: 'eyebrow' }, 'DECISION MADE. WE’RE EATING AT'), el('h1', {}, r.name), el('p', { className: 'restaurant-meta' }, metadata.join(' · ')), r.rating !== undefined ? el('p', { className: 'rating' }, `★ ${r.rating.toFixed(1)}`, r.reviewCount ? el('span', {}, ` / 5 · ${r.reviewCount} ${r.isDemo ? 'sample ' : ''}reviews`) : null) : null, el('p', { className: 'address' }, r.address ?? 'Address unavailable'), r.isDemo ? el('p', { className: 'sample-note' }, 'Fictional demo restaurant · Sample prices, ratings, and distance') : null, favoriteButton, el('p', { className: 'result-context' }, `${p.location.label} · ${p.people} ${p.people === 1 ? 'person' : 'people'} · ${money(Math.round(p.budget * 100))} party budget`));
    if (r.source !== 'allmenus' || result.menu.provider !== 'allmenus') header.append(attribution(r) ?? el('span'));
    if (r.checkedAt)
        header.append(el('p', { className: 'sample-note' }, `Details retrieved ${new Date(r.checkedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Confirm availability before you go.`));
    header.append(el('p', { className: 'sample-note' }, `${radiusMiles(p.maxDistanceMeters)}-mile straight-line radius`));
    const reroll = button('', () => app.differentOrder(), 'button secondary order-reroll');
    reroll.append(el('span', { className: 'reroll-icon', 'aria-hidden': true }, '↻'), 'Different order here');
    const decisions = el('section', { className: 'decision-controls', 'aria-label': 'Choose your order' },
        el('div', { className: 'reroll-actions' }, reroll, button('Different restaurant', () => void app.differentRestaurant(), 'button dark')),
        el('p', { className: 'decision-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': true }, 'Same spot, new order. Or try somewhere else.'));
    const directions = safeLink('Directions ↗', r.isDemo ? undefined : r.directionsUrl ?? (r.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.address)}` : undefined));
    if (directions)
        directions.addEventListener('click', () => app.history.record('directions', r.id));
    const sourceMenu = result.menu.sourceUrl ?? r.menuUrl;
    const menuLink = safeLink(sourceMenu ? 'View menu ↗' : 'Website / Menu ↗', r.isDemo ? undefined : sourceMenu ?? r.websiteUrl);
    if (menuLink)
        menuLink.addEventListener('click', () => app.history.record('menu', r.id));
    const actions = el('div', { className: 'result-actions' }, el('div', { className: 'handoff-actions' }, directions ?? button('Directions ↗', () => app.directions()), menuLink ?? button('View menu ↗', () => app.menu())), acceptButton(app), el('p', { className: 'form-note' }, 'Only “We ate here” adds a completed meal to your history.'), button('Skip this spot in future', () => app.excludeCurrent(), 'text-button muted'));
    return el('div', { className: 'result-page' }, el('div', { className: 'result-layout' }, header, el('div', { className: 'order-column' }, decisions, el('div', { className: 'receipt-stage' }, receiptView(result)), actions)));
}
