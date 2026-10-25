import type { ComponentType, SVGProps } from 'react';
import { NavLink } from 'react-router';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

interface SidebarNavItemProps {
  icon: Icon;
  label: string;
  to: string;
  /** A count shown at the end, e.g. unread notifications; hidden when 0. */
  badge?: number;
  /** Accessible text for the badge, e.g. "3 unread". */
  badgeLabel?: string;
}

const baseClass = 'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm leading-none';

export function SidebarNavItem({
  icon: IconComponent,
  label,
  to,
  badge = 0,
  badgeLabel,
}: SidebarNavItemProps) {
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
      <IconComponent aria-hidden className="size-4 shrink-0" />
      {label}
      {badge > 0 && (
        <span className="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[10px] leading-none font-semibold text-accent-foreground">
          <span aria-hidden>{badge > 99 ? '99+' : badge}</span>
          <span className="sr-only">{badgeLabel ?? badge}</span>
        </span>
      )}
    </NavLink>
  );
}
