import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NewContentItemInput, NewImageFile } from '@/domain/newContentItem';
import type { NewProjectInput } from '@/domain/newProject';
import type { SectionInput } from '@/domain/sections';
import type { Id, LanguageCode } from '@/domain/types';
import { queryKeys } from './queryKeys';
import { useRepositories } from './RepositoryContext';

export function useMembers() {
  const { members } = useRepositories();
  return useQuery({ queryKey: queryKeys.members, queryFn: () => members.list() });
}

export function useProjectSummaries() {
  const { projects } = useRepositories();
  return useQuery({ queryKey: queryKeys.projects, queryFn: () => projects.listSummaries() });
}

export function useCreateProject() {
  const { projects } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, by }: { input: NewProjectInput; by: Id | null }) =>
      projects.create(input, by),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
  });
}

/** null when the project does not exist (TanStack Query does not accept undefined data). */
export function useProjectDetail(id: Id) {
  const { projects } = useRepositories();
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: async () => (await projects.getDetail(id)) ?? null,
  });
}

/** Every write below changes some project's progress or structure: refresh all project data. */
function useInvalidateProjects() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.projects });
}

export function useAddLanguage() {
  const { projects } = useRepositories();
  const onSuccess = useInvalidateProjects();
  return useMutation({
    mutationFn: (vars: { projectId: Id; language: LanguageCode; by: Id | null }) =>
      projects.addLanguage(vars.projectId, vars.language, vars.by),
    onSuccess,
  });
}

export function useCreateSection() {
  const { sections } = useRepositories();
  const onSuccess = useInvalidateProjects();
  return useMutation({
    mutationFn: (vars: { projectId: Id; input: SectionInput; by: Id | null }) =>
      sections.create(vars.projectId, vars.input, vars.by),
    onSuccess,
  });
}

export function useUpdateSection() {
  const { sections } = useRepositories();
  const onSuccess = useInvalidateProjects();
  return useMutation({
    mutationFn: (vars: { id: Id; input: SectionInput; by: Id | null }) =>
      sections.update(vars.id, vars.input, vars.by),
    onSuccess,
  });
}

export function useMoveItems() {
  const { contentItems } = useRepositories();
  const onSuccess = useInvalidateProjects();
  return useMutation({
    mutationFn: (vars: { itemIds: Id[]; sectionId: Id; by: Id | null }) =>
      contentItems.moveToSection(vars.itemIds, vars.sectionId, vars.by),
    onSuccess,
  });
}

export function useCreateContentItem() {
  const { contentItems } = useRepositories();
  const onSuccess = useInvalidateProjects();
  return useMutation({
    mutationFn: (vars: {
      sectionId: Id;
      input: NewContentItemInput;
      images: NewImageFile[];
      by: Id | null;
    }) => contentItems.create(vars.sectionId, vars.input, vars.images, vars.by),
    onSuccess,
  });
}

export function useRetryOcr() {
  const { images } = useRepositories();
  const onSuccess = useInvalidateProjects();
  return useMutation({
    mutationFn: (contentItemId: Id) => images.retryOcr(contentItemId),
    onSuccess,
  });
}
