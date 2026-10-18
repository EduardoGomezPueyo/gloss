import { useTranslation } from 'react-i18next';

// Placeholder: Settings > Members is built in phase 7.
export function MembersPage() {
  const { t } = useTranslation();
  return <p className="text-sm text-text-tertiary">{t('common.comingSoon')}</p>;
}
