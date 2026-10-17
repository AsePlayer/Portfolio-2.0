import type { App } from '../ui/App.ts';
import { el, button, field, money, select } from '../ui/dom.ts';
import { plateIllustration } from '../ui/plate.ts';
import { CONFIG } from '../domain/config.ts';
import { RADII, milesToMeters } from '../domain/Radius.ts';
export function feedView(app: App): HTMLElement {
    const hero = el('section', { className: 'hero' }, el('p', { className: 'eyebrow' }, 'AN END TO THE “I DON’T KNOW.”'), el('h1', {}, 'SO, WHAT', el('br'), 'WE ', el('em', {}, 'EATING?')), el('p', { className: 'hero-copy' }, 'You bring the budget. We’ll pick the place, the order, and the menu prices to match.'), plateIllustration());
    const settings = app.settings.value;
    const location = el('input', { id: 'location', name: 'location', type: 'text', required: true, maxlength: 240, autocomplete: 'off', placeholder: 'City, ZIP, or address', value: app.browserLocation?.label ?? app.draftLocation });
    location.addEventListener('input', () => { app.browserLocation = undefined; app.draftLocation = location.value; });
    const locationButton = button(app.browserLocation ? '⌖  Current location ✓' : '⌖  Use my location', () => void app.locate(), 'text-button location-button');
    const budget = el('input', { id: 'budget', name: 'budget', type: 'number', required: true, min: CONFIG.minBudget, max: CONFIG.maxBudget, step: '0.01', inputmode: 'decimal', value: settings.budget });
    const people = el('input', { id: 'people', name: 'people', type: 'number', required: true, min: 1, max: 8, step: 1, inputmode: 'numeric', value: settings.people });
    const minus = button('−', () => { people.value = String(Math.max(1, Number(people.value) - 1)); updatePerPerson(); }, 'step-button');
    minus.setAttribute('aria-label', 'One fewer person');
    const plus = button('+', () => { people.value = String(Math.min(8, Number(people.value) + 1)); updatePerPerson(); }, 'step-button');
    plus.setAttribute('aria-label', 'One more person');
    const perPerson = el('p', { className: 'per-person', id: 'per-person' });
    function updatePerPerson() {
        const b = Number(budget.value), p = Number(people.value);
        perPerson.textContent = p >= 1 && p <= 8 && b > 0 ? `${money(Math.round(b * 100 / p))} per person on average · ${Math.round(settings.bufferPercent * 100)}% budget buffer` : 'The budget covers your whole party.';
        minus.disabled = p <= 1;
        plus.disabled = p >= 8;
    }
    budget.addEventListener('input', updatePerPerson);
    people.addEventListener('input', updatePerPerson);
    updatePerPerson();
    const radius = select('radius', RADII.map(m => [String(milesToMeters(m)), `${m} miles`]), String(settings.radiusMeters));
    radius.addEventListener('change', () => app.settings.update({ radiusMeters: Number(radius.value) }));
    const locationActions = el('div', { className: 'location-actions' }, locationButton);
    if (app.mode === 'demo')
        locationActions.append(button('Try Pasadena, CA ↗', () => { app.browserLocation = undefined; app.draftLocation = 'Pasadena, CA'; location.value = app.draftLocation; location.focus(); }, 'inline-link'));
    const submit = el('button', { type: 'submit', className: `button primary feed-button${app.busy ? ' is-working' : ''}` }, 'FEED ME', el('span', { className: 'button-icon', 'aria-hidden': true }, '↗'));
    const form = el('form', { className: 'feed-form' }, el('div', { className: 'form-heading' }, el('span', { className: 'eyebrow' }, 'YOUR APPETITE. OUR CALL.'), el('h2', {}, 'Let’s settle this.')), field('Where are we eating?', location, app.mode === 'demo' ? 'Explicit fictional demo: Pasadena, CA / 91101.' : 'Use your current location, or enter a city, ZIP, or address.'), locationActions, el('div', { className: 'form-row' }, el('div', { className: 'field' }, el('label', { for: 'budget' }, 'Party budget'), el('div', { className: 'money-input' }, el('span', { 'aria-hidden': true }, '$'), budget)), el('div', { className: 'field' }, el('label', { for: 'people' }, 'People'), el('div', { className: 'stepper' }, minus, people, plus))), perPerson, field('How far?', radius), submit, el('p', { className: 'form-note' }, 'Real items. Listed prices. Your whole party, within budget.'));
    form.addEventListener('submit', event => { event.preventDefault(); void app.feed(location.value, Number(budget.value), Number(people.value), Number(radius.value)); });
    if (app.mode === 'live' && !app.configured)
        form.append(el('p', { className: 'configuration-note' }, 'Live discovery isn’t connected yet. ', el('a', { href: '#about' }, 'About this app')));
    return el('div', { className: 'feed-page' }, el('div', { className: 'feed-layout' }, hero, form), el('div', { className: 'how-it-works' }, el('p', {}, el('span', {}, '01'), 'Tell us the basics.'), el('p', {}, el('span', {}, '02'), 'We make the call.'), el('p', {}, el('span', {}, '03'), 'You get to eat.')));
}
