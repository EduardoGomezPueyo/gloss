import type { ReactNode } from 'react';

/** Page heading (Figma: Roboto Bold 24, Text/Primary). */
export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="font-heading text-2xl leading-normal font-bold text-text">{children}</h1>;
}
