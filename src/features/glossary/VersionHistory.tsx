import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { GlossaryVersion, Member } from '@/domain/types';
import { glossaryPaths, useVersionDate } from './format';

/**
 * "Version history" (Figma 370:6480): the current version, then older ones with
 * date and author. Each older version opens Compare versions (DECISIONS D7).
 */
export function VersionHistory({
  projectId,
  entryId,
  versions,
  members,
}: {
  projectId: string;
  entryId: string;
  /** Newest first. */
  versions: GlossaryVersion[];
  members: Member[];
}) {
  const { t } = useTranslation();
  const formatDate = useVersionDate();
  const nameOf = (id: string | null) =>
    members.find((m) => m.id === id)?.name ?? t('glossary.history.someone');
  const [current, ...older] = versions;

  return (
    <nav aria-labelledby={`history-${entryId}`} className="flex flex-col gap-5">
      <h2
        id={`history-${entryId}`}
        className="font-heading text-base leading-7 font-semibold text-text"
      >
        {t('glossary.history.title')}
      </h2>
      {!current ? (
        <p className="text-sm text-text-tertiary">{t('glossary.history.noHistory')}</p>
      ) : (
        <ol className="relative flex flex-col gap-5 border-l border-text-tertiary/60 pl-5">
          <li className="relative">
            <span
              aria-hidden
              className="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-text"
            />
            <p className="text-xs font-semibold text-text">{t('glossary.history.current')}</p>
            <p className="text-xs text-text-tertiary">
              {formatDate(current.createdAt)} · {nameOf(current.createdBy)}
            </p>
          </li>
          {older.map((version) => {
            const date = formatDate(version.createdAt);
            return (
              <li key={version.id} className="relative">
                <span
                  aria-hidden
                  className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border border-text-tertiary bg-surface"
                />
                <Link
                  to={glossaryPaths.compare(projectId, entryId, version.id)}
                  aria-label={t('glossary.history.compare', { date })}
                  className="flex flex-col rounded-md outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-strong"
                >
                  <span className="text-xs font-semibold text-text">{date}</span>
                  <span className="text-xs text-text-tertiary">{nameOf(version.createdBy)}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}
