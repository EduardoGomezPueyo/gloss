import type { ComponentType, SVGProps } from 'react';
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

interface SidebarNavItemProps {
  icon: Icon;
  label: string;
  /** Route to navigate to. Omit it for entries whose page has no design yet. */
  to?: string;
}

const baseClass = 'flex w-full items-center gap-1 rounded-sm p-1 text-[10px] leading-none';

export function SidebarNavItem({ icon: IconComponent, label, to }: SidebarNavItemProps) {
  const { t } = useTranslation();

  if (!to) {
    return (
      <span
        aria-disabled="true"
        title={t('nav.notAvailable')}
        className={`${baseClass} cursor-not-allowed text-nav-unselected`}
      >
        <IconComponent aria-hidden className="size-3 shrink-0" />
        {label}
      </span>
    );
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${baseClass} transition-colors ${
          isActive
            ? 'bg-fill-subtle text-nav-selected'
            : 'text-nav-unselected hover:text-nav-selected'
        }`
      }
    >
      <IconComponent aria-hidden className="size-3 shrink-0" />
      {label}
    </NavLink>
  );
}
