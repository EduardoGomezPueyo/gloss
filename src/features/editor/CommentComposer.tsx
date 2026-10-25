import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useCommentAction } from '@/data/hooks';
import { languageName } from '@/domain/languages';
import type { Id, LanguageCode, Member } from '@/domain/types';
import { neutralButton, textButton } from '@/ui/buttons';
import { SelectInput } from '@/ui/form';
import { MentionTextarea } from './MentionTextarea';

/** Menu value for threads not tied to one language. */
const GENERAL = 'general';

/**
 * Starts a thread on the image: text with @mentions and the thread's language
 * (or General). Used in the Comments card and in the side bar (DECISIONS D40).
 */
export function CommentComposer({
  imageId,
  languages,
  defaultLanguage,
  members,
  autoFocus,
  onCancel,
  onDone,
}: {
  imageId: Id;
  languages: LanguageCode[];
  defaultLanguage: LanguageCode | null;
  /** The project's people, offered as mentions. */
  members: Member[];
  autoFocus?: boolean;
  /** Shows a Cancel button. */
  onCancel?: () => void;
  /** Called once the comment is saved. */
  onDone?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';
  const { currentUser } = useCurrentUser();
  const action = useCommentAction();
  const [body, setBody] = useState('');
  const [language, setLanguage] = useState<string>(defaultLanguage ?? GENERAL);
  const languageOptions = [
    { value: GENERAL, label: t('editor.general') },
    ...languages.map((code) => ({ value: code, label: languageName(code, locale) })),
  ];

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
      {
        onSuccess: () => {
          setBody('');
          onDone?.();
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <MentionTextarea
        value={body}
        onChange={setBody}
        members={members}
        placeholder={t('editor.composerPlaceholder')}
        label={t('editor.composerPlaceholder')}
        autoFocus={autoFocus}
      />
      <div className="flex items-center justify-between gap-3">
        <SelectInput
          value={language}
          onChange={setLanguage}
          label={t('editor.commentLanguage')}
          options={languageOptions}
          className="h-8 w-auto gap-1.5 rounded-lg px-2 text-sm text-text-secondary outline-none hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-border-strong"
        />
        <div className="flex items-center gap-3">
          {onCancel && (
            <button type="button" onClick={onCancel} className={textButton}>
              {t('editor.cancel')}
            </button>
          )}
          <button
            type="submit"
            disabled={!body.trim() || action.isPending}
            className={neutralButton}
          >
            {t('editor.comment')}
          </button>
        </div>
      </div>
    </form>
  );
}
