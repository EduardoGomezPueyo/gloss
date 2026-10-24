import { Link } from 'react-router';
import type { GlossaryEntry } from '@/domain/types';
import { Tag } from '@/ui/Tag';
import { glossaryPaths } from './format';

/** Glossary card (Figma component 274:52544): title, short description and tags. */
export function EntryCard({ projectId, entry }: { projectId: string; entry: GlossaryEntry }) {
  return (
    <article className="relative flex w-full flex-col rounded-2xl bg-card p-6 transition-colors hover:bg-row-hover has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-border-strong">
      <h3 className="font-heading text-xl font-bold text-text">
        {/* Stretched over the card: a click anywhere opens the entry. */}
        <Link
          to={glossaryPaths.entry(projectId, entry.id)}
          className="outline-none after:absolute after:inset-0 after:rounded-2xl"
        >
          {entry.title}
        </Link>
      </h3>
      <p className="mt-2 text-sm leading-[22px] text-text-tertiary">{entry.description}</p>
      {entry.tags.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {entry.tags.map((tag) => (
            <li key={tag}>
              <Tag>{tag}</Tag>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
