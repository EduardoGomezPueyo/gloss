import { useTranslation } from 'react-i18next';
import type { Platform } from '@/domain/types';

const PLATFORM_DOT_CLASS: Record<Platform, string> = {
  playstation: 'bg-platform-playstation',
  xbox: 'bg-platform-xbox',
  pc: 'bg-platform-pc',
  switch: 'bg-platform-switch',
};

export function PlatformDot({ platform }: { platform: Platform }) {
  return (
    <span aria-hidden className={`size-2 shrink-0 rounded-full ${PLATFORM_DOT_CLASS[platform]}`} />
  );
}

/** Platform tag (Figma component 298:615): coloured dot and name. */
export function PlatformChip({ platform }: { platform: Platform }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-tag-border bg-tag-bg px-3 py-1.5 font-heading text-xs leading-none font-semibold whitespace-nowrap text-text">
      <PlatformDot platform={platform} />
      {t(`platform.${platform}`)}
    </span>
  );
}
