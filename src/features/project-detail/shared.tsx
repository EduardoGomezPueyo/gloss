import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

/** Rounded label with an icon (Figma: status and "% translated" pills, priority badge). */
export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-tag-bg px-3 py-1.5 font-heading text-sm leading-none font-semibold whitespace-nowrap text-text">
      {children}
    </span>
  );
}

/**
 * Two-column grid of the detail pages: main cards on the left, Glossary and
 * Languages Progress on the right. Cells are given in reading order, so each row
 * keeps the same height on both sides; on narrow screens they stack.
 */
export function DetailGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_356px] [&>*]:min-w-0">{children}</div>
  );
}

/** Loading, error and "not found" states shared by the project pages. */
export function PageMessage({ children, role }: { children: ReactNode; role?: 'alert' }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <p role={role} className="text-sm text-text-secondary">
        {children}
      </p>
      <Link to="/projects" className="w-fit text-sm text-text-secondary underline hover:text-text">
        {t('notFound.back')}
      </Link>
    </div>
  );
}
