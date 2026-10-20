import { ToggleGroup } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { UI_LANGUAGES, type UiLanguage } from '@/i18n';

/** EN / ES interface language toggle next to the avatar (DECISIONS D26). */
export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'en') as UiLanguage;

  return (
    <ToggleGroup.Root
      type="single"
      value={current}
      // Radix sends '' when the active item is clicked again; keep the current language.
      onValueChange={(value) => value && void i18n.changeLanguage(value)}
      aria-label={t('sidebar.language')}
      className="flex shrink-0 rounded-full border border-border-strong p-0.5"
    >
      {UI_LANGUAGES.map((language) => (
        <ToggleGroup.Item
          key={language}
          value={language}
          aria-label={t(`languages.${language}`)}
          className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary uppercase outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong data-[state=on]:bg-fill-subtle data-[state=on]:text-text"
        >
          {language}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
