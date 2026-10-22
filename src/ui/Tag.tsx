import type { ReactNode } from 'react';

/** Free tag of a glossary entry (Figma: grey rounded chip). */
export function Tag({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-tag-border bg-tag-bg px-3 py-1.5 font-heading text-xs leading-none font-semibold whitespace-nowrap text-text ${className}`}
    >
      {children}
    </span>
  );
}
