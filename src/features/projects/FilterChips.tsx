import { useTranslation } from 'react-i18next';
import {
  clearFilterCategory,
  EMPTY_FILTERS,
  FILTER_CATEGORIES,
  hasActiveFilters,
  type ProjectFilters,
} from '@/domain/filters';
import type { Member } from '@/domain/types';
import { CloseIcon } from '@/ui/CloseIcon';
import { useFilterValueLabel } from './useFilterLabels';

/**
 * Applied filters as removable chips (Figma 370:5864): one chip per category,
 * "Status is Not started, In progress ×", followed by "Clear all filters".
 */
export function FilterChips({
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
  if (!hasActiveFilters(filters)) return null;

  return (
    <div className="-mt-3 flex flex-wrap items-center gap-2">
      {FILTER_CATEGORIES.filter((category) => filters[category].length > 0).map((category) => {
        const prefix = t('projects.chipLabel', { category: t(`filterChip.${category}`) });
        const values = filters[category].map((value) => valueLabel(category, value)).join(', ');
        return (
          <span
            key={category}
            className="inline-flex items-center gap-2 rounded-full border border-tag-border bg-tag-bg py-1.5 pr-2 pl-3 text-sm text-text-secondary"
          >
            <span>
              {prefix} <strong className="font-semibold text-text">{values}</strong>
            </span>
            <button
              type="button"
              aria-label={t('projects.removeFilter', { label: `${prefix} ${values}` })}
              onClick={() => onChange(clearFilterCategory(filters, category))}
              className="rounded-full p-0.5 text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
            >
              <CloseIcon className="size-3" />
            </button>
          </span>
        );
      })}
      <button
        type="button"
        onClick={() => onChange(EMPTY_FILTERS)}
        className="rounded-md px-3 py-1.5 text-sm text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
      >
        {t('projects.clearAllFilters')}
      </button>
    </div>
  );
}
