import { DropdownMenu } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import UserAvatarIcon from '@/assets/icons/user-avatar.svg?react';
import { UI_LANGUAGES } from '@/i18n';
import { useCurrentUser } from '../currentUser/useCurrentUser';
import { useTheme } from '../theme/useTheme';
import { useDemoActions } from './useDemoActions';

const itemClass =
  'flex cursor-pointer items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-xs text-text-secondary outline-none data-[highlighted]:bg-fill-subtle data-[highlighted]:text-text data-[disabled]:cursor-wait data-[disabled]:opacity-60';
const labelClass = 'px-2 pt-1.5 pb-1 text-[10px] text-text-tertiary uppercase';
const separatorClass = 'my-1 h-px bg-border';

interface UserMenuProps {
  /**
   * The sidebar is collapsed: the theme, language and demo controls that sit
   * next to the avatar move into this menu (DECISIONS D46).
   */
  withShellControls?: boolean;
}

/**
 * Menu opened from the avatar at the bottom of the sidebar. Not in the design
 * (DECISIONS D6, D20, D26): simulated current user. Theme and
 * language live next to it, in ThemeSwitch and LanguageToggle.
 */
export function UserMenu({ withShellControls = false }: UserMenuProps) {
  const { t } = useTranslation();
  const { currentUser, selectableMembers, setCurrentUserId } = useCurrentUser();

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
          {withShellControls && <ShellControls />}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Theme, interface language and demo, as menu items. */
function ShellControls() {
  const { t, i18n } = useTranslation();
  const { theme, setPreference } = useTheme();
  const { kind, demo, loading, failed, load, exit } = useDemoActions();

  return (
    <>
      <DropdownMenu.Separator className={separatorClass} />
      <DropdownMenu.Label className={labelClass}>{t('userMenu.theme')}</DropdownMenu.Label>
      <DropdownMenu.RadioGroup
        value={theme}
        onValueChange={(value) => setPreference(value === 'dark' ? 'dark' : 'light')}
      >
        {(['light', 'dark'] as const).map((value) => (
          <DropdownMenu.RadioItem key={value} value={value} className={itemClass}>
            {t(`userMenu.${value}`)}
            <DropdownMenu.ItemIndicator>✓</DropdownMenu.ItemIndicator>
          </DropdownMenu.RadioItem>
        ))}
      </DropdownMenu.RadioGroup>

      <DropdownMenu.Separator className={separatorClass} />
      <DropdownMenu.Label className={labelClass}>{t('sidebar.language')}</DropdownMenu.Label>
      <DropdownMenu.RadioGroup
        value={i18n.resolvedLanguage ?? 'en'}
        onValueChange={(value) => void i18n.changeLanguage(value)}
      >
        {UI_LANGUAGES.map((language) => (
          <DropdownMenu.RadioItem key={language} value={language} className={itemClass}>
            {t(`languages.${language}`)}
            <DropdownMenu.ItemIndicator>✓</DropdownMenu.ItemIndicator>
          </DropdownMenu.RadioItem>
        ))}
      </DropdownMenu.RadioGroup>

      {demo && (
        <>
          <DropdownMenu.Separator className={separatorClass} />
          <DropdownMenu.Label className={labelClass} title={t('demo.activeHint')}>
            {t('demo.active')}
          </DropdownMenu.Label>
          {kind === 'demo' ? (
            <DropdownMenu.Item className={itemClass} onSelect={() => void exit()}>
              {t('demo.exit')}
            </DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item
              className={itemClass}
              disabled={loading}
              // Stay open so the loading text and a failure stay visible.
              onSelect={(event) => {
                event.preventDefault();
                void load();
              }}
            >
              {loading ? t('demo.loading') : t('demo.load')}
            </DropdownMenu.Item>
          )}
          {failed && (
            <p role="alert" className="px-2 py-1 text-xs text-text-secondary">
              {t('demo.loadError')}
            </p>
          )}
          {demo.imagesUrl && (
            <DropdownMenu.Item asChild className={itemClass}>
              <a href={demo.imagesUrl} target="_blank" rel="noreferrer">
                {t('demo.realImages')} ↗
              </a>
            </DropdownMenu.Item>
          )}
        </>
      )}
    </>
  );
}
