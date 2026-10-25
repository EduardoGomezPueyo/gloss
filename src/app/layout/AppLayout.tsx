import { Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import AssignedIcon from '@/assets/icons/nav-assigned.svg?react';
import CommentsIcon from '@/assets/icons/nav-comments.svg?react';
import NotificationsIcon from '@/assets/icons/nav-notifications.svg?react';
import ProjectsIcon from '@/assets/icons/nav-projects.svg?react';
import SettingsIcon from '@/assets/icons/nav-settings.svg?react';
import { ContentPanel } from './ContentPanel';
import { DemoControls } from './DemoControls';
import { LanguageToggle } from './LanguageToggle';
import { SidebarNavItem } from './SidebarNavItem';
import { ThemeSwitch } from './ThemeSwitch';
import { UserMenu } from './UserMenu';

/** Translation space: general navigation on the left, content panel on the right. */
export function AppLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full gap-4 p-4">
      <nav
        aria-label={t('nav.label')}
        className="flex h-full w-[182px] shrink-0 flex-col gap-2.5 overflow-clip p-2.5"
      >
        <div className="flex flex-1 flex-col gap-1">
          <SidebarNavItem icon={ProjectsIcon} label={t('nav.projects')} to="/projects" />
          {/* No design yet (open decision 6): shown disabled. */}
          <SidebarNavItem icon={NotificationsIcon} label={t('nav.notifications')} />
          <SidebarNavItem icon={AssignedIcon} label={t('nav.assignedToMe')} />
          <SidebarNavItem icon={CommentsIcon} label={t('nav.comments')} to="/comments" />
          <SidebarNavItem icon={SettingsIcon} label={t('nav.settings')} to="/settings" />
        </div>
        <div className="flex items-center gap-2">
          <UserMenu />
          <ThemeSwitch />
          <LanguageToggle />
        </div>
        <DemoControls />
      </nav>

      <ContentPanel>
        <Outlet />
      </ContentPanel>
    </div>
  );
}
