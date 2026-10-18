import { DropdownMenu } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import UserAvatarIcon from '@/assets/icons/user-avatar.svg?react';
import { UI_LANGUAGES, type UiLanguage } from '@/i18n';
import type { ThemePreference } from '../theme/theme';
import { useTheme } from '../theme/useTheme';

const THEME_OPTIONS = [
  { value: 'system', labelKey: 'userMenu.themeSystem' },
  { value: 'light', labelKey: 'userMenu.themeLight' },
  { value: 'dark', labelKey: 'userMenu.themeDark' },
] as const satisfies ReadonlyArray<{ value: ThemePreference; labelKey: string }>;

const itemClass =
  'flex cursor-pointer items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-xs text-text-secondary outline-none data-[highlighted]:bg-fill-subtle data-[highlighted]:text-text';

/**
 * Menu opened from the avatar at the bottom of the sidebar. Not in the design:
 * it hosts the theme and interface-language switches (see docs/DECISIONS.md).
 */
export function UserMenu() {
  const { t, i18n } = useTranslation();
  const { preference, setPreference } = useTheme();
  const currentLanguage = (i18n.resolvedLanguage ?? 'en') as UiLanguage;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t('userMenu.open')}
        className="rounded-full text-nav-unselected transition-colors outline-none hover:text-nav-selected focus-visible:ring-2 focus-visible:ring-border-strong"
      >
        <UserAvatarIcon aria-hidden className="size-8" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={8}
          className="z-50 min-w-44 rounded-lg border border-border-strong bg-popup p-1 shadow-lg"
        >
          <DropdownMenu.Label className="px-2 pt-1.5 pb-1 text-[10px] text-text-tertiary uppercase">
            {t('userMenu.theme')}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={preference}
            onValueChange={(value) => setPreference(value as ThemePreference)}
          >
            {THEME_OPTIONS.map((option) => (
              <DropdownMenu.RadioItem key={option.value} value={option.value} className={itemClass}>
                {t(option.labelKey)}
                <DropdownMenu.ItemIndicator>✓</DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>

          <DropdownMenu.Separator className="my-1 h-px bg-border-strong" />

          <DropdownMenu.Label className="px-2 pt-1.5 pb-1 text-[10px] text-text-tertiary uppercase">
            {t('userMenu.language')}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={currentLanguage}
            onValueChange={(value) => void i18n.changeLanguage(value)}
          >
            {UI_LANGUAGES.map((language) => (
              <DropdownMenu.RadioItem key={language} value={language} className={itemClass}>
                {t(`languages.${language}`)}
                <DropdownMenu.ItemIndicator>✓</DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
