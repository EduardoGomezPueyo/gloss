import { Dialog, Tabs } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectAccess } from '@/app/projectAccess/ProjectAccessContext';
import { useComments } from '@/data/hooks';
import { languageName } from '@/domain/languages';
import type { Id, LanguageCode, Member } from '@/domain/types';
import { CloseIcon } from '@/ui/CloseIcon';
import { SelectInput } from '@/ui/form';
import { CommentComposer } from './CommentComposer';
import { OpenThread, ResolvedThread } from './CommentThreads';

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
