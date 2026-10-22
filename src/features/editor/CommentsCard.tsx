import { Tabs } from 'radix-ui';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useCommentAction, useComments } from '@/data/hooks';
import type { ThreadWithComments } from '@/data/repositories/types';
import { languageName } from '@/domain/languages';
import { formatRelativeTime } from '@/domain/relativeTime';
import type { Comment, Id, LanguageCode, Member } from '@/domain/types';
import { Avatar } from '@/ui/Avatar';
import { neutralButton, textButton } from '@/ui/buttons';
import { Card, CardTitle } from '@/ui/Card';
import { SelectInput } from '@/ui/form';
import { CheckIcon } from '@/ui/icons';
import { CommentBody, MentionTextarea } from './MentionTextarea';

const ALL = 'all';
const GENERAL = 'general';

/**
 * Comments about the current image (SPEC 5.4): Open and Resolved tabs, a language
 * filter, threads with replies, Resolve / Reopen, and a composer with @mentions.
 * No categories for now (DECISIONS D30).
 */
export function CommentsCard({
  imageId,
  languages,
  defaultLanguage,
  members,
  allMembers,
}: {
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
    <Card>
      <div className="flex items-center justify-between gap-4">
        <CardTitle>{t('editor.comments')}</CardTitle>
        <span className="text-sm text-text-secondary">{t('editor.thisImage')}</span>
      </div>

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

      <Composer
        imageId={imageId}
        languageOptions={languageOptions}
        defaultLanguage={defaultLanguage ?? GENERAL}
        members={members}
      />
    </Card>
  );
}

function useLabels() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';
  return {
    language: (code: LanguageCode | null) =>
      code ? languageName(code, locale) : t('editor.general'),
    time: (at: string) => formatRelativeTime(at, new Date(), locale),
  };
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
  const labels = useLabels();
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
  imageId,
  members,
  allMembers,
}: {
  entry: ThreadWithComments;
  imageId: Id;
  members: Member[];
  allMembers: Member[];
}) {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const labels = useLabels();
  const action = useCommentAction();
  const [reply, setReply] = useState<string | null>(null);
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
    <article className="flex flex-col gap-3 border-b border-border pb-5 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-accent-text">{labels.language(entry.thread.language)}</span>
        <button
          type="button"
          onClick={() => action.mutate({ kind: 'resolve', imageId, threadId: entry.thread.id, by })}
          disabled={action.isPending}
          className={textButton}
        >
          <CheckIcon />
          {t('editor.resolve')}
        </button>
      </div>
      {first && <CommentView comment={first} allMembers={allMembers} />}
      {replies.map((comment) => (
        <CommentView key={comment.id} comment={comment} allMembers={allMembers} reply />
      ))}
      {reply === null ? (
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
  const labels = useLabels();
  const action = useCommentAction();
  const [expanded, setExpanded] = useState(false);
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
      </div>
    </article>
  );
}

function Composer({
  imageId,
  languageOptions,
  defaultLanguage,
  members,
}: {
  imageId: Id;
  languageOptions: { value: string; label: string }[];
  defaultLanguage: string;
  members: Member[];
}) {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const action = useCommentAction();
  const [body, setBody] = useState('');
  const [language, setLanguage] = useState(defaultLanguage);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    action.mutate(
      {
        kind: 'start',
        imageId,
        language: language === GENERAL ? null : language,
        body,
        by: currentUser?.id ?? null,
      },
      { onSuccess: () => setBody('') },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 border-t border-border pt-5">
      <MentionTextarea
        value={body}
        onChange={setBody}
        members={members}
        placeholder={t('editor.composerPlaceholder')}
        label={t('editor.composerPlaceholder')}
      />
      <div className="flex items-center justify-between gap-3">
        <SelectInput
          value={language}
          onChange={setLanguage}
          label={t('editor.commentLanguage')}
          options={languageOptions}
          className="h-8 w-auto gap-1.5 rounded-lg px-2 text-sm text-text-secondary outline-none hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-border-strong"
        />
        <button type="submit" disabled={!body.trim() || action.isPending} className={neutralButton}>
          {t('editor.comment')}
        </button>
      </div>
    </form>
  );
}
