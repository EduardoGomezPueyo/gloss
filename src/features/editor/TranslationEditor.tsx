import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useReview, useSaveTranslation, useSetReady } from '@/data/hooks';
import { languageName } from '@/domain/languages';
import { formatRelativeTime } from '@/domain/relativeTime';
import { textStats } from '@/domain/textStats';
import { canMarkTranslated, canReview } from '@/domain/translationWorkflow';
import type { LanguageCode, Member, SceneImage, Translation } from '@/domain/types';
import { accentButton, neutralButton, secondaryButton } from '@/ui/buttons';
import { SelectInput } from '@/ui/form';
import { CheckIcon } from '@/ui/icons';
import { StatusIcon } from '@/ui/StatusIcon';
import { useAutosave, type SaveState } from './useAutosave';

/**
 * Editor for one image in one language (SPEC 5.4). Text autosaves; the action
 * follows the review flow (DECISIONS D30): Mark translated while in progress,
 * Approve / Request changes for managers once under review.
 */
export function TranslationEditor({
  image,
  language,
  languages,
  translation,
  members,
  onLanguageChange,
  onSaveStateChange,
}: {
  image: SceneImage;
  language: LanguageCode;
  languages: LanguageCode[];
  translation: Translation | undefined;
  members: Member[];
  onLanguageChange: (language: LanguageCode) => void;
  onSaveStateChange: (state: SaveState) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';
  const { currentUser } = useCurrentUser();
  const by = currentUser?.id ?? null;
  const id = useId();
  const save = useSaveTranslation();
  const setReady = useSetReady();
  const review = useReview();

  // The draft starts from the stored text; this component remounts per image and language.
  const [draft, setDraft] = useState(translation?.text ?? '');
  const autosave = useAutosave(draft, (text) =>
    save.mutateAsync({ imageId: image.id, language, text, by }),
  );
  useEffect(() => onSaveStateChange(autosave.state), [autosave.state, onSaveStateChange]);

  const status = translation?.status ?? 'not-started';
  const ready = translation?.ready ?? false;
  const stats = textStats(draft);
  const sourceStats = textStats(image.source.text);
  const statsText = (s: typeof stats) =>
    `${t('editor.characters', { count: s.characters })} · ${t('editor.lines', { count: s.lines })}`;
  const name = languageName(language, locale);
  const nameOf = (memberId: string | null) =>
    members.find((m) => m.id === memberId)?.name ?? t('editor.someone');

  const markTranslated = async (value: boolean) => {
    await autosave.flush();
    setReady.mutate({ imageId: image.id, language, ready: value, by });
  };
  const decide = (decision: 'approve' | 'requestChanges') => {
    if (currentUser) review.mutate({ imageId: image.id, language, decision, by: currentUser.id });
  };

  return (
    <section
      aria-label={t('editor.translationOf', { language: name })}
      className="flex flex-col gap-5 rounded-2xl border border-accent/50 bg-card p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <SelectInput
          value={language}
          onChange={onLanguageChange}
          label={t('editor.translationLanguage')}
          options={languages.map((code) => ({ value: code, label: languageName(code, locale) }))}
          className="h-9 w-auto gap-2 rounded-lg px-2 font-heading text-lg font-bold text-text outline-none hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-border-strong"
        />
        <span
          className={`flex items-center gap-2 text-sm ${status === 'not-started' ? 'text-text-secondary' : 'text-text'}`}
        >
          <StatusIcon status={status} decorative />
          {t(`status.${status}`)}
          {ready && <span className="text-text-secondary">· {t('editor.markedTranslated')}</span>}
        </span>
      </div>

      {image.source.speaker && (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          {t('editor.speaker')}
          <span className="font-semibold text-text">{image.source.speaker}</span>
          <span title={t('editor.speakerLocked')} aria-label={t('editor.speakerLocked')}>
            <LockIcon />
          </span>
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-text`} className="sr-only">
          {t('editor.translationOf', { language: name })}
        </label>
        <textarea
          id={`${id}-text`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void autosave.flush()}
          rows={5}
          lang={language}
          className="min-h-36 w-full resize-y rounded-lg border border-border-input bg-popup px-4 py-3 text-base text-text outline-none focus-visible:border-text-tertiary"
        />
        <div className="flex flex-wrap justify-between gap-2 text-sm text-text-secondary">
          <span>{statsText(stats)}</span>
          <span>{t('editor.sourceStats', { stats: statsText(sourceStats) })}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-sm text-text-secondary">
          {translation
            ? t(translation.updatedBy === by ? 'editor.editedByYou' : 'editor.editedBy', {
                name: nameOf(translation.updatedBy),
                time: formatRelativeTime(translation.updatedAt, new Date(), locale),
              })
            : t('editor.notTranslated')}
        </span>

        {status === 'under-review' ? (
          canReview(currentUser) ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => decide('requestChanges')}
                disabled={review.isPending}
                className={secondaryButton}
              >
                {t('editor.requestChanges')}
              </button>
              <button
                type="button"
                onClick={() => decide('approve')}
                disabled={review.isPending}
                className={accentButton}
              >
                <CheckIcon />
                {t('editor.approve')}
              </button>
            </div>
          ) : (
            <span className="text-sm text-text-secondary">{t('editor.waitingReview')}</span>
          )
        ) : status === 'completed' ? (
          <span className="flex items-center gap-2 text-sm text-status-completed">
            <CheckIcon />
            {t('editor.approvedBy', { name: nameOf(translation?.reviewerId ?? null) })}
          </span>
        ) : ready ? (
          <button
            type="button"
            aria-pressed="true"
            onClick={() => void markTranslated(false)}
            disabled={setReady.isPending}
            className={neutralButton}
          >
            <CheckIcon />
            {t('editor.markedTranslated')}
          </button>
        ) : (
          <button
            type="button"
            aria-pressed="false"
            onClick={() => void markTranslated(true)}
            disabled={
              setReady.isPending || !canMarkTranslated({ status: 'in-progress', text: draft })
            }
            className={accentButton}
          >
            <CheckIcon />
            {t('editor.markTranslated')}
          </button>
        )}
      </div>
    </section>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="size-4">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
