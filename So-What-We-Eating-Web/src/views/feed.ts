import type { App } from '../ui/App.ts';
import { el, button, field, money } from '../ui/dom.ts';
import { plateIllustration } from '../ui/plate.ts';
import { CONFIG } from '../domain/config.ts';
export function feedView(app: App): HTMLElement {
    const hero = el('section', { className: 'hero' }, el('p', { className: 'eyebrow' }, 'AN END TO THE “I DON’T KNOW.”'), el('h1', {}, 'SO, WHAT', el('br'), 'WE ', el('em', {}, 'EATING?')), el('p', { className: 'hero-copy' }, 'You bring the appetite. We’ll pick the spot — and tell you what to order.'), plateIllustration());
    const settings = app.settings.value;
    const location = el('input', { id: 'location', name: 'location', type: 'text', required: true, maxlength: 120, autocomplete: 'off', placeholder: 'City or ZIP code', value: app.browserLocation?.label ?? settings.locationLabel });
    location.addEventListener('input', () => { app.browserLocation = undefined; });
    const locationButton = button('⌖  Use my location', () => void app.locate(), 'text-button location-button');
    const budget = el('input', { id: 'budget', name: 'budget', type: 'number', required: true, min: CONFIG.minBudget, max: CONFIG.maxBudget, step: '0.01', inputmode: 'decimal', value: settings.budget });
    const budgetWrap = el('div', { className: 'money-input' }, el('span', { 'aria-hidden': true }, '$'), budget);
    const people = el('input', { id: 'people', name: 'people', type: 'number', required: true, min: 1, max: CONFIG.maxPeople, step: 1, inputmode: 'numeric', value: settings.people });
    const minus = button('−', () => { people.value = String(Math.max(1, Number(people.value) - 1)); updatePerPerson(); }, 'step-button');
    minus.setAttribute('aria-label', 'One fewer person');
    const plus = button('+', () => { people.value = String(Math.min(CONFIG.maxPeople, Number(people.value) + 1)); updatePerPerson(); }, 'step-button');
    plus.setAttribute('aria-label', 'One more person');
    const perPerson = el('p', { className: 'per-person', id: 'per-person' });
    function updatePerPerson() {
        const b = Number(budget.value), p = Number(people.value);
        perPerson.textContent = p >= 1 && p <= 8 && b > 0 ? `${money(Math.round(b * 100 / p))} per person · ${Math.round(settings.bufferPercent * 100)}% reserved as a budget buffer` : 'The budget covers your whole party.';
        minus.disabled = p <= 1;
        plus.disabled = p >= 8;
    }
    budget.addEventListener('input', updatePerPerson);
    people.addEventListener('input', updatePerPerson);
    updatePerPerson();
    const submit = el('button', { type: 'submit', className: 'button primary feed-button' }, app.busy ? 'CONSULTING THE STOMACH…' : 'FEED ME', el('span', { 'aria-hidden': true }, '↗'));
    const budgetField = el('div', { className: 'field' }, el('label', { for: 'budget' }, 'Party budget'), budgetWrap);
    const peopleField = el('div', { className: 'field' }, el('label', { for: 'people' }, 'People'), el('div', { className: 'stepper' }, minus, people, plus));
    const demo = button('Try Pasadena, CA ↗', () => { app.browserLocation = undefined; location.value = 'Pasadena, CA'; location.focus(); }, 'inline-link');
    const form = el('form', { className: 'feed-form' }, el('div', { className: 'form-heading' }, el('span', { className: 'eyebrow' }, 'THREE DETAILS. ONE DECISION.'), el('h2', {}, 'Let’s settle this.')), field('Where are we eating?', location, 'Demo coverage: Pasadena, CA / 91101. All restaurants are fictional.'), el('div', { className: 'location-actions' }, locationButton, demo), el('div', { className: 'form-row' }, budgetField, peopleField), perPerson, submit, el('p', { className: 'form-note' }, 'One spot. A sensible order. Zero group-chat debates.'));
    form.addEventListener('submit', event => { event.preventDefault(); void app.feed(location.value, Number(budget.value), Number(people.value)); });
    return el('div', { className: 'feed-page' }, el('div', { className: 'feed-layout' }, hero, form), el('div', { className: 'how-it-works' }, el('p', {}, el('span', {}, '01'), 'Tell us the basics.'), el('p', {}, el('span', {}, '02'), 'We make the call.'), el('p', {}, el('span', {}, '03'), 'You get to eat.')));
}
