import { DropdownMenu } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import FilterIcon from '@/assets/icons/filter-button.svg?react';
import {
  FILTER_CATEGORIES,
  hasActiveFilters,
  toggleFilterValue,
  type FilterCategory,
  type ProjectFilters,
} from '@/domain/filters';
import type { Member, Platform, Priority, Status } from '@/domain/types';
import { Avatar } from '@/ui/Avatar';
import { CheckboxBox } from '@/ui/CheckboxBox';
import { PlatformDot } from '@/ui/PlatformChip';
import { PriorityIcon } from '@/ui/PriorityIcon';
import { StatusIcon } from '@/ui/StatusIcon';
import { filterOptions, type FilterOption } from './filterOptions';
import { useFilterValueLabel } from './useFilterLabels';

const contentClass =
  'z-40 flex min-w-[238px] flex-col gap-0.5 rounded-2xl border border-border-strong bg-popup p-1.5 shadow-lg';
const subContentClass =
  'z-50 flex min-w-[180px] flex-col gap-0.5 rounded-2xl border border-border-strong bg-popup p-1.5 shadow-lg';
const itemClass =
  'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-text outline-none select-none data-[highlighted]:bg-fill-subtle data-[state=open]:bg-fill-subtle';

function OptionIcon({ category, option }: { category: FilterCategory; option: FilterOption }) {
  if (option.member) return <Avatar member={option.member} size="md" className="size-[18px]" />;
  if (category === 'platforms') return <PlatformDot platform={option.value as Platform} />;
  return null;
}

/** Trailing icon (Figma: priority and status options show their icon on the right). */
function TrailingIcon({ category, value }: { category: FilterCategory; value: string }) {
  if (category === 'priorities')
    return <PriorityIcon priority={value as Priority} decorative className="ml-auto size-4" />;
  if (category === 'statuses')
    return <StatusIcon status={value as Status} decorative className="ml-auto size-4" />;
  return null;
}

/**
 * Filter button and menu (Figma 370:5691 and submenus): five categories, each
 * with a checkbox submenu. Menus stay open while ticking so several values can
 * be picked in a row.
 */
export function ProjectFilterMenu({
  filters,
  members,
  onChange,
}: {
  filters: ProjectFilters;
  members: Member[];
  onChange: (filters: ProjectFilters) => void;
}) {
  const { t } = useTranslation();
  const valueLabel = useFilterValueLabel(members);
  const active = hasActiveFilters(filters);
  const activeCount = FILTER_CATEGORIES.reduce((n, c) => n + filters[c].length, 0);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={
          active ? t('projects.filtersActive', { count: activeCount }) : t('projects.filters')
        }
        className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong data-[state=open]:text-text ${
          active
            ? 'border-text-tertiary bg-fill-subtle text-text'
            : 'border-border-input text-nav-unselected'
        }`}
      >
        <FilterIcon aria-hidden className="size-8" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className={contentClass}>
          {FILTER_CATEGORIES.map((category) => (
            <DropdownMenu.Sub key={category}>
              <DropdownMenu.SubTrigger className={itemClass}>
                {t(`filterCategory.${category}`)}
                <svg aria-hidden viewBox="0 0 6 6" className="ml-auto size-1.5 fill-current">
                  <path d="M1 0.5 5 3 1 5.5Z" />
                </svg>
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                  sideOffset={6}
                  alignOffset={-6}
                  className={subContentClass}
                >
                  {filterOptions(category, members).map((option) => {
                    const checked = (filters[category] as readonly string[]).includes(option.value);
                    return (
                      <DropdownMenu.CheckboxItem
                        key={option.value}
                        checked={checked}
                        onCheckedChange={() =>
                          onChange(toggleFilterValue(filters, category, option.value as never))
                        }
                        onSelect={(event) => event.preventDefault()}
                        className={itemClass}
                      >
                        <CheckboxBox checked={checked} />
                        <OptionIcon category={category} option={option} />
                        <span className="pr-2">{valueLabel(category, option.value)}</span>
                        <TrailingIcon category={category} value={option.value} />
                      </DropdownMenu.CheckboxItem>
                    );
                  })}
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
