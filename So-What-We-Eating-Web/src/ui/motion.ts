/** Interruptible feedback; motion never blocks another action. */
export function animateFeedback(node: Element | null, kind: 'receipt' | 'name' | 'reroll' | 'stamp') {
    if (!node || !node.animate) return;
    node.getAnimations().forEach(animation => animation.cancel());
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const frames: Record<typeof kind, Keyframe[]> = {
        receipt: [{ opacity: 0.35, transform: 'translateY(-7px)' }, { opacity: 1, transform: 'translateY(0)' }],
        name: [{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }],
        reroll: [{ transform: 'rotate(-55deg)' }, { transform: 'rotate(0)' }],
        stamp: [{ transform: 'scale(1.035) rotate(-1deg)', opacity: 0.5 }, { transform: 'scale(1) rotate(0)', opacity: 1 }],
    };
    node.animate(frames[kind], { duration: kind === 'reroll' ? 180 : 220, easing: 'ease-out' });
}
