import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { languageName } from '@/domain/languages';
import { formatRelativeTime } from '@/domain/relativeTime';
import type { LanguageCode, Member, Translation } from '@/domain/types';
import { textButton } from '@/ui/buttons';
import { SelectInput } from '@/ui/form';
import { PencilIcon } from '@/ui/icons';
import { StatusIcon } from '@/ui/StatusIcon';

/**
 * Another language's translation of the same image, for comparison (SPEC 5.4).
 * Read-only: "Edit <language>" switches the editor to it.
 */
export function ComparisonCard({
  languages,
  translationOf,
  members,
  onEdit,
}: {
  /** Target languages other than the one being edited. */
  languages: LanguageCode[];
  translationOf: (language: LanguageCode) => Translation | undefined;
  members: Member[];
  onEdit: (language: LanguageCode) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';
  // Start with the first language that already has text, if any.
  const [chosen, setChosen] = useState<LanguageCode>(
    () => languages.find((l) => translationOf(l)?.text) ?? languages[0]!,
  );
  const language = languages.includes(chosen) ? chosen : languages[0]!;
  const translation = translationOf(language);
  const status = translation?.status ?? 'not-started';
  const name = languageName(language, locale);
  const author = members.find((m) => m.id === translation?.updatedBy)?.name;

  return (
    <section
      aria-label={t('editor.compareWith')}
      className="flex flex-col gap-4 rounded-2xl bg-card p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <SelectInput
          value={language}
          onChange={setChosen}
          label={t('editor.compareWith')}
          options={languages.map((code) => ({ value: code, label: languageName(code, locale) }))}
          className="h-9 w-auto gap-2 rounded-lg px-2 font-heading text-lg font-bold text-text outline-none hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-border-strong"
        />
        <span className="flex items-center gap-2 text-sm text-text">
          <StatusIcon status={status} decorative />
          {t(`status.${status}`)}
        </span>
      </div>
      <p
        lang={language}
        className="min-h-20 rounded-lg border border-border-input px-4 py-3 text-base whitespace-pre-wrap text-text"
      >
        {translation?.text || (
          <span className="text-text-tertiary">{t('editor.noTranslation')}</span>
        )}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-text-secondary">
          {translation &&
            [author, formatRelativeTime(translation.updatedAt, new Date(), locale)]
              .filter(Boolean)
              .join(' · ')}
        </span>
        <button
          type="button"
          onClick={() => onEdit(language)}
          className={`${textButton} font-semibold text-accent-text`}
        >
          <PencilIcon />
          {t('editor.editLanguage', { language: name })}
        </button>
      </div>
    </section>
  );
}
