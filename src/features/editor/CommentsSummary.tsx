import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useCommentAction, useComments } from '@/data/hooks';
import type { Id, LanguageCode, Member } from '@/domain/types';
import { Avatar } from '@/ui/Avatar';
import { textButton } from '@/ui/buttons';
import { CheckIcon, PlusIcon } from '@/ui/icons';
import { CommentComposer } from './CommentComposer';
import { useCommentLabels } from './useCommentLabels';
import { innerCard } from './styles';

const SHOWN = 3;

/**
 * Comments card under the image (DECISIONS D40): this image's open threads, one
 * line each, with Resolve. "+ Comment" writes a new one here; "View all", or a
 * thread's "N replies", opens the side bar with the replies and resolved threads.
 */
export function CommentsSummary({
  imageId,
  languages,
  defaultLanguage,
  members,
  allMembers,
  onViewAll,
}: {
  imageId: Id;
  languages: LanguageCode[];
  defaultLanguage: LanguageCode | null;
  /** The project's people, offered as mentions. */
  members: Member[];
  /** Everyone, to name authors who left the project. */
  allMembers: Member[];
  /** Opens the side bar, on one thread when given. */
  onViewAll: (threadId?: Id) => void;
}) {
  const { t } = useTranslation();
  const headingId = useId();
  const labels = useCommentLabels();
  const comments = useComments(imageId);
  const threads = comments.data ?? [];
  const open = threads.filter(({ thread }) => !thread.resolvedAt);
  const [composing, setComposing] = useState(false);
  const { currentUser } = useCurrentUser();
  const action = useCommentAction();

  return (
    <section aria-labelledby={headingId} className={innerCard}>
      <div className="flex items-center justify-between gap-4">
        <h3 id={headingId} className="font-heading text-lg font-bold text-text">
          {t('editor.comments')}
        </h3>
        <div className="flex items-center gap-4">
          {!composing && (
            <button type="button" onClick={() => setComposing(true)} className={textButton}>
              <PlusIcon className="size-3.5" />
              {t('editor.newComment')}
            </button>
          )}
          <button
            type="button"
            onClick={() => onViewAll()}
            className={`${textButton} font-semibold text-accent-text hover:text-accent-text hover:underline`}
          >
            {t('editor.viewAll')}
          </button>
        </div>
      </div>

      {composing && (
        <CommentComposer
          imageId={imageId}
          languages={languages}
          defaultLanguage={defaultLanguage}
          members={members}
          autoFocus
          onCancel={() => setComposing(false)}
          onDone={() => setComposing(false)}
        />
      )}

      {open.length === 0 ? (
        <p className="text-sm text-text-tertiary">
          {threads.length === 0 ? t('editor.noComments') : t('editor.noOpen')}
        </p>
      ) : (
        <ul className="flex flex-col">
          {open.slice(0, SHOWN).map(({ thread, comments: [first, ...replies] }) => {
            const author = allMembers.find((m) => m.id === first?.authorId);
            return (
              <li key={thread.id} className="border-b border-border last:border-0">
                <div className="flex items-center gap-3 py-2.5">
                  {author && <Avatar member={author} size="md" />}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="truncate font-semibold text-text">
                        {author?.name ?? t('editor.someone')}
                      </span>
                      <span className="shrink-0 text-accent-text">
                        {labels.language(thread.language)}
                      </span>
                    </span>
                    <span className="truncate text-sm text-text-secondary">{first?.body}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1 text-xs text-text-secondary">
                    {first && labels.time(first.createdAt)}
                    <span className="flex items-center gap-4">
                      {replies.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onViewAll(thread.id)}
                          className="rounded-sm font-semibold text-accent-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-strong"
                        >
                          {t('editor.replies', { count: replies.length })}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          action.mutate({
                            kind: 'resolve',
                            imageId,
                            threadId: thread.id,
                            by: currentUser?.id ?? null,
                          })
                        }
                        disabled={action.isPending}
                        className="inline-flex items-center gap-0.5 rounded-sm text-xs text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong disabled:opacity-60"
                      >
                        <CheckIcon className="size-3.5" />
                        {t('editor.resolve')}
                      </button>
                    </span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {open.length > SHOWN && (
        <p className="-mt-2 text-sm text-text-secondary">
          {t('editor.moreThreads', { count: open.length - SHOWN })}
        </p>
      )}
    </section>
  );
}
