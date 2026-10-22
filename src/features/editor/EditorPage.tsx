import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { useProjectDetail } from '@/data/hooks';

// Placeholder: the translation editor is built in phase 5. Content item rows already link here.
export function EditorPage() {
  const { t } = useTranslation();
  const { projectId = '', itemId = '' } = useParams();
  const { data } = useProjectDetail(projectId);
  const section = data?.sections.find((s) => s.items.some(({ item }) => item.id === itemId));
  const back = section ? `/projects/${projectId}/sections/${section.section.id}` : '/projects';

  return (
    <>
      <p className="text-sm text-text-tertiary">{t('editor.comingSoon')}</p>
      <Link to={back} className="w-fit text-sm text-text-secondary underline hover:text-text">
        {section ? t('editor.back') : t('notFound.back')}
      </Link>
    </>
  );
}
