import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { useGlossary, useGlossaryEntry, useRecordView } from '@/data/hooks';
import { largeTextButton } from '@/ui/buttons';
import { Tag } from '@/ui/Tag';
import { PageMessage } from '../project-detail/shared';
import { glossaryPaths } from './format';
import { Gallery } from './Gallery';
import { MarkdownView } from './MarkdownView';
import { useProjectAccess } from '@/app/projectAccess/ProjectAccessContext';

/** Glossary entry (Figma 370:6424, SPEC 5.5): gallery, tags and the rendered Markdown. */
export function EntryPage() {
  const { t } = useTranslation();
  const { canWork } = useProjectAccess();
  const { projectId = '', entryId = '' } = useParams();
  const entry = useGlossaryEntry(entryId);
  const glossary = useGlossary(projectId);
  const recordView = useRecordView();
  const { mutate: countView } = recordView;

  // One view per visit (the overview shows the most viewed entries). The ref keeps
  // React's development double-run of effects from counting twice.
  const counted = useRef<string | null>(null);
  useEffect(() => {
    if (!entryId || counted.current === entryId) return;
    counted.current = entryId;
    countView(entryId);
  }, [entryId, countView]);

  if (entry.isPending) return <p className="text-sm text-text-tertiary">{t('glossary.loading')}</p>;
  if (entry.isError) return <PageMessage role="alert">{t('data.loadError')}</PageMessage>;
  if (!entry.data || entry.data.projectId !== projectId) {
    return <PageMessage>{t('glossary.entry.notFound')}</PageMessage>;
  }
  const { title, tags, imageFileIds, body } = entry.data;

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            to={glossaryPaths.overview(projectId)}
            aria-label={t('glossary.entry.back')}
            title={t('glossary.entry.back')}
            className="inline-flex size-6 items-center justify-center rounded-md text-text outline-none hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-border-strong"
          >
            <svg aria-hidden viewBox="0 0 16 16" fill="none" className="size-6">
              <path
                d="m10 3-5 5 5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <h1 className="font-heading text-2xl leading-7 font-bold text-text">{title}</h1>
        </div>
        {canWork && (
          <Link
            to={glossaryPaths.edit(projectId, entryId)}
            className={`${largeTextButton} px-4 py-3`}
          >
            {t('glossary.entry.edit')}
          </Link>
        )}
      </header>

      {(imageFileIds.length > 0 || tags.length > 0) && (
        <div className="flex flex-wrap items-start gap-6">
          <Gallery fileIds={imageFileIds} title={title} />
          {tags.length > 0 && (
            <ul className="flex max-w-md flex-wrap gap-2">
              {tags.map((tag) => (
                <li key={tag}>
                  <Tag>{tag}</Tag>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <MarkdownView body={body} projectId={projectId} entries={glossary.data?.entries ?? []} />
    </article>
  );
}
