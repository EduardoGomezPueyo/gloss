import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useProjectAccess } from '@/app/projectAccess/ProjectAccessContext';
import { useCommentAction } from '@/data/hooks';
import type { ThreadWithComments } from '@/data/repositories/types';
import type { Comment, Id, Member } from '@/domain/types';
import { Avatar } from '@/ui/Avatar';
import { neutralButton, textButton } from '@/ui/buttons';
import { CheckIcon } from '@/ui/icons';
import { CommentBody, MentionTextarea } from './MentionTextarea';
import { useCommentLabels } from './useCommentLabels';

/*
 * One thread with its replies, Resolve / Reopen and the reply box: used by the
 * editor's side bar and by the Comments page (DECISIONS D30, D43).
 */

function CommentView({
  comment,
  allMembers,
  reply,
}: {
  comment: Comment;
  allMembers: Member[];
  reply?: boolean;
}) {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const labels = useCommentLabels();
  const author = allMembers.find((m) => m.id === comment.authorId);
  const name =
    comment.authorId && comment.authorId === currentUser?.id
      ? t('editor.you')
      : (author?.name ?? t('editor.someone'));

  return (
    <div className={`flex flex-col gap-2 ${reply ? 'border-l-2 border-border-strong pl-4' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-text">
          {author && <Avatar member={author} size="md" />}
          {name}
        </span>
        <span className="text-xs text-text-secondary">{labels.time(comment.createdAt)}</span>
      </div>
      <p className="text-sm whitespace-pre-wrap text-text">
        <CommentBody body={comment.body} members={allMembers} />
      </p>
    </div>
  );
}

export function OpenThread({
  entry,
  highlighted,
  imageId,
  members,
  allMembers,
}: {
  entry: ThreadWithComments;
  highlighted: boolean;
  imageId: Id;
  members: Member[];
  allMembers: Member[];
}) {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const labels = useCommentLabels();
  const action = useCommentAction();
  const [reply, setReply] = useState<string | null>(null);
  const { canWork } = useProjectAccess();
  const by = currentUser?.id ?? null;
  const [first, ...replies] = entry.comments;

  const sendReply = (event: FormEvent) => {
    event.preventDefault();
    if (!reply?.trim()) return;
    action.mutate(
      { kind: 'reply', imageId, threadId: entry.thread.id, body: reply, by },
      { onSuccess: () => setReply(null) },
    );
  };

  return (
    <article
      data-thread-id={entry.thread.id}
      tabIndex={-1}
      className={`flex flex-col gap-3 border-b border-border pb-5 outline-none last:border-0 ${
        highlighted ? '-mx-3 rounded-xl border-0 bg-fill-subtle p-3' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-accent-text">{labels.language(entry.thread.language)}</span>
        {canWork && (
          <button
            type="button"
            onClick={() =>
              action.mutate({ kind: 'resolve', imageId, threadId: entry.thread.id, by })
            }
            disabled={action.isPending}
            className={textButton}
          >
            <CheckIcon />
            {t('editor.resolve')}
          </button>
        )}
      </div>
      {first && <CommentView comment={first} allMembers={allMembers} />}
      {replies.map((comment) => (
        <CommentView key={comment.id} comment={comment} allMembers={allMembers} reply />
      ))}
      {!canWork ? null : reply === null ? (
        <button
          type="button"
          onClick={() => setReply('')}
          className={`${textButton} self-start font-semibold text-accent-text`}
        >
          {t('editor.replyToThread')}
        </button>
      ) : (
        <form onSubmit={sendReply} className="flex flex-col gap-2">
          <MentionTextarea
            value={reply}
            onChange={setReply}
            members={members}
            placeholder={t('editor.replyPlaceholder')}
            label={t('editor.replyToThread')}
            rows={2}
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setReply(null)} className={textButton}>
              {t('editor.cancel')}
            </button>
            <button
              type="submit"
              disabled={!reply.trim() || action.isPending}
              className={neutralButton}
            >
              {t('editor.sendReply')}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

export function ResolvedThread({
  entry,
  imageId,
  allMembers,
  defaultExpanded = false,
}: {
  entry: ThreadWithComments;
  imageId: Id;
  allMembers: Member[];
  /** The Comments page shows the whole thread at once. */
  defaultExpanded?: boolean;
}) {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const labels = useCommentLabels();
  const action = useCommentAction();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { canWork } = useProjectAccess();
  const resolver = allMembers.find((m) => m.id === entry.thread.resolvedBy);
  const [first] = entry.comments;

  return (
    <article className="flex flex-col gap-2 border-b border-border pb-5 last:border-0">
      <p className="flex items-center gap-2 text-sm text-text">
        <CheckIcon className="size-4 text-status-completed" />
        {t('editor.resolvedBy', { name: resolver?.name ?? t('editor.someone') })}
      </p>
      {expanded ? (
        entry.comments.map((comment, i) => (
          <CommentView key={comment.id} comment={comment} allMembers={allMembers} reply={i > 0} />
        ))
      ) : (
        <p className="truncate text-sm text-text-secondary">
          {labels.language(entry.thread.language)} · {first?.body}
        </p>
      )}
      <div className="flex gap-4">
        <button type="button" onClick={() => setExpanded((e) => !e)} className={textButton}>
          {expanded ? t('editor.hideThread') : t('editor.viewThread')}
        </button>
        {canWork && (
          <button
            type="button"
            onClick={() =>
              action.mutate({
                kind: 'reopen',
                imageId,
                threadId: entry.thread.id,
                by: currentUser?.id ?? null,
              })
            }
            disabled={action.isPending}
            className={textButton}
          >
            {t('editor.reopen')}
          </button>
        )}
      </div>
    </article>
  );
}
