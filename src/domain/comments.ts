import type { Comment, CommentThread, Id, LanguageCode, Member, Timestamp } from './types';

/*
 * The Comments page (DECISIONS D43): which threads involve someone, and how the
 * list is filtered and ordered.
 */

export interface ThreadLike {
  thread: Pick<CommentThread, 'projectId' | 'language' | 'resolvedAt' | 'createdAt'>;
  comments: Pick<Comment, 'authorId' | 'body' | 'createdAt'>[];
}

/** Whether a comment @mentions someone ("@Full Name", as the composer inserts it). */
export function mentions(body: string, member: Pick<Member, 'name'>): boolean {
  const name = `@${member.name}`;
  let from = body.indexOf(name);
  while (from !== -1) {
    // Not "@Ben Carterson" when looking for "@Ben Carter".
    const next = body[from + name.length];
    if (next === undefined || !/[\p{L}\p{N}]/u.test(next)) return true;
    from = body.indexOf(name, from + 1);
  }
  return false;
}

/** A thread involves you if you wrote in it or are mentioned in it. */
export function involves(entry: ThreadLike, member: Pick<Member, 'id' | 'name'>): boolean {
  return entry.comments.some((c) => c.authorId === member.id || mentions(c.body, member));
}

/** The newest reply, or when it was resolved, whichever is later. */
export function lastActivity(entry: ThreadLike): Timestamp {
  const times = [
    entry.thread.createdAt,
    ...entry.comments.map((c) => c.createdAt),
    ...(entry.thread.resolvedAt ? [entry.thread.resolvedAt] : []),
  ];
  return times.reduce((latest, time) => (time > latest ? time : latest));
}

export interface CommentInboxFilters {
  state: 'open' | 'resolved';
  /** null: every language; 'general': threads about no language. */
  language: LanguageCode | 'general' | null;
  projectId: Id | null;
  /** Only threads involving this person (always for workers, D43). */
  involving: Pick<Member, 'id' | 'name'> | null;
}

/** Filters the threads and orders them by latest activity, newest first. */
export function filterCommentInbox<T extends ThreadLike>(
  entries: T[],
  filters: CommentInboxFilters,
): T[] {
  return entries
    .filter(
      (entry) =>
        (filters.state === 'resolved') === Boolean(entry.thread.resolvedAt) &&
        (filters.language === null || (entry.thread.language ?? 'general') === filters.language) &&
        (filters.projectId === null || entry.thread.projectId === filters.projectId) &&
        (filters.involving === null || involves(entry, filters.involving)),
    )
    .sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)));
}
