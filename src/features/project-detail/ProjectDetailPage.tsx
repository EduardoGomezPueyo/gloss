import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

// Placeholder: the project detail is built in phase 3. Rows of the list already link here.
export function ProjectDetailPage() {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-text-tertiary">{t('projects.detailComingSoon')}</p>
      <Link to="/projects" className="w-fit text-sm text-text-secondary underline hover:text-text">
        {t('notFound.back')}
      </Link>
    </>
  );
}
