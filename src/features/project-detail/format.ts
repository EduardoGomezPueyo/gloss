import { useTranslation } from 'react-i18next';
import type { Status } from '@/domain/types';

/** Locale-aware number ("142,000" / "142.000"). */
export function useFormatNumber() {
  const { i18n } = useTranslation();
  const format = new Intl.NumberFormat(i18n.resolvedLanguage ?? 'en');
  return (value: number) => format.format(value);
}

/** Icon status for a bare progress value: empty, partial pie or complete. */
export function progressIconStatus(progress: number): Status {
  if (progress <= 0) return 'not-started';
  if (progress >= 1) return 'completed';
  return 'in-progress';
}
