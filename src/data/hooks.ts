import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SourceTextPatch } from '@/domain/images';
import type { NewContentItemInput, NewImageFile } from '@/domain/newContentItem';
import type { NewProjectInput } from '@/domain/newProject';
import type { SectionInput } from '@/domain/sections';
import type { Id, LanguageCode } from '@/domain/types';
import { queryKeys } from './queryKeys';
import type { ReviewDecision } from './repositories/types';
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

export function useItemImages(itemId: Id) {
  const { images } = useRepositories();
  return useQuery({
    queryKey: queryKeys.itemImages(itemId),
    queryFn: () => images.listForItem(itemId),
  });
}

export function useUpdateSource() {
  const { images } = useRepositories();
  const onSuccess = useInvalidateProjects();
  return useMutation({
    mutationFn: (vars: { imageId: Id; patch: SourceTextPatch; by: Id | null }) =>
      images.updateSource(vars.imageId, vars.patch, vars.by),
    onSuccess,
  });
}

export function useUpdateNote() {
  const { contentItems } = useRepositories();
  const onSuccess = useInvalidateProjects();
  return useMutation({
    mutationFn: (vars: { itemId: Id; note: string | null; by: Id | null }) =>
      contentItems.updateNote(vars.itemId, vars.note, vars.by),
    onSuccess,
  });
}

export function useSaveTranslation() {
  const { translations } = useRepositories();
  const onSuccess = useInvalidateProjects();
  return useMutation({
    mutationFn: (vars: { imageId: Id; language: LanguageCode; text: string; by: Id | null }) =>
      translations.save(vars.imageId, vars.language, vars.text, vars.by),
    onSuccess,
  });
}

export function useSetReady() {
  const { translations } = useRepositories();
  const onSuccess = useInvalidateProjects();
  return useMutation({
    mutationFn: (vars: { imageId: Id; language: LanguageCode; ready: boolean; by: Id | null }) =>
      translations.setReady(vars.imageId, vars.language, vars.ready, vars.by),
    onSuccess,
  });
}

export function useReview() {
  const { translations } = useRepositories();
  const onSuccess = useInvalidateProjects();
  return useMutation({
    mutationFn: (vars: { imageId: Id; language: LanguageCode; decision: ReviewDecision; by: Id }) =>
      translations.review(vars.imageId, vars.language, vars.decision, vars.by),
    onSuccess,
  });
}

export function useSubmitForReview() {
  const { translations } = useRepositories();
  const onSuccess = useInvalidateProjects();
  return useMutation({
    mutationFn: (vars: { sectionId: Id; by: Id | null }) =>
      translations.submitSectionForReview(vars.sectionId, vars.by),
    onSuccess,
  });
}

export function useComments(imageId: Id | undefined) {
  const { comments } = useRepositories();
  return useQuery({
    queryKey: queryKeys.comments(imageId ?? ''),
    queryFn: () => comments.listForImage(imageId!),
    enabled: imageId !== undefined,
  });
}

/** Starts a thread, replies, resolves or reopens; refreshes that image's comments. */
export function useCommentAction() {
  const { comments } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      action:
        | { kind: 'start'; imageId: Id; language: LanguageCode | null; body: string; by: Id | null }
        | { kind: 'reply'; imageId: Id; threadId: Id; body: string; by: Id | null }
        | { kind: 'resolve' | 'reopen'; imageId: Id; threadId: Id; by: Id | null },
    ) => {
      switch (action.kind) {
        case 'start':
          return comments.startThread(action.imageId, action.language, action.body, action.by);
        case 'reply':
          return comments.reply(action.threadId, action.body, action.by);
        case 'resolve':
          return comments.resolve(action.threadId, action.by);
        case 'reopen':
          return comments.reopen(action.threadId, action.by);
      }
    },
    onSuccess: (_, action) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(action.imageId) }),
  });
}

/** An image's stored file, or null when it has none (seeded demo images). */
export function useImageFile(fileId: Id | null) {
  const { images } = useRepositories();
  return useQuery({
    queryKey: ['files', fileId],
    queryFn: async () => (fileId ? ((await images.getFile(fileId)) ?? null) : null),
    // Files never change once stored.
    staleTime: Infinity,
  });
}
