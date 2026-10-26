import type { ComponentType, SVGProps } from 'react';
import { NavLink, useMatch } from 'react-router';
import { Tooltip } from '@/ui/Tooltip';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

interface SidebarNavItemProps {
  icon: Icon;
  label: string;
  to: string;
  /** A count shown at the end, e.g. unread notifications; hidden when 0. */
  badge?: number;
  /** Accessible text for the badge, e.g. "3 unread". */
  badgeLabel?: string;
  /** Icon only, with the label in a tooltip (DECISIONS D46). */
  collapsed?: boolean;
}

const baseClass = 'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm leading-none';

export function SidebarNavItem({
  icon: IconComponent,
  label,
  to,
  badge = 0,
  badgeLabel,
  collapsed = false,
}: SidebarNavItemProps) {
  // A plain class string, not NavLink's function form: the tooltip trigger merges
  // className as a string and would break the function.
  const isActive = useMatch({ path: to, end: false }) !== null;

  return (
    <Tooltip enabled={collapsed} content={label}>
      <NavLink
        to={to}
        className={`${baseClass} transition-colors ${
          isActive
            ? 'bg-fill-subtle text-nav-selected'
            : 'text-nav-unselected hover:text-nav-selected'
        }`}
      >
        <span className="relative shrink-0">
          <IconComponent aria-hidden className="size-4" />
          {collapsed && badge > 0 && (
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-accent ring-2 ring-app"
            />
          )}
        </span>
        <span className={collapsed ? 'sr-only' : 'truncate whitespace-nowrap'}>{label}</span>
        {badge > 0 &&
          (collapsed ? (
            <span className="sr-only">{badgeLabel ?? badge}</span>
          ) : (
            <span className="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[10px] leading-none font-semibold text-accent-foreground">
              <span aria-hidden>{badge > 99 ? '99+' : badge}</span>
              <span className="sr-only">{badgeLabel ?? badge}</span>
            </span>
          ))}
      </NavLink>
    </Tooltip>
  );
}
