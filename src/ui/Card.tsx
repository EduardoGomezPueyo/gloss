import type { ReactNode } from 'react';

/** Rounded card of the detail pages (Overview, Section Progress, Glossary…). */
export function Card({
  children,
  className = '',
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  /** Id of the card's heading; the card becomes a labelled region. */
  labelledBy?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={`flex min-w-0 flex-col gap-6 rounded-2xl bg-card p-6 ${className}`}
    >
      {children}
    </section>
  );
}

/** Card heading (Figma: Roboto Bold 18). */
export function CardTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="font-heading text-lg leading-tight font-bold text-text">
      {children}
    </h2>
  );
}
