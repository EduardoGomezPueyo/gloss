import { useLayoutEffect, useRef } from 'react';

/**
 * Background pill that slides to the active item of a toggle group.
 * Render it as the first child of a `relative` group whose items are `relative`
 * and carry Radix's `data-state="on"`. `value` re-measures on every change.
 */
export function SlidingPill({ value, className = '' }: { value: string; className?: string }) {
  const pillRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const pill = pillRef.current;
    const group = pill?.parentElement;
    if (!pill || !group) return;

    const place = () => {
      const active = group.querySelector<HTMLElement>('[data-state="on"]');
      pill.style.opacity = active ? '1' : '0';
      if (!active) return;
      pill.style.width = `${active.offsetWidth}px`;
      pill.style.transform = `translateX(${active.offsetLeft}px)`;
    };
    place();
    // Animate only after the first placement, so the pill doesn't slide in on mount.
    const frame = requestAnimationFrame(() => (pill.dataset.ready = ''));
    // Labels change width with the interface language.
    const observer = new ResizeObserver(place);
    observer.observe(group);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [value]);

  return (
    <span
      ref={pillRef}
      aria-hidden
      className={`pointer-events-none absolute top-0.5 bottom-0.5 left-0 rounded-full bg-fill-subtle opacity-0 motion-safe:data-ready:transition-[transform,width] motion-safe:data-ready:duration-200 motion-safe:data-ready:ease-out ${className}`}
    />
  );
}
