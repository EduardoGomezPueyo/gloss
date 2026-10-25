import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { ProjectAccessContext } from '@/app/projectAccess/ProjectAccessContext';
import { useCommentInbox, useMembers, useWorkspaceSettings } from '@/data/hooks';
import type { CommentInboxEntry } from '@/data/repositories/types';
import { filterCommentInbox, lastActivity, type CommentInboxFilters } from '@/domain/comments';
import { languageName } from '@/domain/languages';
import { canSeeProject, canWorkOnProject } from '@/domain/members';
import type { Member } from '@/domain/types';
import { DEFAULT_WORKSPACE_SETTINGS } from '@/domain/workspace';
import { Avatar } from '@/ui/Avatar';
import { SelectInput } from '@/ui/form';
import { Segmented } from '@/ui/Segmented';
import { PageMessage } from '../project-detail/shared';
import { OpenThread, ResolvedThread } from '../editor/CommentThreads';
import { SourceImage } from '../editor/SourceImage';
import { useCommentLabels } from '../editor/useCommentLabels';
import { InboxContext, InboxEmpty, InboxEntry, InboxLayout } from '../inbox/InboxLayout';
import { useInboxSelection } from '../inbox/useInboxSelection';

const ALL = 'all';

const chipSelect =
  'h-8 w-auto shrink-0 gap-1.5 rounded-full border border-border-strong px-3 text-[13px] whitespace-nowrap text-text-secondary outline-none focus-visible:border-text-tertiary';

/**
 * Comments (no design, spec approved by the author, DECISIONS D43): threads
 * across projects. Managers start on the threads involving them and can see all;
 * workers only see the threads involving them.
 */
export function CommentsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';
  const labels = useCommentLabels();
  const inbox = useCommentInbox();
  const { data: members = [] } = useMembers();
  const { currentUser } = useCurrentUser();
  const settings = useWorkspaceSettings().data ?? DEFAULT_WORKSPACE_SETTINGS;
  const isManager = currentUser?.category === 'manager';

  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [state, setState] = useState<CommentInboxFilters['state']>('open');
  const [language, setLanguage] = useState<string>(ALL);
  const [projectId, setProjectId] = useState<string>(ALL);

  // Threads of the projects this person can see; the filters work within them.
  const visible = useMemo(
    () => (inbox.data ?? []).filter((e) => canSeeProject(currentUser, e.project, settings)),
    [inbox.data, currentUser, settings],
  );
  const entries = filterCommentInbox(visible, {
    state,
    language: language === ALL ? null : language,
    projectId: projectId === ALL ? null : projectId,
    // Workers have no choice (D43).
    involving: currentUser && (!isManager || scope === 'mine') ? currentUser : null,
  });
  const { selectedId, select } = useInboxSelection(entries.map((e) => e.thread.id));
  const selected = entries.find((e) => e.thread.id === selectedId);

  const languageOptions = useMemo(() => {
    const codes = new Set(visible.flatMap((e) => e.project.targetLanguages));
    return [...codes].sort().map((code) => ({ value: code, label: languageName(code, locale) }));
  }, [visible, locale]);
  const projectOptions = useMemo(() => {
    const projects = new Map(visible.map((e) => [e.project.id, e.project.name]));
    return [...projects]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [visible]);

  if (inbox.isError) return <PageMessage role="alert">{t('data.loadError')}</PageMessage>;

  return (
    <InboxLayout
      title={t('comments.title')}
      aside={
        <span className="text-[13px] text-text-secondary" aria-live="polite">
          {t('comments.count', { count: entries.length })}
        </span>
      }
      filters={
        <>
          {isManager && (
            <Segmented
              size="sm"
              label={t('comments.scope')}
              value={scope}
              onChange={setScope}
              options={[
                { value: 'mine', label: t('comments.involvingMe') },
                { value: 'all', label: t('comments.all') },
              ]}
            />
          )}
          <Segmented
            size="sm"
            label={t('comments.state')}
            value={state}
            onChange={setState}
            options={[
              { value: 'open', label: t('comments.open') },
              { value: 'resolved', label: t('comments.resolved') },
            ]}
          />
          <SelectInput
            value={language}
            onChange={setLanguage}
            label={t('comments.languageFilter')}
            options={[
              { value: ALL, label: t('editor.allLanguages') },
              { value: 'general', label: t('editor.general') },
              ...languageOptions,
            ]}
            className={chipSelect}
          />
          <SelectInput
            value={projectId}
            onChange={setProjectId}
            label={t('comments.projectFilter')}
            options={[{ value: ALL, label: t('comments.allProjects') }, ...projectOptions]}
            className={chipSelect}
          />
        </>
      }
      list={
        inbox.isPending ? (
          <p className="px-3 text-sm text-text-tertiary">{t('editor.loading')}</p>
        ) : entries.length === 0 ? (
          <p className="px-3 text-sm text-text-tertiary">
            {isManager && scope === 'all' ? t('comments.emptyAll') : t('comments.emptyMine')}
          </p>
        ) : (
          <ul aria-label={t('comments.title')} className="flex flex-col gap-1">
            {entries.map((entry) => {
              const [first, ...replies] = entry.comments;
              const author = members.find((m) => m.id === first?.authorId);
              return (
                <InboxEntry
                  key={entry.thread.id}
                  selected={entry.thread.id === selectedId}
                  onSelect={() => select(entry.thread.id)}
                  avatar={author ? <Avatar member={author} size="md" /> : undefined}
                  title={
                    <>
                      {author?.name ?? t('editor.someone')}
                      <span className="ml-2 font-normal text-accent-text">
                        {labels.language(entry.thread.language)}
                      </span>
                    </>
                  }
                  meta={labels.time(lastActivity(entry))}
                  excerpt={first?.body}
                  context={[
                    entry.project.name,
                    entry.item.name,
                    replies.length > 0 ? t('editor.replies', { count: replies.length }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                />
              );
            })}
          </ul>
        )
      }
      detail={
        selected ? (
          <ThreadDetail key={selected.thread.id} entry={selected} members={members} />
        ) : (
          <InboxEmpty>{t('comments.nothingSelected')}</InboxEmpty>
        )
      }
    />
  );
}

/** The selected thread: its image, where it lives, and the conversation. */
function ThreadDetail({ entry, members }: { entry: CommentInboxEntry; members: Member[] }) {
  const { currentUser } = useCurrentUser();
  const { project } = entry;
  const access = useMemo(
    () => ({ canWork: canWorkOnProject(currentUser, project) }),
    [currentUser, project],
  );
  const people = members.filter(
    (m) => project.managerIds.includes(m.id) || project.memberIds.includes(m.id),
  );

  return (
    <ProjectAccessContext value={access}>
      <SourceImage key={entry.image.id} image={entry.image} />
      <InboxContext
        project={project}
        section={entry.section}
        item={entry.item}
        imagePosition={entry.image.order + 1}
        language={entry.thread.language}
      />
      <div className="border-l-2 border-border-strong pl-4">
        {entry.thread.resolvedAt ? (
          <ResolvedThread
            entry={entry}
            imageId={entry.image.id}
            allMembers={members}
            defaultExpanded
          />
        ) : (
          <OpenThread
            entry={entry}
            highlighted={false}
            imageId={entry.image.id}
            members={people}
            allMembers={members}
          />
        )}
      </div>
    </ProjectAccessContext>
  );
}
