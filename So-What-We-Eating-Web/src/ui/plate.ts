export function plateIllustration(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'plate-art';
    wrapper.setAttribute('aria-hidden', 'true');
    // Original vector artwork; no remote image or font requests.
    wrapper.innerHTML = `<svg viewBox="0 0 440 210" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M33 43l5 64m7-65l5 63m6-66l5 64m-19 3l11 79M37 106q14 20 25-3M381 42q-20 33-4 63l10-1 10 80m-7-140l-3 60" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="220" cy="115" rx="136" ry="83" fill="#e9bc44" stroke="currentColor" stroke-width="3"/>
    <ellipse cx="220" cy="115" rx="111" ry="64" fill="#f9f5eb" stroke="currentColor" stroke-width="2"/>
    <path d="M166 125q-18-30 9-38 26-8 47 22t40 16q22-19-9-34t-48 20q-19 30 8 38t51-8M175 104q48-37 69 5t-38 20q-48-15-20-35m1 40q43 21 63-19" stroke="#d7492e" stroke-width="9" stroke-linecap="round"/>
    <path d="M230 80q-4-24 23-17-1 20-23 17m-42 71q-18-19-30-2 13 18 30 2" fill="#46664b" stroke="currentColor" stroke-width="2"/>
    <path d="M296 30l8-16m8 26l20-4M112 44l-17-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    <circle cx="224" cy="123" r="3" fill="currentColor"/><circle cx="191" cy="97" r="2" fill="currentColor"/>
  </svg><span class="art-note">a little less “you pick.”</span>`;
    return wrapper;
}
