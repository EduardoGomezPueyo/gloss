import { Link, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import ArrowLeftIcon from '@/assets/icons/arrow-left.svg?react';
import GeneralIcon from '@/assets/icons/nav-settings.svg?react';
import MembersIcon from '@/assets/icons/settings-members.svg?react';
import WorkspaceProjectsIcon from '@/assets/icons/settings-workspace-projects.svg?react';
import { PageTitle } from '@/ui/PageTitle';
import { ContentPanel } from './ContentPanel';
import { SidebarNavItem } from './SidebarNavItem';
import { UserMenu } from './UserMenu';

/** Settings pages replace the general navigation with their own (Figma: "Team settings"). */
export function SettingsLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full p-4">
      <ContentPanel>
        <PageTitle>{t('settings.title')}</PageTitle>

        <div className="flex min-h-0 flex-1 gap-6">
          <div className="flex w-[200px] shrink-0 flex-col gap-3 border-r border-surface">
            <Link
              to="/projects"
              className="flex items-center gap-1 text-[13px] text-text-secondary hover:text-text"
            >
              <ArrowLeftIcon aria-hidden className="size-4" />
              {t('settingsNav.back')}
            </Link>

            <nav aria-label={t('settingsNav.label')} className="flex flex-1 flex-col gap-2.5 p-2">
              <div className="flex flex-1 flex-col gap-1">
                {/* No design yet (open decision 6): shown disabled. */}
                <SidebarNavItem icon={GeneralIcon} label={t('settingsNav.general')} />
                <SidebarNavItem
                  icon={MembersIcon}
                  label={t('settingsNav.members')}
                  to="/settings/members"
                />
                <SidebarNavItem
                  icon={WorkspaceProjectsIcon}
                  label={t('settingsNav.workspaceProjects')}
                />
              </div>
              <UserMenu />
            </nav>
          </div>

          <div className="min-w-0 flex-1">
            <Outlet />
          </div>
        </div>
      </ContentPanel>
    </div>
  );
}
