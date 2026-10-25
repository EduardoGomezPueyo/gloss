import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import {
  useAssignmentInbox,
  useMembers,
  useReview,
  useReviewQueue,
  useWorkspaceSettings,
} from '@/data/hooks';
import type { AssignmentInboxEntry, ReviewQueueEntry } from '@/data/repositories/types';
import { byPriorityThenRecent, itemLanguageProgress } from '@/domain/assignments';
import { languageName } from '@/domain/languages';
import { canSeeProject } from '@/domain/members';
import { formatRelativeTime } from '@/domain/relativeTime';
import { canReview } from '@/domain/translationWorkflow';
import type { Member, SceneImage, Translation } from '@/domain/types';
import { DEFAULT_WORKSPACE_SETTINGS } from '@/domain/workspace';
import { Avatar } from '@/ui/Avatar';
import { accentButton, neutralButton } from '@/ui/buttons';
import { CheckIcon } from '@/ui/icons';
import { ProgressBar } from '@/ui/ProgressBar';
import { Segmented } from '@/ui/Segmented';
import { StatusBadge } from '@/ui/StatusBadge';
import { StatusIcon } from '@/ui/StatusIcon';
import { SourceImage } from '../editor/SourceImage';
import { InboxContext, InboxEmpty, InboxEntry, InboxLayout } from '../inbox/InboxLayout';
import { useInboxSelection } from '../inbox/useInboxSelection';
import { PageMessage } from '../project-detail/shared';

type Tab = 'assigned' | 'review';

/**
 * Assigned to me (no design, spec approved by the author, DECISIONS D44): the
 * content items assigned to the current user, one per language, and for
 * managers the translations waiting for their review.
 */
export function AssignedPage() {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const settings = useWorkspaceSettings().data ?? DEFAULT_WORKSPACE_SETTINGS;
  const assignmentInbox = useAssignmentInbox();
  const reviewQueue = useReviewQueue();
  const { data: members = [] } = useMembers();
  const [tab, setTab] = useState<Tab>('assigned');
  const isReviewer = canReview(currentUser);
  const activeTab: Tab = isReviewer ? tab : 'assigned';

  const assigned = useMemo(
    () =>
      byPriorityThenRecent(
        (assignmentInbox.data ?? []).filter(
          (e) =>
            e.assignment.assigneeId === currentUser?.id &&
            canSeeProject(currentUser, e.project, settings),
        ),
        (e) => e.project.priority,
        (e) => e.assignment.createdAt,
      ),
    [assignmentInbox.data, currentUser, settings],
  );
  const toReview = useMemo(
    () =>
      byPriorityThenRecent(
        (reviewQueue.data ?? []).filter(
          (e) => currentUser && e.project.managerIds.includes(currentUser.id),
        ),
        (e) => e.project.priority,
        (e) => e.translation.updatedAt,
      ),
    [reviewQueue.data, currentUser],
  );

  const ids =
    activeTab === 'assigned'
      ? assigned.map((e) => e.assignment.id)
      : toReview.map((e) => e.translation.id);
  const { selectedId, select } = useInboxSelection(ids);
  const pending =
    !currentUser || (activeTab === 'assigned' ? assignmentInbox.isPending : reviewQueue.isPending);

  if (assignmentInbox.isError || reviewQueue.isError) {
    return <PageMessage role="alert">{t('data.loadError')}</PageMessage>;
  }

  const selectedAssignment = assigned.find((e) => e.assignment.id === selectedId);
  const selectedReview = toReview.find((e) => e.translation.id === selectedId);

  return (
    <InboxLayout
      title={t('assigned.title')}
      aside={
        <span className="text-[13px] text-text-secondary" aria-live="polite">
          {activeTab === 'assigned'
            ? t('assigned.count', { count: assigned.length })
            : t('assigned.reviewCount', { count: toReview.length })}
        </span>
      }
      filters={
        isReviewer && (
          <Segmented
            size="sm"
            label={t('assigned.tabs')}
            value={tab}
            onChange={setTab}
            options={[
              { value: 'assigned', label: t('assigned.assignedTab', { count: assigned.length }) },
              { value: 'review', label: t('assigned.reviewTab', { count: toReview.length }) },
            ]}
          />
        )
      }
      list={
        pending ? (
          <p className="px-3 text-sm text-text-tertiary">{t('editor.loading')}</p>
        ) : ids.length === 0 ? (
          <p className="px-3 text-sm text-text-tertiary">
            {activeTab === 'assigned' ? t('assigned.empty') : t('assigned.reviewEmpty')}
          </p>
        ) : (
          <ul aria-label={t('assigned.title')} className="flex flex-col gap-1">
            {activeTab === 'assigned'
              ? assigned.map((entry) => (
                  <AssignedEntry
                    key={entry.assignment.id}
                    entry={entry}
                    selected={entry.assignment.id === selectedId}
                    onSelect={() => select(entry.assignment.id)}
                  />
                ))
              : toReview.map((entry) => (
                  <ReviewEntry
                    key={entry.translation.id}
                    entry={entry}
                    members={members}
                    selected={entry.translation.id === selectedId}
                    onSelect={() => select(entry.translation.id)}
                  />
                ))}
          </ul>
        )
      }
      detail={
        selectedAssignment ? (
          <AssignmentDetail key={selectedAssignment.assignment.id} entry={selectedAssignment} />
        ) : selectedReview ? (
          <ReviewDetail
            key={selectedReview.translation.id}
            entry={selectedReview}
            members={members}
          />
        ) : (
          <InboxEmpty>{t('assigned.nothingSelected')}</InboxEmpty>
        )
      }
    />
  );
}

function useLabels() {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';
  return {
    language: (code: string) => languageName(code, locale),
    time: (at: string) => formatRelativeTime(at, new Date(), locale),
  };
}

function AssignedEntry({
  entry,
  selected,
  onSelect,
}: {
  entry: AssignmentInboxEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const labels = useLabels();
  const { assignment, images, translations, project, section, item } = entry;
  const progress = itemLanguageProgress(images, translations, assignment.language);
  return (
    <InboxEntry
      selected={selected}
      onSelect={onSelect}
      avatar={
        <StatusIcon status={progress.status} progress={progress.done / (progress.total || 1)} />
      }
      title={
        <>
          {item.name}
          <span className="ml-2 font-normal text-accent-text">
            {labels.language(assignment.language)}
          </span>
        </>
      }
      meta={t('editor.translatedCount', { done: progress.done, total: progress.total })}
      excerpt={images[0]?.source.text || t('editor.noSourceText')}
      context={`${project.name} · ${section.name} · ${t('assigned.assignedAgo', { time: labels.time(assignment.createdAt) })}`}
    />
  );
}

function ReviewEntry({
  entry,
  members,
  selected,
  onSelect,
}: {
  entry: ReviewQueueEntry;
  members: Member[];
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const labels = useLabels();
  const { translation, image, project, section, item } = entry;
  const author = members.find((m) => m.id === (translation.authorId ?? translation.updatedBy));
  return (
    <InboxEntry
      selected={selected}
      onSelect={onSelect}
      avatar={author ? <Avatar member={author} size="md" /> : undefined}
      title={
        <>
          {item.name}
          <span className="ml-2 font-normal text-accent-text">
            {labels.language(translation.language)}
          </span>
        </>
      }
      meta={labels.time(translation.updatedAt)}
      excerpt={translation.text}
      context={`${project.name} · ${section.name} · ${t('assigned.imageN', { n: image.order + 1 })}`}
    />
  );
}

/** A labelled block of the detail side: source text, a translation… */
function Block({
  label,
  aside,
  children,
}: {
  label: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text">{label}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function SourceBlock({ image, sourceLanguage }: { image: SceneImage; sourceLanguage: string }) {
  const { t } = useTranslation();
  const labels = useLabels();
  return (
    <Block
      label={t('editor.sourceText')}
      aside={<span className="text-xs text-text-secondary">{labels.language(sourceLanguage)}</span>}
    >
      {image.source.speaker && (
        <span className="text-sm font-semibold text-accent-text">{image.source.speaker}</span>
      )}
      <p className="text-base whitespace-pre-wrap text-text">
        {image.source.text || t('editor.noSourceText')}
      </p>
    </Block>
  );
}

function AssignmentDetail({ entry }: { entry: AssignmentInboxEntry }) {
  const { t } = useTranslation();
  const labels = useLabels();
  const { assignment, images, translations, project, section, item } = entry;
  const [first] = images;
  const progress = itemLanguageProgress(images, translations, assignment.language);
  const translationOf = (image: SceneImage): Translation | undefined =>
    translations.find((tr) => tr.imageId === image.id);
  const language = labels.language(assignment.language);

  return (
    <>
      {first && <SourceImage key={first.id} image={first} />}
      <InboxContext
        project={project}
        section={section}
        item={item}
        imagePosition={1}
        language={assignment.language}
      />
      {first && <SourceBlock image={first} sourceLanguage={project.sourceLanguage} />}
      <Block
        label={t('assigned.yourTranslation', { language })}
        aside={<StatusBadge status={progress.status} size="md" />}
      >
        <div className="flex items-center gap-3">
          <ProgressBar
            value={progress.done / (progress.total || 1)}
            status={progress.status}
            label={t('assigned.progressOf', { name: item.name, language })}
            className="h-1.5 flex-1"
          />
          <span className="text-xs text-text-secondary">
            {t('editor.translatedCount', { done: progress.done, total: progress.total })}
          </span>
        </div>
        <ol className="flex flex-col divide-y divide-border">
          {images.map((image, index) => {
            const translation = translationOf(image);
            return (
              <li key={image.id} className="flex items-start gap-3 py-2.5 text-sm">
                <span className="w-6 shrink-0 text-text-tertiary tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate ${translation?.text ? 'text-text' : 'text-text-tertiary'}`}
                >
                  {translation?.text || t('editor.notTranslated')}
                </span>
                <StatusBadge status={translation?.status ?? 'not-started'} />
              </li>
            );
          })}
        </ol>
      </Block>
    </>
  );
}

function ReviewDetail({ entry, members }: { entry: ReviewQueueEntry; members: Member[] }) {
  const { t } = useTranslation();
  const labels = useLabels();
  const { currentUser } = useCurrentUser();
  const review = useReview();
  const { translation, image, project, section, item } = entry;
  const author = members.find((m) => m.id === (translation.authorId ?? translation.updatedBy));
  const decide = (decision: 'approve' | 'requestChanges') =>
    currentUser &&
    review.mutate({
      imageId: image.id,
      language: translation.language,
      decision,
      by: currentUser.id,
    });

  return (
    <>
      <SourceImage key={image.id} image={image} />
      <InboxContext
        project={project}
        section={section}
        item={item}
        imagePosition={image.order + 1}
        language={translation.language}
      />
      <SourceBlock image={image} sourceLanguage={project.sourceLanguage} />
      <Block
        label={labels.language(translation.language)}
        aside={<StatusBadge status={translation.status} size="md" />}
      >
        <p className="text-base whitespace-pre-wrap text-text">{translation.text}</p>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <span className="text-sm text-text-secondary">
            {t('assigned.translatedBy', {
              name: author?.name ?? t('editor.someone'),
              time: labels.time(translation.updatedAt),
            })}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => decide('requestChanges')}
              disabled={review.isPending}
              className={neutralButton}
            >
              {t('editor.requestChanges')}
            </button>
            <button
              type="button"
              onClick={() => decide('approve')}
              disabled={review.isPending}
              className={accentButton}
            >
              <CheckIcon />
              {t('editor.approve')}
            </button>
          </div>
        </div>
      </Block>
    </>
  );
}
