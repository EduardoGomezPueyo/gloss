import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useGlossaryEntry, useGlossaryVersions, useRestoreVersion } from '@/data/hooks';
import type { GlossaryContent } from '@/domain/types';
import { diffParagraphs, diffTags, diffText, type DiffSegment } from '@/domain/versionDiff';
import { primaryButton, textButton } from '@/ui/buttons';
import { Tag } from '@/ui/Tag';
import { PageMessage } from '../project-detail/shared';
import { glossaryPaths, useVersionDate } from './format';
import { StoredImage } from './Gallery';

/**
 * "Compare versions" (Figma 370:6934, DECISIONS D7): the current version with the
 * changes marked (added on blue, removed struck through on grey, a bar beside
 * changed paragraphs) next to the chosen older version. Restore saves the older
 * content as a new version.
 */
export function ComparePage() {
  const { t } = useTranslation();
  const { projectId = '', entryId = '', versionId = '' } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const entry = useGlossaryEntry(entryId);
  const versions = useGlossaryVersions(entryId);
  const restore = useRestoreVersion();
  const formatDate = useVersionDate();

  if (entry.isPending || versions.isPending) {
    return <p className="text-sm text-text-tertiary">{t('glossary.loading')}</p>;
  }
  if (entry.isError || versions.isError) {
    return <PageMessage role="alert">{t('data.loadError')}</PageMessage>;
  }
  const older = versions.data.find((v) => v.id === versionId);
  if (!entry.data || !older) return <PageMessage>{t('glossary.compare.notFound')}</PageMessage>;
  const current = entry.data;

  const onRestore = () =>
    restore.mutate(
      { entryId, versionId, by: currentUser?.id ?? null },
      { onSuccess: () => void navigate(glossaryPaths.entry(projectId, entryId)) },
    );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-[28px] leading-tight font-bold text-text">
          {t('glossary.compare.title')}
        </h1>
        <div className="flex items-center gap-4">
          <Link to={glossaryPaths.edit(projectId, entryId)} className={`${textButton} text-lg`}>
            {t('glossary.compare.goBack')}
          </Link>
          <button
            type="button"
            onClick={onRestore}
            disabled={restore.isPending}
            className={primaryButton}
          >
            {restore.isPending ? t('glossary.compare.restoring') : t('glossary.compare.restore')}
          </button>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-2">
        <Column
          label={t('glossary.compare.current')}
          dot="bg-status-completed"
          content={current}
          older={older}
        />
        <Column label={formatDate(older.createdAt)} dot="bg-text-tertiary" content={older} />
      </div>
    </div>
  );
}

/** One side. With `older`, the changes from it are marked on this content. */
function Column({
  label,
  dot,
  content,
  older,
}: {
  label: string;
  dot: string;
  content: GlossaryContent;
  older?: GlossaryContent;
}) {
  const { t } = useTranslation();
  const paragraphs = older
    ? diffParagraphs(older.body, content.body)
    : content.body
        .split(/\n\s*\n/)
        .map((text) => ({ segments: [{ kind: 'same' as const, text }], changed: false }));
  const tags = older
    ? diffTags(older.tags, content.tags)
    : content.tags.map((text) => ({ kind: 'same' as const, text }));

  return (
    <section aria-label={label} className="flex min-w-0 flex-col gap-6">
      <p className="flex items-center gap-3 text-base font-semibold text-text">
        <span aria-hidden className={`size-2.5 rounded-full ${dot}`} />
        {label}
      </p>
      <h2 className="font-heading text-2xl font-bold text-text">
        <Segments segments={older ? diffText(older.title, content.title) : plain(content.title)} />
      </h2>
      <p className="text-sm text-text-secondary">
        <Segments
          segments={
            older ? diffText(older.description, content.description) : plain(content.description)
          }
        />
      </p>
      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={`${tag.kind}-${tag.text}`}>
              <Tag className={segmentClass(tag.kind)}>
                {tag.kind !== 'same' && (
                  <span className="sr-only">
                    {tag.kind === 'added'
                      ? t('glossary.compare.added')
                      : t('glossary.compare.removed')}
                  </span>
                )}
                {tag.text}
              </Tag>
            </li>
          ))}
        </ul>
      )}
      {content.imageFileIds.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {content.imageFileIds.map((fileId) => (
            <StoredImage
              key={fileId}
              fileId={fileId}
              alt=""
              className="size-24 rounded-md object-cover"
            />
          ))}
        </div>
      )}
      <div className="flex flex-col gap-4 text-base leading-relaxed whitespace-pre-wrap text-text-secondary">
        {paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className={paragraph.changed ? '-ml-4 border-l-2 border-diff-added pl-3.5' : ''}
          >
            <Segments segments={paragraph.segments} />
          </p>
        ))}
      </div>
    </section>
  );
}

const plain = (text: string): DiffSegment[] => [{ kind: 'same', text }];

function segmentClass(kind: DiffSegment['kind']) {
  if (kind === 'added') return 'bg-diff-added text-text';
  if (kind === 'removed') return 'bg-diff-removed line-through';
  return '';
}

/** Added and removed text use <ins> / <del>, so screen readers announce them too. */
function Segments({ segments }: { segments: DiffSegment[] }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.kind === 'added' ? (
          <ins key={index} className={`no-underline ${segmentClass('added')}`}>
            {segment.text}
          </ins>
        ) : segment.kind === 'removed' ? (
          <del key={index} className={segmentClass('removed')}>
            {segment.text}
          </del>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}
