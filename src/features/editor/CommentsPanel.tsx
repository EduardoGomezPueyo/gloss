import { Dialog, Tabs } from 'radix-ui';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useCommentAction, useComments } from '@/data/hooks';
import type { ThreadWithComments } from '@/data/repositories/types';
import { languageName } from '@/domain/languages';
import type { Comment, Id, LanguageCode, Member } from '@/domain/types';
import { Avatar } from '@/ui/Avatar';
import { neutralButton, textButton } from '@/ui/buttons';
import { CloseIcon } from '@/ui/CloseIcon';
import { SelectInput } from '@/ui/form';
import { CheckIcon } from '@/ui/icons';
import { CommentComposer } from './CommentComposer';
import { CommentBody, MentionTextarea } from './MentionTextarea';
import { useCommentLabels } from './useCommentLabels';
import { useProjectAccess } from '@/app/projectAccess/ProjectAccessContext';

const ALL = 'all';
const GENERAL = 'general';

/**
 * Side bar with the comments about the current image (DECISIONS D30, D40): Open
 * and Resolved tabs, a language filter, threads with replies, Resolve / Reopen,
 * and a composer with @mentions. It slides over the right side and closes with
 * Esc or ×. No categories for now.
 */
export function CommentsPanel({
  open: isOpen,
  onOpenChange,
  focusThreadId,
  imageId,
  languages,
  defaultLanguage,
  members,
  allMembers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opened from a thread's "N replies": that thread is shown and highlighted. */
  focusThreadId: Id | null;
  imageId: Id;
  languages: LanguageCode[];
  defaultLanguage: LanguageCode | null;
  /** The project's people, offered as mentions. */
  members: Member[];
  /** Everyone, to name authors who left the project. */
  allMembers: Member[];
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';
  const comments = useComments(imageId);
  const [filter, setFilter] = useState<string>(ALL);
  const { canWork } = useProjectAccess();

  const threads = (comments.data ?? []).filter(
    ({ thread }) => filter === ALL || (thread.language ?? GENERAL) === filter,
  );
  const open = threads.filter((t) => !t.thread.resolvedAt);
  const resolved = threads.filter((t) => t.thread.resolvedAt);
  const languageOptions = [
    { value: GENERAL, label: t('editor.general') },
    ...languages.map((code) => ({ value: code, label: languageName(code, locale) })),
  ];

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            if (!focusThreadId) return;
            event.preventDefault();
            // A language filter left from before could hide the thread.
            setFilter(ALL);
            requestAnimationFrame(() => {
              const thread = document.querySelector<HTMLElement>(
                `[data-thread-id="${focusThreadId}"]`,
              );
              thread?.scrollIntoView({ block: 'nearest' });
              thread?.focus({ preventScroll: true });
            });
          }}
          className="fixed inset-y-0 right-0 z-30 flex w-[400px] max-w-full flex-col border-l border-border-strong bg-surface shadow-2xl outline-none"
        >
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <Dialog.Title className="font-heading text-lg font-bold text-text">
              {t('editor.commentsPanel')}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t('editor.close')}
              className="inline-flex size-8 items-center justify-center rounded-lg text-text-secondary outline-none hover:bg-fill-subtle hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
            >
              <CloseIcon />
            </Dialog.Close>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
            <Tabs.Root defaultValue="open" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs.List className="flex gap-4">
                  {(['open', 'resolved'] as const).map((tab) => (
                    <Tabs.Trigger
                      key={tab}
                      value={tab}
                      className="border-b-2 border-transparent pb-1 text-sm text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong data-[state=active]:border-accent data-[state=active]:font-semibold data-[state=active]:text-accent-text"
                    >
                      {tab === 'open'
                        ? t('editor.openTab', { count: open.length })
                        : t('editor.resolvedTab', { count: resolved.length })}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>
                <SelectInput
                  value={filter}
                  onChange={setFilter}
                  label={t('editor.commentFilter')}
                  options={[{ value: ALL, label: t('editor.allLanguages') }, ...languageOptions]}
                  className="h-8 w-auto gap-1.5 rounded-lg px-2 text-sm text-text-secondary outline-none hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-border-strong"
                />
              </div>

              <Tabs.Content value="open" className="flex flex-col gap-5 outline-none">
                {open.length === 0 ? (
                  <p className="text-sm text-text-tertiary">{t('editor.noOpen')}</p>
                ) : (
                  open.map((entry) => (
                    <OpenThread
                      key={entry.thread.id}
                      entry={entry}
                      highlighted={entry.thread.id === focusThreadId}
                      imageId={imageId}
                      members={members}
                      allMembers={allMembers}
                    />
                  ))
                )}
              </Tabs.Content>
              <Tabs.Content value="resolved" className="flex flex-col gap-5 outline-none">
                {resolved.length === 0 ? (
                  <p className="text-sm text-text-tertiary">{t('editor.noResolved')}</p>
                ) : (
                  resolved.map((entry) => (
                    <ResolvedThread
                      key={entry.thread.id}
                      entry={entry}
                      imageId={imageId}
                      allMembers={allMembers}
                    />
                  ))
                )}
              </Tabs.Content>
            </Tabs.Root>
          </div>

          {canWork && (
            <div className="border-t border-border px-5 py-4">
              <CommentComposer
                imageId={imageId}
                languages={languages}
                defaultLanguage={defaultLanguage}
                members={members}
              />
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

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

function OpenThread({
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

function ResolvedThread({
  entry,
  imageId,
  allMembers,
}: {
  entry: ThreadWithComments;
  imageId: Id;
  allMembers: Member[];
}) {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const labels = useCommentLabels();
  const action = useCommentAction();
  const [expanded, setExpanded] = useState(false);
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
