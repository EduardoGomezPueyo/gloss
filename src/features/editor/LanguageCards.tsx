import { useTranslation } from 'react-i18next';
import { languageName } from '@/domain/languages';
import { aggregateStatus } from '@/domain/status';
import { isTranslated } from '@/domain/translationWorkflow';
import type { LanguageCode, SceneImage, Translation } from '@/domain/types';
import { Card, CardTitle } from '@/ui/Card';
import { StatusIcon } from '@/ui/StatusIcon';

/** "Translations": one card per target language with its status in this item. */
export function LanguageCards({
  languages,
  images,
  translations,
  selected,
  onSelect,
}: {
  languages: LanguageCode[];
  images: SceneImage[];
  translations: Translation[];
  selected: LanguageCode | undefined;
  onSelect: (language: LanguageCode) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';

  return (
    <Card>
      <CardTitle>{t('editor.translations')}</CardTitle>
      {languages.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('editor.noLanguages')}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 2xl:grid-cols-3">
            {languages.map((language) => {
              const cells = images.map((image) =>
                translations.find((t) => t.imageId === image.id && t.language === language),
              );
              const status = aggregateStatus(cells.map((c) => c?.status ?? 'not-started'));
              const done = cells.filter(isTranslated).length;
              const isSelected = language === selected;
              return (
                <button
                  key={language}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(language)}
                  className={`flex flex-col gap-2 rounded-xl border px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-strong ${
                    isSelected
                      ? 'border-accent/50 bg-accent/5'
                      : 'border-border-strong hover:border-text-tertiary'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={`truncate text-base font-semibold ${isSelected ? 'text-accent-text' : 'text-text'}`}
                    >
                      {languageName(language, locale)}
                    </span>
                    <StatusIcon status={status} progress={done / (images.length || 1)} />
                  </span>
                  <span className="text-sm text-text-secondary">
                    {t('editor.translatedCount', { done, total: images.length })}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-sm text-text-secondary">{t('editor.selectLanguage')}</p>
        </>
      )}
    </Card>
  );
}
