import { useQueryClient } from '@tanstack/react-query';
import { DropdownMenu } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import UserAvatarIcon from '@/assets/icons/user-avatar.svg?react';
import { useRepositories } from '@/data/RepositoryContext';
import { useCurrentUser } from '../currentUser/useCurrentUser';

const itemClass =
  'flex cursor-pointer items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-xs text-text-secondary outline-none data-[highlighted]:bg-fill-subtle data-[highlighted]:text-text';
const labelClass = 'px-2 pt-1.5 pb-1 text-[10px] text-text-tertiary uppercase';
const separatorClass = 'my-1 h-px bg-border-strong';

/**
 * Menu opened from the avatar at the bottom of the sidebar. Not in the design
 * (DECISIONS D6, D20, D26): simulated current user and demo reset. Theme and
 * language live next to it, in ThemeSwitch and LanguageToggle.
 */
export function UserMenu() {
  const { t } = useTranslation();
  const { currentUser, selectableMembers, setCurrentUserId } = useCurrentUser();
  const { demo } = useRepositories();
  const queryClient = useQueryClient();

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

          <DropdownMenu.Item className={itemClass} onSelect={() => void resetDemo()}>
            {t('userMenu.resetDemo')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
