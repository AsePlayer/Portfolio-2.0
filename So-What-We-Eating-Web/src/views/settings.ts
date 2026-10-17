import type { App } from '../ui/App.ts';
import { el, button, field, select } from '../ui/dom.ts';
import type { Adventure, DiningMode } from '../domain/SearchPreferences.ts';
export function settingsView(app: App): HTMLElement {
    const s = app.settings.value;
    const adventure = select('adventure', [['familiar', 'Mostly familiar'], ['balanced', 'A little of both'], ['surprise', 'Surprise me']], s.adventure);
    const mode = select('dining-mode', [['unknown', 'No preference'], ['dine-in', 'Dine in'], ['takeout', 'Takeout']], s.diningMode);
    const buffer = el('input', { id: 'buffer', type: 'number', min: 0, max: 50, required: true, step: 1, value: Math.round(s.bufferPercent * 100) });
    const form = el('form', { className: 'preferences-form' }, field('How adventurous?', adventure), field('Eating how?', mode, 'Saved for recommendations; the demo has no service-mode availability data.'), field('Budget buffer (%)', buffer, 'Reserved from the whole party budget. Covers an allowance for extras, tax, or tips.'), el('button', { type: 'submit', className: 'button primary' }, 'Save preferences'));
    form.addEventListener('submit', event => { event.preventDefault(); app.settings.update({ adventure: adventure.value as Adventure, diningMode: mode.value as DiningMode, bufferPercent: Number(buffer.value) / 100 }); app.notice('Preferences saved. They apply to your next restaurant pick.'); });
    const page = el('section', { className: 'secondary-page' }, el('p', { className: 'eyebrow' }, 'A LITTLE MORE YOU'), el('h1', {}, 'Your taste.'), el('p', { className: 'page-intro' }, 'Good defaults up front. The finer details live here.'), form);
    const cuisines = el('div', { className: 'cuisine-preferences' }, el('h2', {}, 'Cuisines'));
    for (const cuisine of [...new Set(app.restaurants.flatMap(r => r.cuisines))].sort()) {
        const current = app.preferences.value.avoidedCuisines.includes(cuisine) ? 'avoid' : app.preferences.value.favoriteCuisines.includes(cuisine) ? 'favorite' : 'neutral';
        const input = select(`cuisine-${cuisine.replaceAll(' ', '-')}`, [['neutral', 'Open to it'], ['favorite', 'Love it'], ['avoid', 'Skip it']], current);
        input.addEventListener('change', () => { app.preferences.setCuisine(cuisine, input.value as 'neutral' | 'favorite' | 'avoid'); app.notice('Taste updated.'); });
        cuisines.append(field(cuisine, input));
    }
    page.append(cuisines);
    const excluded = app.preferences.value.restaurants.filter(r => r.excluded);
    page.append(el('h2', {}, 'Skipped restaurants'));
    if (!excluded.length)
        page.append(el('p', {}, 'Nothing off the table. Skip a spot from its recommendation.'));
    for (const pref of excluded)
        page.append(el('div', { className: 'preference-row' }, app.restaurants.find(r => r.id === pref.restaurantId)?.name ?? pref.restaurantId, button('Bring it back', () => { app.preferences.updateRestaurant(pref.restaurantId, { excluded: false }); app.render(); }, 'text-button')));
    page.append(el('div', { className: 'privacy-settings' }, el('h2', {}, 'Your browser. Your data.'), el('p', {}, 'History, taste, and interaction signals stay on this device. Exact coordinates are never saved. No account or analytics.'), button('Clear my local data', () => app.confirmClear(), 'text-button danger')));
    return page;
}
