import { Navigate, type RouteObject } from 'react-router';
import { EditorPage } from '@/features/editor/EditorPage';
import { ProjectDetailPage } from '@/features/project-detail/ProjectDetailPage';
import { EntryPage } from '@/features/glossary/EntryPage';
import { GlossaryPage } from '@/features/glossary/GlossaryPage';
import { SectionDetailPage } from '@/features/project-detail/SectionDetailPage';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { MembersPage } from '@/features/settings/MembersPage';
import { AppLayout } from './layout/AppLayout';
import { SettingsLayout } from './layout/SettingsLayout';
import { NotFoundPage } from './NotFoundPage';
import { ProjectAccessGate } from './ProjectAccessGate';

const loadEntryEditPage = async () => ({
  Component: (await import('@/features/glossary/EntryEditPage')).EntryEditPage,
});

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'projects', element: <ProjectsPage /> },
      {
        path: 'projects/:projectId',
        element: <ProjectAccessGate />,
        children: [
          { index: true, element: <ProjectDetailPage /> },
          { path: 'sections/:sectionId', element: <SectionDetailPage /> },
          { path: 'items/:itemId', element: <EditorPage /> },
          { path: 'glossary', element: <GlossaryPage /> },
          // The Markdown editor and the diff load only when needed.
          { path: 'glossary/new', lazy: loadEntryEditPage },
          { path: 'glossary/:entryId', element: <EntryPage /> },
          { path: 'glossary/:entryId/edit', lazy: loadEntryEditPage },
          {
            path: 'glossary/:entryId/compare/:versionId',
            lazy: async () => ({
              Component: (await import('@/features/glossary/ComparePage')).ComparePage,
            }),
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
      { index: true, element: <Navigate to="/settings/members" replace /> },
      { path: 'members', element: <MembersPage /> },
    ],
  },
];
