import { useTranslation } from 'react-i18next';
import { PageTitle } from '@/ui/PageTitle';

// Placeholder: the project list is built in phase 2.
export function ProjectsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageTitle>{t('projects.title')}</PageTitle>
      <p className="text-sm text-text-tertiary">{t('common.comingSoon')}</p>
    </>
  );
}
