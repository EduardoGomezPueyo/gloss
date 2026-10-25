import { useEffect, useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useReview, useSaveTranslation, useSetReady } from '@/data/hooks';
import { languageName } from '@/domain/languages';
import { formatRelativeTime } from '@/domain/relativeTime';
import { textStats } from '@/domain/textStats';
import { canMarkTranslated, canReview } from '@/domain/translationWorkflow';
import type { LanguageCode, Member, SceneImage, Translation } from '@/domain/types';
import { accentButton, neutralButton } from '@/ui/buttons';
import { CheckIcon } from '@/ui/icons';
import { StatusBadge } from '@/ui/StatusBadge';
import { innerCard } from './styles';
import { useAutosave, type SaveState } from './useAutosave';
import { useProjectAccess } from '@/app/projectAccess/ProjectAccessContext';

/**
 * Editor for one image in one language (SPEC 5.4, DECISIONS D40). Text autosaves;
 * the action follows the review flow (D30): Mark translated while in progress,
 * Approve / Request changes for managers once under review. The character and
 * line counter, against the source, is the only help to make the text fit.
 */
export function TranslationEditor({
  image,
  language,
  languagePicker,
  translation,
  members,
  onSaveStateChange,
}: {
  image: SceneImage;
  language: LanguageCode;
  /** The "Spanish ▾" menu that switches the language. */
  languagePicker: ReactNode;
  translation: Translation | undefined;
  members: Member[];
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
  const { canWork } = useProjectAccess();

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
      className={`${innerCard} border-accent/50`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {languagePicker}
          <span className="text-sm text-text-secondary">{t('editor.pickLanguage')}</span>
        </div>
        <StatusBadge status={status} size="md" />
      </div>

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
          readOnly={!canWork}
          className="min-h-36 w-full resize-y rounded-lg border border-border-input bg-transparent px-4 py-3 text-base text-text outline-none focus-visible:border-text-tertiary"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex flex-col gap-1 text-sm text-text-secondary">
          <span>
            {translation
              ? t(translation.updatedBy === by ? 'editor.editedByYou' : 'editor.editedBy', {
                  name: nameOf(translation.updatedBy),
                  time: formatRelativeTime(translation.updatedAt, new Date(), locale),
                })
              : t('editor.notTranslated')}
          </span>
          <span className="text-xs text-text-tertiary">
            <span>{statsText(stats)}</span> ·{' '}
            {t('editor.sourceStats', { stats: statsText(sourceStats) })}
          </span>
        </div>

        {status === 'under-review' ? (
          canReview(currentUser) ? (
            <div className="ml-auto flex gap-3">
              <button
                type="button"
                onClick={() => decide('requestChanges')}
                disabled={review.isPending}
                className={neutralButton}
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
        ) : !canWork ? (
          ready && (
            <span className="text-sm text-text-secondary">{t('editor.markedTranslated')}</span>
          )
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
