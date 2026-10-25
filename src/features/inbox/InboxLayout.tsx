import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { ContentItem, LanguageCode, Project, Section } from '@/domain/types';
import { ExternalLinkIcon } from '@/ui/icons';

/*
 * The inbox pages (DECISIONS D43): Comments, Assigned to me and Notifications. A
 * list on the left, newest first; the selected entry with its image on the right.
 */

export function InboxLayout({
  title,
  aside,
  filters,
  list,
  detail,
}: {
  title: string;
  /** Next to the title, e.g. a count. */
  aside?: ReactNode;
  filters?: ReactNode;
  list: ReactNode;
  detail: ReactNode;
}) {
  const headingId = useId();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
      <section
        aria-labelledby={headingId}
        className="flex min-h-0 shrink-0 flex-col gap-4 rounded-2xl bg-card p-5 lg:w-[400px] xl:w-[440px]"
      >
        <div className="flex items-center justify-between gap-3">
          <h1 id={headingId} className="font-heading text-[22px] leading-tight font-bold text-text">
            {title}
          </h1>
          {aside}
        </div>
        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
        <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2">{list}</div>
      </section>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto rounded-2xl bg-card p-5">
        {detail}
      </section>
    </div>
  );
}

/** One entry of the list; `selected` is the one shown on the right. */
export function InboxEntry({
  selected,
  unread,
  onSelect,
  avatar,
  title,
  meta,
  excerpt,
  context,
}: {
  selected: boolean;
  unread?: boolean;
  onSelect: () => void;
  avatar?: ReactNode;
  title: ReactNode;
  /** Right of the title, e.g. the time. */
  meta?: ReactNode;
  excerpt?: ReactNode;
  /** Last line, e.g. "Project · Item". */
  context?: ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected || undefined}
        className={`flex w-full gap-3 rounded-xl px-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-strong ${
          selected ? 'bg-fill-subtle' : 'hover:bg-fill-subtle/60'
        }`}
      >
        <span className="relative shrink-0 pt-0.5">
          {avatar}
          {unread && (
            <span aria-hidden className="absolute -top-0.5 -left-1 size-2 rounded-full bg-accent" />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-baseline justify-between gap-3">
            <span
              className={`truncate text-sm ${unread ? 'font-bold' : 'font-semibold'} text-text`}
            >
              {title}
            </span>
            {meta && <span className="shrink-0 text-xs text-text-secondary">{meta}</span>}
          </span>
          {excerpt && <span className="truncate text-sm text-text-secondary">{excerpt}</span>}
          {context && <span className="truncate text-xs text-text-tertiary">{context}</span>}
        </span>
      </button>
    </li>
  );
}

/** "Project › Section › Item" with "Open in editor", above the entry's content. */
export function InboxContext({
  project,
  section,
  item,
  imagePosition,
  language,
}: {
  project: Project;
  section: Section;
  item: ContentItem;
  /** 1-based position of the image in its item, so the editor opens on it. */
  imagePosition?: number;
  language?: LanguageCode | null;
}) {
  const { t } = useTranslation();
  const params = new URLSearchParams();
  if (imagePosition) params.set('image', String(imagePosition));
  if (language) params.set('lang', language);
  const query = params.toString();
  const crumb =
    'truncate rounded-sm outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong';

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
      <nav aria-label={t('inbox.location')} className="min-w-0">
        <ol className="flex min-w-0 items-center gap-2 text-text-secondary">
          <li className="min-w-0">
            <Link to={`/projects/${project.id}`} className={crumb}>
              {project.name}
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li className="min-w-0">
            <Link to={`/projects/${project.id}/sections/${section.id}`} className={crumb}>
              {section.name}
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li className="min-w-0 truncate font-semibold text-text">{item.name}</li>
        </ol>
      </nav>
      <Link
        to={`/projects/${project.id}/items/${item.id}${query ? `?${query}` : ''}`}
        className="flex shrink-0 items-center gap-1.5 rounded-md font-semibold text-accent-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-strong"
      >
        {t('inbox.openInEditor')}
        <ExternalLinkIcon className="size-3.5" />
      </Link>
    </div>
  );
}

/** Shown on the right when nothing is selected or the list is empty. */
export function InboxEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-text-tertiary">
      {children}
    </div>
  );
}
