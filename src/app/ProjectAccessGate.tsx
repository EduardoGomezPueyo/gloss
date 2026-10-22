import { useTranslation } from 'react-i18next';
import { Link, Outlet, useParams } from 'react-router';
import { useProjectDetail } from '@/data/hooks';
import { canSeeProject } from '@/domain/members';
import { useCurrentUser } from './currentUser/useCurrentUser';

/**
 * Guards every page of a project (detail, sections, editor, glossary): workers
 * only see projects they take part in; managers see all (SPEC 5.6, simulated, D32).
 */
export function ProjectAccessGate() {
  const { t } = useTranslation();
  const { projectId = '' } = useParams();
  const { currentUser } = useCurrentUser();
  const detail = useProjectDetail(projectId);

  if (detail.data && !canSeeProject(currentUser, detail.data.project)) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-secondary">{t('projects.noAccess')}</p>
        <Link
          to="/projects"
          className="w-fit text-sm text-text-secondary underline hover:text-text"
        >
          {t('notFound.back')}
        </Link>
      </div>
    );
  }
  // While loading, or for unknown projects, the pages show their own states.
  return <Outlet />;
}
