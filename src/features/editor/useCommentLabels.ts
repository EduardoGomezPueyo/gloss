import { useTranslation } from 'react-i18next';
import { languageName } from '@/domain/languages';
import { formatRelativeTime } from '@/domain/relativeTime';
import type { LanguageCode } from '@/domain/types';

/** A thread's language ("General" when it has none) and relative times. */
export function useCommentLabels() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';
  return {
    language: (code: LanguageCode | null) =>
      code ? languageName(code, locale) : t('editor.general'),
    time: (at: string) => formatRelativeTime(at, new Date(), locale),
  };
}
