import { Navigate, type RouteObject } from 'react-router';
import { EditorPage } from '@/features/editor/EditorPage';
import { ProjectDetailPage } from '@/features/project-detail/ProjectDetailPage';
import { SectionDetailPage } from '@/features/project-detail/SectionDetailPage';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { MembersPage } from '@/features/settings/MembersPage';
import { AppLayout } from './layout/AppLayout';
import { SettingsLayout } from './layout/SettingsLayout';
import { NotFoundPage } from './NotFoundPage';

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:projectId', element: <ProjectDetailPage /> },
      { path: 'projects/:projectId/sections/:sectionId', element: <SectionDetailPage /> },
      { path: 'projects/:projectId/items/:itemId', element: <EditorPage /> },
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
