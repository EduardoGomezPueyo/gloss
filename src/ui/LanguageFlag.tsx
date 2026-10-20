import {
  BR,
  CN,
  DE,
  ES,
  FR,
  GB,
  IT,
  JP,
  KR,
  MX,
  NL,
  PL,
  PT,
  RU,
  SA,
  TR,
} from 'country-flag-icons/react/3x2';
import { languageInfo } from '@/domain/languages';
import type { LanguageCode } from '@/domain/types';

// Named imports keep the bundle to the flags in the language catalog.
const FLAGS = { BR, CN, DE, ES, FR, GB, IT, JP, KR, MX, NL, PL, PT, RU, SA, TR };

/** Small decorative flag next to a language name (emoji flags do not render on Windows). */
export function LanguageFlag({ code }: { code: LanguageCode }) {
  const region = languageInfo(code)?.flag;
  const Flag = region ? FLAGS[region as keyof typeof FLAGS] : undefined;
  if (!Flag) return null;
  return <Flag aria-hidden className="h-2 w-3 shrink-0 rounded-[1px]" />;
}
