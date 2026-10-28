import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { ProjectAccessContext } from '@/app/projectAccess/ProjectAccessContext';
import {
  useMarkNotificationsRead,
  useMembers,
  useNotifications,
  useWorkspaceSettings,
} from '@/data/hooks';
import type { NotificationInboxEntry } from '@/data/repositories/types';
import { languageName } from '@/domain/languages';
import { canSeeProject, canWorkOnProject } from '@/domain/members';
import {
  filterNotifications,
  sortNotifications,
  type NotificationFilter,
} from '@/domain/notifications';
import { formatRelativeTime } from '@/domain/relativeTime';
import type { Member } from '@/domain/types';
import { DEFAULT_WORKSPACE_SETTINGS } from '@/domain/workspace';
import { Avatar } from '@/ui/Avatar';
import { textButton } from '@/ui/buttons';
import { Segmented } from '@/ui/Segmented';
import { StatusBadge } from '@/ui/StatusBadge';
import { OpenThread, ResolvedThread } from '../editor/CommentThreads';
import { SourceImage } from '../editor/SourceImage';
import { InboxContext, InboxEmpty, InboxEntry, InboxLayout } from '../inbox/InboxLayout';
import { useInboxSelection } from '../inbox/useInboxSelection';
import { PageMessage } from '../project-detail/shared';

/**
 * Notifications (no design, spec approved by the author, DECISIONS D45): what
 * happened that concerns the current user, newest first. Opening one marks it
 * read; the navigation shows how many are unread.
 */
export function NotificationsPage() {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const settings = useWorkspaceSettings().data ?? DEFAULT_WORKSPACE_SETTINGS;
  const notifications = useNotifications(currentUser?.id);
  const { data: members = [] } = useMembers();
  const markRead = useMarkNotificationsRead();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  // Unread when the Unread filter was chosen: they stay listed once read, or opening
  // the first one (which marks it read) would empty the list one by one.
  const [unreadOnEntry, setUnreadOnEntry] = useState<ReadonlySet<string>>(new Set());

  // The projects this person can see, newest first (D41, D45).
  const all = useMemo(() => {
    const seen = (notifications.data ?? []).filter((e) =>
      canSeeProject(currentUser, e.project, settings),
    );
    const byId = new Map(seen.map((e) => [e.notification.id, e]));
    return sortNotifications(seen.map((e) => e.notification)).map((n) => byId.get(n.id)!);
  }, [notifications.data, currentUser, settings]);
  const kept = new Set(
    filterNotifications(
      all.map((e) => e.notification),
      filter,
    ).map((n) => n.id),
  );
  const entries = all.filter(
    (e) =>
      kept.has(e.notification.id) ||
      (filter === 'unread' && unreadOnEntry.has(e.notification.id)),
  );
  const unread = all.filter((e) => !e.notification.readAt).length;
  const changeFilter = (next: NotificationFilter) => {
    setUnreadOnEntry(
      new Set(all.filter((e) => !e.notification.readAt).map((e) => e.notification.id)),
    );
    setFilter(next);
  };
  const { selectedId, select } = useInboxSelection(entries.map((e) => e.notification.id));
  const selected = entries.find((e) => e.notification.id === selectedId);

  // Opening a notification marks it read.
  const selectedUnread =
    selected && !selected.notification.readAt ? selected.notification.id : null;
  const { mutate } = markRead;
  useEffect(() => {
    if (selectedUnread) mutate({ ids: [selectedUnread] });
  }, [selectedUnread, mutate]);

  if (notifications.isError) return <PageMessage role="alert">{t('data.loadError')}</PageMessage>;

  return (
    <InboxLayout
      title={t('notifications.title')}
      aside={
        currentUser &&
        unread > 0 && (
          <button
            type="button"
            onClick={() => markRead.mutate({ allFor: currentUser.id })}
            className={`${textButton} text-[13px]`}
          >
            {t('notifications.markAllRead')}
          </button>
        )
      }
      filters={
        <Segmented
          size="sm"
          label={t('notifications.filter')}
          value={filter}
          onChange={changeFilter}
          options={[
            { value: 'all', label: t('notifications.all') },
            { value: 'unread', label: t('notifications.unread', { count: unread }) },
            { value: 'mentions', label: t('notifications.mentions') },
          ]}
        />
      }
      list={
        !currentUser || notifications.isPending ? (
          <p className="px-3 text-sm text-text-tertiary">{t('editor.loading')}</p>
        ) : entries.length === 0 ? (
          <p className="px-3 text-sm text-text-tertiary">
            {filter === 'all' ? t('notifications.empty') : t('notifications.emptyFiltered')}
          </p>
        ) : (
          <ul aria-label={t('notifications.title')} className="flex flex-col gap-1">
            {entries.map((entry) => (
              <NotificationEntry
                key={entry.notification.id}
                entry={entry}
                members={members}
                selected={entry.notification.id === selectedId}
                onSelect={() => select(entry.notification.id)}
              />
            ))}
          </ul>
        )
      }
      detail={
        selected ? (
          <NotificationDetail key={selected.notification.id} entry={selected} members={members} />
        ) : (
          <InboxEmpty>{t('notifications.nothingSelected')}</InboxEmpty>
        )
      }
    />
  );
}

/** "Ben Carter mentioned you", "Ana Torres approved your translation"… */
function useDescribe(members: Member[]) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';
  return (entry: NotificationInboxEntry) => {
    const { notification, project, section } = entry;
    const name = members.find((m) => m.id === notification.createdBy)?.name ?? t('editor.someone');
    const language = notification.language ? languageName(notification.language, locale) : '';
    return t(`notifications.kinds.${notification.kind}`, {
      name,
      language,
      project: project.name,
      section: section?.name ?? '',
      count: notification.count ?? 0,
    });
  };
}

function NotificationEntry({
  entry,
  members,
  selected,
  onSelect,
}: {
  entry: NotificationInboxEntry;
  members: Member[];
  selected: boolean;
  onSelect: () => void;
}) {
  const { t, i18n } = useTranslation();
  const describe = useDescribe(members);
  const { notification, project, item, thread, translation } = entry;
  const actor = members.find((m) => m.id === notification.createdBy);
  const comment = thread?.comments.find((c) => c.id === notification.commentId);
  const excerpt =
    comment?.body ??
    (notification.kind === 'resolved' ? thread?.comments[0]?.body : undefined) ??
    translation?.text ??
    undefined;

  return (
    <InboxEntry
      selected={selected}
      unread={!notification.readAt}
      onSelect={onSelect}
      avatar={actor ? <Avatar member={actor} size="md" /> : undefined}
      title={describe(entry)}
      meta={formatRelativeTime(notification.createdAt, new Date(), i18n.resolvedLanguage ?? 'en')}
      excerpt={excerpt}
      context={[project.name, item?.name].filter(Boolean).join(' · ') || t('notifications.project')}
    />
  );
}

function NotificationDetail({
  entry,
  members,
}: {
  entry: NotificationInboxEntry;
  members: Member[];
}) {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const describe = useDescribe(members);
  const { notification, project, section, item, image, thread, translation } = entry;
  const access = useMemo(
    () => ({ canWork: canWorkOnProject(currentUser, project) }),
    [currentUser, project],
  );
  const people = members.filter(
    (m) => project.managerIds.includes(m.id) || project.memberIds.includes(m.id),
  );

  let body: ReactNode;
  if (thread && image) {
    body = (
      <div className="border-l-2 border-border-strong pl-4">
        {thread.thread.resolvedAt ? (
          <ResolvedThread entry={thread} imageId={image.id} allMembers={members} defaultExpanded />
        ) : (
          <OpenThread
            entry={thread}
            highlighted={false}
            imageId={image.id}
            members={people}
            allMembers={members}
          />
        )}
      </div>
    );
  } else if (translation) {
    body = (
      <section className="flex flex-col gap-2 rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text">{describe(entry)}</h2>
          <StatusBadge status={translation.status} size="md" />
        </div>
        {image?.source.text && (
          <p className="text-sm whitespace-pre-wrap text-text-secondary">{image.source.text}</p>
        )}
        <p className="text-base whitespace-pre-wrap text-text">{translation.text}</p>
      </section>
    );
  } else {
    body = (
      <section className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="text-base font-semibold text-text">{describe(entry)}</h2>
        <p className="text-sm text-text-secondary">
          {[project.name, section?.name, item?.name].filter(Boolean).join(' › ')}
        </p>
        <NextStep entry={entry} />
      </section>
    );
  }

  return (
    <ProjectAccessContext value={access}>
      {image && <SourceImage key={image.id} image={image} />}
      {section && item && (
        <InboxContext
          project={project}
          section={section}
          item={item}
          imagePosition={image ? image.order + 1 : undefined}
          language={notification.language}
        />
      )}
      {body}
      {!image && !item && (
        <p className="text-xs text-text-tertiary">{t('notifications.noImage')}</p>
      )}
    </ProjectAccessContext>
  );
}

/** Where to go from a notification without an image. */
function NextStep({ entry }: { entry: NotificationInboxEntry }) {
  const { t } = useTranslation();
  const { notification, project, section } = entry;
  const link =
    'w-fit rounded-md text-sm font-semibold text-accent-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-strong';
  switch (notification.kind) {
    case 'assigned':
      return (
        <Link to="/assigned" className={link}>
          {t('notifications.goAssigned')} ↗
        </Link>
      );
    case 'submitted':
      return (
        <Link to="/assigned?tab=review" className={link}>
          {t('notifications.goReview')} ↗
        </Link>
      );
    default:
      return (
        <Link
          to={
            section ? `/projects/${project.id}/sections/${section.id}` : `/projects/${project.id}`
          }
          className={link}
        >
          {t('notifications.goProject')} ↗
        </Link>
      );
  }
}
