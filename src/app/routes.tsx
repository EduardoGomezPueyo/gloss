import { Navigate, type RouteObject } from 'react-router';
import { AppLayout } from './layout/AppLayout';
import { SettingsLayout } from './layout/SettingsLayout';
import { NotFoundPage } from './NotFoundPage';
import { ProjectAccessGate } from './ProjectAccessGate';

/*
 * Every page is its own chunk, loaded on first visit: the editor, the glossary
 * (Markdown, CodeMirror, diff), drag and drop and the export formats stay out of
 * the first load.
 */
const page =
  <M,>(load: () => Promise<M>, pick: (module: M) => React.ComponentType) =>
  async () => ({ Component: pick(await load()) });

const loadEntryEditPage = page(
  () => import('@/features/glossary/EntryEditPage'),
  (m) => m.EntryEditPage,
);

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      {
        path: 'projects',
        lazy: page(
          () => import('@/features/projects/ProjectsPage'),
          (m) => m.ProjectsPage,
        ),
      },
      {
        path: 'comments',
        lazy: page(
          () => import('@/features/comments/CommentsPage'),
          (m) => m.CommentsPage,
        ),
      },
      {
        path: 'projects/:projectId',
        element: <ProjectAccessGate />,
        children: [
          {
            index: true,
            lazy: page(
              () => import('@/features/project-detail/ProjectDetailPage'),
              (m) => m.ProjectDetailPage,
            ),
          },
          {
            path: 'sections/:sectionId',
            lazy: page(
              () => import('@/features/project-detail/SectionDetailPage'),
              (m) => m.SectionDetailPage,
            ),
          },
          {
            path: 'items/:itemId',
            lazy: page(
              () => import('@/features/editor/EditorPage'),
              (m) => m.EditorPage,
            ),
          },
          {
            path: 'glossary',
            lazy: page(
              () => import('@/features/glossary/GlossaryPage'),
              (m) => m.GlossaryPage,
            ),
          },
          { path: 'glossary/new', lazy: loadEntryEditPage },
          {
            path: 'glossary/:entryId',
            lazy: page(
              () => import('@/features/glossary/EntryPage'),
              (m) => m.EntryPage,
            ),
          },
          { path: 'glossary/:entryId/edit', lazy: loadEntryEditPage },
          {
            path: 'glossary/:entryId/compare/:versionId',
            lazy: page(
              () => import('@/features/glossary/ComparePage'),
              (m) => m.ComparePage,
            ),
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: 'settings',
    element: <SettingsLayout />,
    children: [
      { index: true, element: <Navigate to="/settings/general" replace /> },
      {
        path: 'general',
        lazy: page(
          () => import('@/features/settings/GeneralPage'),
          (m) => m.GeneralPage,
        ),
      },
      {
        path: 'members',
        lazy: page(
          () => import('@/features/settings/MembersPage'),
          (m) => m.MembersPage,
        ),
      },
      {
        path: 'projects',
        lazy: page(
          () => import('@/features/settings/WorkspaceProjectsPage'),
          (m) => m.WorkspaceProjectsPage,
        ),
      },
    ],
  },
];
