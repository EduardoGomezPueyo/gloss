import { Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Tooltip as RadixTooltip } from 'radix-ui';
import AssignedIcon from '@/assets/icons/nav-assigned.svg?react';
import CommentsIcon from '@/assets/icons/nav-comments.svg?react';
import NotificationsIcon from '@/assets/icons/nav-notifications.svg?react';
import ProjectsIcon from '@/assets/icons/nav-projects.svg?react';
import SettingsIcon from '@/assets/icons/nav-settings.svg?react';
import { useNotifications } from '@/data/hooks';
import { GlossMark } from '@/ui/GlossMark';
import { SidebarCollapseIcon, SidebarExpandIcon } from '@/ui/icons';
import { Tooltip } from '@/ui/Tooltip';
import { useCurrentUser } from '../currentUser/useCurrentUser';
import { ContentPanel } from './ContentPanel';
import { DemoControls } from './DemoControls';
import { LanguageToggle } from './LanguageToggle';
import { SidebarNavItem } from './SidebarNavItem';
import { ThemeSwitch } from './ThemeSwitch';
import { UserMenu } from './UserMenu';
import { useSidebarCollapsed } from './useSidebarCollapsed';

/**
 * Translation space: general navigation on the left, content panel on the right.
 * The navigation collapses to an icon rail (DECISIONS D46).
 */
export function AppLayout() {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const notifications = useNotifications(currentUser?.id);
  const unread = (notifications.data ?? []).filter((e) => !e.notification.readAt).length;
  const { collapsed, toggle } = useSidebarCollapsed();
  const toggleLabel = t(collapsed ? 'sidebar.expand' : 'sidebar.collapse');

  return (
    <div className="flex h-full gap-4 p-4">
      <RadixTooltip.Provider delayDuration={300}>
        <nav
          aria-label={t('nav.label')}
          className={`flex h-full shrink-0 flex-col gap-2.5 overflow-clip p-2.5 transition-[width] duration-200 ${
            collapsed ? 'w-[52px]' : 'w-[182px]'
          }`}
        >
          {/*
            Left-anchored and slid with a transform, in step with the width transition:
            162px of content minus the 32px button when expanded; collapsed, it lines up
            with the nav icons.
          */}
          <div className="relative flex">
            <div
              aria-hidden={collapsed}
              className={`absolute inset-y-0 left-0 flex items-center gap-2 pl-2 transition-opacity duration-200 ${
                collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
              }`}
            >
              <GlossMark />
              <span className="text-base font-semibold tracking-tight text-text">
                {t('general.appName')}
              </span>
            </div>
            <Tooltip content={t('sidebar.shortcutHint', { action: toggleLabel })}>
              <button
                type="button"
                aria-label={toggleLabel}
                aria-expanded={!collapsed}
                onClick={toggle}
                className={`rounded-md p-2 text-nav-unselected transition-[color,background-color,translate] duration-200 outline-none hover:bg-fill-subtle hover:text-nav-selected focus-visible:ring-2 focus-visible:ring-border-strong ${
                  collapsed ? 'translate-x-0' : 'translate-x-[130px]'
                }`}
              >
                {collapsed ? <SidebarExpandIcon /> : <SidebarCollapseIcon />}
              </button>
            </Tooltip>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <SidebarNavItem
              icon={ProjectsIcon}
              label={t('nav.projects')}
              to="/projects"
              collapsed={collapsed}
            />
            <SidebarNavItem
              icon={NotificationsIcon}
              label={t('nav.notifications')}
              to="/notifications"
              badge={unread}
              badgeLabel={t('notifications.unreadCount', { count: unread })}
              collapsed={collapsed}
            />
            <SidebarNavItem
              icon={AssignedIcon}
              label={t('nav.assignedToMe')}
              to="/assigned"
              collapsed={collapsed}
            />
            <SidebarNavItem
              icon={CommentsIcon}
              label={t('nav.comments')}
              to="/comments"
              collapsed={collapsed}
            />
            <SidebarNavItem
              icon={SettingsIcon}
              label={t('nav.settings')}
              to="/settings"
              collapsed={collapsed}
            />
          </div>
          {collapsed ? (
            <UserMenu withShellControls />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <UserMenu />
                <ThemeSwitch />
                <LanguageToggle />
              </div>
              <DemoControls />
            </>
          )}
        </nav>
      </RadixTooltip.Provider>

      <ContentPanel>
        <Outlet />
      </ContentPanel>
    </div>
  );
}
