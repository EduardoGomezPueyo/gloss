import type { LanguageCode } from './types';

/*
 * Languages a project can use as source or target. Display names come from
 * Intl.DisplayNames in the interface language, so they are not i18n keys.
 * The flag is the ISO 3166 region used to illustrate the language.
 */

export interface LanguageInfo {
  code: LanguageCode;
  flag: string;
}

export const LANGUAGES: readonly LanguageInfo[] = [
  { code: 'en', flag: 'GB' },
  { code: 'es', flag: 'ES' },
  { code: 'fr', flag: 'FR' },
  { code: 'de', flag: 'DE' },
  { code: 'it', flag: 'IT' },
  { code: 'pt', flag: 'PT' },
  { code: 'pt-BR', flag: 'BR' },
  { code: 'es-419', flag: 'MX' },
  { code: 'ja', flag: 'JP' },
  { code: 'zh', flag: 'CN' },
  { code: 'ko', flag: 'KR' },
  { code: 'ru', flag: 'RU' },
  { code: 'pl', flag: 'PL' },
  { code: 'nl', flag: 'NL' },
  { code: 'tr', flag: 'TR' },
  { code: 'ar', flag: 'SA' },
];

export function languageInfo(code: LanguageCode): LanguageInfo | undefined {
  return LANGUAGES.find((language) => language.code === code);
}

/** Name of `code` written in `displayLocale`, e.g. ("ja", "es") → "Japonés". */
export function languageName(code: LanguageCode, displayLocale: string): string {
  let name: string | undefined;
  try {
    name = new Intl.DisplayNames([displayLocale], { type: 'language' }).of(code);
  } catch {
    name = undefined;
  }
  if (!name) return code;
  return name.charAt(0).toLocaleUpperCase(displayLocale) + name.slice(1);
}

/** Target languages never include the source language (SPEC 6). */
export function withoutSource(
  targets: readonly LanguageCode[],
  source: LanguageCode | null,
): LanguageCode[] {
  return targets.filter((code) => code !== source);
}
