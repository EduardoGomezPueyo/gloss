import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useParams } from 'react-router';
import { useProjectDetail, useWorkspaceSettings } from '@/data/hooks';
import { canSeeProject, canWorkOnProject } from '@/domain/members';
import { useCurrentUser } from './currentUser/useCurrentUser';
import { ProjectAccessContext } from './projectAccess/ProjectAccessContext';

/**
 * Guards every page of a project (detail, sections, editor, glossary): managers
 * and the project's people work on it; other workers do not see it, or see it as
 * view only when the workspace allows it (SPEC 5.6, simulated; D32, D41).
 */
export function ProjectAccessGate() {
  const { t } = useTranslation();
  const { projectId = '' } = useParams();
  const { currentUser } = useCurrentUser();
  const detail = useProjectDetail(projectId);
  const settings = useWorkspaceSettings();
  const project = detail.data?.project;
  const canWork = !project || canWorkOnProject(currentUser, project);
  const access = useMemo(() => ({ canWork }), [canWork]);

  // Wait for the settings: showing a project for a moment and then hiding it would be worse.
  if (!settings.data) return null;

  if (project && !canSeeProject(currentUser, project, settings.data)) {
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
  return (
    <ProjectAccessContext value={access}>
      {!canWork && (
        <p
          role="note"
          className="-mb-2 rounded-xl border border-border-strong px-4 py-2.5 text-sm text-text-secondary"
        >
          {t('projects.viewOnly')}
        </p>
      )}
      <Outlet />
    </ProjectAccessContext>
  );
}
