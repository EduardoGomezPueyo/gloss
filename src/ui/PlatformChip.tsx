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

/** Platform tag (Figma component 298:615): coloured dot and name, outlined with no fill, 28px tall. */
export function PlatformChip({ platform }: { platform: Platform }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-tag-border px-[11px] py-[5px] font-heading text-xs leading-4 font-semibold whitespace-nowrap text-text">
      <PlatformDot platform={platform} />
      {t(`platform.${platform}`)}
    </span>
  );
}
