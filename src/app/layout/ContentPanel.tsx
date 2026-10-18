import type { ReactNode } from 'react';

/** Rounded surface that holds every page (Figma: "Content"). */
export function ContentPanel({ children }: { children: ReactNode }) {
  return (
    <main className="flex h-full min-w-0 flex-1 flex-col gap-6 overflow-auto rounded-3xl border border-border bg-surface p-6 shadow-[0_0_4px_0_rgb(0_0_0/0.05)]">
      {children}
    </main>
  );
}
