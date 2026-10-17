type Child = Node | string | number | null | undefined | false;
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attributes: Record<string, string | number | boolean> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'className')
            node.className = String(value);
        else if (value !== false)
            node.setAttribute(key, value === true ? '' : String(value));
    }
    for (const child of children)
        if (child !== null && child !== undefined && child !== false)
            node.append(child instanceof Node ? child : String(child));
    return node;
}
export function button(label: string, action: () => void, className = 'button secondary'): HTMLButtonElement {
    const node = el('button', { type: 'button', className }, label);
    node.addEventListener('click', action);
    return node;
}
export const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100);
export const label = (text: string, id: string) => el('label', { for: id }, text);
export function field(text: string, input: HTMLElement, help?: string) {
    const wrapper = el('div', { className: 'field' }, label(text, input.id), input);
    if (help) {
        const id = `${input.id}-help`;
        input.setAttribute('aria-describedby', id);
        wrapper.append(el('small', { id }, help));
    }
    return wrapper;
}
export function select(id: string, options: [
    string,
    string
][], value: string): HTMLSelectElement {
    const node = el('select', { id, name: id });
    for (const [key, name] of options) {
        const option = el('option', { value: key }, name);
        option.selected = key === value;
        node.append(option);
    }
    return node;
}
export function safeLink(text: string, url?: string): HTMLAnchorElement | null {
    if (!url)
        return null;
    try {
        if (!['http:', 'https:'].includes(new URL(url).protocol))
            return null;
    }
    catch {
        return null;
    }
    return el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', className: 'button secondary' }, text);
}
