import { useTranslation } from 'react-i18next';
import { LANGUAGES, languageName } from '@/domain/languages';
import type { LanguageCode } from '@/domain/types';
import { SelectInput } from './form';
import { LanguageFlag } from './LanguageFlag';

/** Language dropdown with flags; names in the interface language. */
export function LanguageSelect({
  id,
  value,
  onChange,
  options = LANGUAGES.map(({ code }) => code),
  label,
  invalid,
  describedBy,
}: {
  id?: string;
  value: LanguageCode | null;
  onChange: (code: LanguageCode) => void;
  /** Languages to offer; the whole catalog by default. */
  options?: readonly LanguageCode[];
  label?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';

  return (
    <SelectInput
      id={id}
      value={value}
      onChange={onChange}
      label={label}
      invalid={invalid}
      describedBy={describedBy}
      placeholder={t('createProject.sourceLanguagePlaceholder')}
      options={options.map((code) => ({
        value: code,
        label: languageName(code, locale),
        icon: <LanguageFlag code={code} />,
      }))}
    />
  );
}
