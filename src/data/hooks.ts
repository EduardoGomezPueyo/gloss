import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NewProjectInput } from '@/domain/newProject';
import type { Id } from '@/domain/types';
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
