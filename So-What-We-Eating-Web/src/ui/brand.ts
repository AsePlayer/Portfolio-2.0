import { el } from './dom.ts';

/** Same original plate/question mark used by the favicon and install icons. */
export function brandMark(className = 'receipt-mark'): HTMLImageElement {
    return el('img', { className, src: new URL('icons/icon.svg', new URL(import.meta.env.BASE_URL, document.baseURI)).href,
        width: 32, height: 32, alt: '', 'aria-hidden': true });
}
