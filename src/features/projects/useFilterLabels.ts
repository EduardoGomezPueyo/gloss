import { useTranslation } from 'react-i18next';
import type { FilterCategory } from '@/domain/filters';
import type { Member, Platform, Priority, Status } from '@/domain/types';

/** Human label of one filter value (platform, priority, status or member name). */
export function useFilterValueLabel(members: Member[]) {
  const { t } = useTranslation();
  return (category: FilterCategory, value: string): string => {
    switch (category) {
      case 'platforms':
        return t(`platform.${value as Platform}`);
      case 'priorities':
        return t(`priority.${value as Priority}`);
      case 'statuses':
        return t(`status.${value as Status}`);
      case 'managers':
      case 'workers':
        return members.find((m) => m.id === value)?.name ?? value;
    }
  };
}
