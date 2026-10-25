import { mentions } from './comments';
import type { Id, Member, Notification, NotificationKind } from './types';

/*
 * Notifications (DECISIONS D45): who hears about what. The repository calls
 * these when something happens and stores one record per recipient. Nobody is
 * notified of their own actions.
 */

/** What a notification is about; the repository adds the entity fields. */
export type NotificationDraft = Pick<Notification, 'recipientId' | 'kind' | 'projectId'> &
  Partial<
    Pick<
      Notification,
      'sectionId' | 'contentItemId' | 'imageId' | 'threadId' | 'commentId' | 'language' | 'count'
    >
  >;

type About = Omit<NotificationDraft, 'recipientId' | 'kind'>;

/** One draft per recipient, without the person who acted and without repeats. */
export function notify(
  recipients: readonly (Id | null | undefined)[],
  by: Id | null,
  kind: NotificationKind,
  about: About,
): NotificationDraft[] {
  const unique = [...new Set(recipients.filter((id): id is Id => Boolean(id) && id !== by))];
  return unique.map((recipientId) => ({ recipientId, kind, ...about }));
}

/**
 * A new comment, opening a thread or replying: the people it @mentions hear
 * "mention"; everyone who wrote earlier in the thread hears "reply" (unless
 * they were mentioned too).
 */
export function commentNotifications({
  body,
  by,
  people,
  earlierAuthorIds,
  about,
}: {
  body: string;
  by: Id | null;
  /** The project's people: only they can be mentioned. */
  people: readonly Pick<Member, 'id' | 'name'>[];
  earlierAuthorIds: readonly (Id | null)[];
  about: About;
}): NotificationDraft[] {
  const mentioned = people.filter((p) => mentions(body, p)).map((p) => p.id);
  return [
    ...notify(mentioned, by, 'mention', about),
    ...notify(
      earlierAuthorIds.filter((id) => !id || !mentioned.includes(id)),
      by,
      'reply',
      about,
    ),
  ];
}

/** People added to a project by a change of its managers or members. */
export function addedPeople(
  before: { managerIds: readonly Id[]; memberIds: readonly Id[] } | null,
  after: { managerIds: readonly Id[]; memberIds: readonly Id[] },
): Id[] {
  const had = new Set(before ? [...before.managerIds, ...before.memberIds] : []);
  return [...after.managerIds, ...after.memberIds].filter((id) => !had.has(id));
}

/** Newest first, like the other inbox pages. */
export function sortNotifications<T extends Pick<Notification, 'createdAt'>>(list: T[]): T[] {
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type NotificationFilter = 'all' | 'unread' | 'mentions';

export function filterNotifications<T extends Pick<Notification, 'kind' | 'readAt'>>(
  list: T[],
  filter: NotificationFilter,
): T[] {
  if (filter === 'unread') return list.filter((n) => !n.readAt);
  if (filter === 'mentions') return list.filter((n) => n.kind === 'mention');
  return list;
}
