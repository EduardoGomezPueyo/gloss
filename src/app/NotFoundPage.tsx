import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PageTitle } from '@/ui/PageTitle';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageTitle>{t('notFound.title')}</PageTitle>
      <Link to="/projects" className="text-sm text-text-secondary underline hover:text-text">
        {t('notFound.back')}
      </Link>
    </>
  );
}
