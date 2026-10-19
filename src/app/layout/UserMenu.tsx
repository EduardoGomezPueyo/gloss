import { useQueryClient } from '@tanstack/react-query';
import { DropdownMenu } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import UserAvatarIcon from '@/assets/icons/user-avatar.svg?react';
import { useRepositories } from '@/data/RepositoryContext';
import { UI_LANGUAGES, type UiLanguage } from '@/i18n';
import { useCurrentUser } from '../currentUser/useCurrentUser';
import type { ThemePreference } from '../theme/theme';
import { useTheme } from '../theme/useTheme';

const THEME_OPTIONS = [
  { value: 'system', labelKey: 'userMenu.themeSystem' },
  { value: 'light', labelKey: 'userMenu.themeLight' },
  { value: 'dark', labelKey: 'userMenu.themeDark' },
] as const satisfies ReadonlyArray<{ value: ThemePreference; labelKey: string }>;

const itemClass =
  'flex cursor-pointer items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-xs text-text-secondary outline-none data-[highlighted]:bg-fill-subtle data-[highlighted]:text-text';
const labelClass = 'px-2 pt-1.5 pb-1 text-[10px] text-text-tertiary uppercase';
const separatorClass = 'my-1 h-px bg-border-strong';

/**
 * Menu opened from the avatar at the bottom of the sidebar. Not in the design
 * (DECISIONS D6): simulated current user, theme, interface language and demo reset.
 */
export function UserMenu() {
  const { t, i18n } = useTranslation();
  const { preference, setPreference } = useTheme();
  const { currentUser, selectableMembers, setCurrentUserId } = useCurrentUser();
  const { demo } = useRepositories();
  const queryClient = useQueryClient();
  const currentLanguage = (i18n.resolvedLanguage ?? 'en') as UiLanguage;

  const resetDemo = async () => {
    if (!window.confirm(t('userMenu.resetDemoConfirm'))) return;
    await demo.reset();
    await queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== 'bootstrap',
    });
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t('userMenu.open')}
        title={currentUser?.name}
        className="rounded-full text-nav-unselected transition-colors outline-none hover:text-nav-selected focus-visible:ring-2 focus-visible:ring-border-strong"
      >
        <UserAvatarIcon aria-hidden className="size-8" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={8}
          className="z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-52 overflow-y-auto rounded-lg border border-border-strong bg-popup p-1 shadow-lg"
        >
          <DropdownMenu.Label className={labelClass}>
            {t('userMenu.currentUser')}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={currentUser?.id} onValueChange={setCurrentUserId}>
            {selectableMembers.map((member) => (
              <DropdownMenu.RadioItem key={member.id} value={member.id} className={itemClass}>
                <span className="flex flex-col">
                  <span>{member.name}</span>
                  <span className="text-[10px] text-text-tertiary">
                    {t(`memberCategory.${member.category}`)}
                  </span>
                </span>
                <DropdownMenu.ItemIndicator>✓</DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>

          <DropdownMenu.Separator className={separatorClass} />

          <DropdownMenu.Label className={labelClass}>{t('userMenu.theme')}</DropdownMenu.Label>
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

          <DropdownMenu.Separator className={separatorClass} />

          <DropdownMenu.Label className={labelClass}>{t('userMenu.language')}</DropdownMenu.Label>
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

          <DropdownMenu.Separator className={separatorClass} />

          <DropdownMenu.Item className={itemClass} onSelect={() => void resetDemo()}>
            {t('userMenu.resetDemo')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
