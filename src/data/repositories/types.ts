/*
 * Repository contracts. The UI depends only on these interfaces; implementations
 * live in src/data/local (IndexedDB) and, in v2, a remote backend.
 *
 * Rules for implementations (DECISIONS D2):
 * - every method is async;
 * - aggregated read models (summaries, progress) are computed with the pure
 *   functions in src/domain, never by the UI;
 * - ids are UUIDs and entities carry createdAt/updatedAt/createdBy/updatedBy.
 */

import type { OcrOutcome, SourceTextPatch } from '@/domain/images';
import type { InviteRow } from '@/domain/members';
import type { NewContentItemInput, NewImageFile } from '@/domain/newContentItem';
import type { NewProjectInput } from '@/domain/newProject';
import type { ProjectData, ProjectDetail, ProjectSummary } from '@/domain/progress';
import type { ProjectDetailsPatch } from '@/domain/projectDetails';
import type { SectionInput } from '@/domain/sections';
import type { WorkspaceData, WorkspaceFile, WorkspaceSettings } from '@/domain/workspace';
import type {
  Assignment,
  Comment,
  Notification,
  CommentThread,
  ContentItem,
  GlossaryCategory,
  GlossaryContent,
  GlossaryEntry,
  GlossaryVersion,
  Id,
  LanguageCode,
  Member,
  MemberCategory,
  Project,
  SceneImage,
  Section,
  Translation,
} from '@/domain/types';

export interface MemberRepository {
  /** Active and invited members, excluding removed ones. */
  list(): Promise<Member[]>;
  get(id: Id): Promise<Member | undefined>;
  /**
   * "Invite members to workspace": adds them as Invited (no email is sent in v1).
   * Fails if a row is invalid (see validateInvites).
   */
  invite(rows: InviteRow[], by: Id | null): Promise<Member[]>;
  /** Fails if the workspace would be left without an active manager. */
  setCategory(ids: Id[], category: MemberCategory, by: Id | null): Promise<void>;
  /** Soft delete (D21). Fails for yourself or the last active manager. */
  remove(ids: Id[], by: Id | null): Promise<void>;
}

export interface ProjectRepository {
  /** Every project with its progress, status and per-language progress. */
  listSummaries(): Promise<ProjectSummary[]>;
  /** One project with its sections and content items summarized; undefined if not found. */
  getDetail(id: Id): Promise<ProjectDetail | undefined>;
  /** Everything of a project (sections, items, images, translations), e.g. for export. */
  getData(id: Id): Promise<ProjectData | undefined>;
  /** Creates an empty project (no sections yet); the code is generated from the name. */
  create(input: NewProjectInput, by: Id | null): Promise<Project>;
  /** Adds a target language (not the source, not already added); it starts not started. */
  addLanguage(projectId: Id, language: LanguageCode, by: Id | null): Promise<Project>;
  /** Changes details from the Overview; rejects a patch that breaks checkProjectDetails. */
  updateDetails(projectId: Id, patch: ProjectDetailsPatch, by: Id | null): Promise<Project>;
  /** Changes the name and ID (validated with validateProjectIdentity). */
  rename(projectId: Id, input: { name: string; code: string }, by: Id | null): Promise<Project>;
  /** Soft-deletes projects: they disappear from every list and link, their data is kept. */
  remove(projectIds: Id[], by: Id | null): Promise<void>;
}

export interface SectionRepository {
  /** Creates an empty section after the project's last one. */
  create(projectId: Id, input: SectionInput, by: Id | null): Promise<Section>;
  /** Renames a section or changes its description. */
  update(id: Id, input: SectionInput, by: Id | null): Promise<Section>;
}

export interface ContentItemRepository {
  /**
   * Creates a content item at the end of the section with the given images, in
   * that order. The files are stored and every image waits for OCR.
   */
  create(
    sectionId: Id,
    input: NewContentItemInput,
    images: NewImageFile[],
    by: Id | null,
  ): Promise<ContentItem>;
  /**
   * Moves items to another section of the same project, after its last item.
   * Translations and progress are kept (SPEC 5.3).
   */
  moveToSection(itemIds: Id[], sectionId: Id, by: Id | null): Promise<void>;
  /** Sets or clears the note for translators. */
  updateNote(itemId: Id, note: string | null, by: Id | null): Promise<void>;
}

/** The workspace as a whole (DECISIONS D34). */
export interface WorkspaceRepository {
  /**
   * Prepares a new workspace the first time it opens: empty, with a single
   * manager (the workspace owner). Safe to call more than once.
   */
  ensureInitialized(): Promise<void>;
  /**
   * Deletes all data and stores `data` and `files` in its place (loading the demo
   * or restoring a backup). Settings fall back to the defaults when not given.
   */
  replace(data: WorkspaceData, files: WorkspaceFile[], settings?: WorkspaceSettings): Promise<void>;
  /** Deletes all data and starts again as a new, empty workspace (Settings > General, D41). */
  reset(): Promise<void>;
  /** Everything in the workspace, for a backup. */
  exportAll(): Promise<{
    data: WorkspaceData;
    files: WorkspaceFile[];
    settings: WorkspaceSettings;
  }>;
  getSettings(): Promise<WorkspaceSettings>;
  updateSettings(patch: Partial<WorkspaceSettings>): Promise<WorkspaceSettings>;
}

/** An image waiting for OCR, with the language to read it in (the project's source language). */
export interface PendingOcr {
  image: SceneImage;
  language: LanguageCode;
}

export interface ImageRepository {
  /** Images waiting for OCR, oldest first. */
  listPendingOcr(): Promise<PendingOcr[]>;
  /** The stored file of an image; undefined for images without a file. */
  getFile(fileId: Id): Promise<Blob | undefined>;
  /** Stores what OCR produced (found text becomes the source text). */
  saveOcrOutcome(imageId: Id, outcome: OcrOutcome): Promise<void>;
  /** Puts the item's failed images back in the OCR queue. */
  retryOcr(contentItemId: Id): Promise<void>;
  /** An item's images in order, with their translations (the editor's data). */
  listForItem(contentItemId: Id): Promise<ItemImages>;
  /** Corrects the source text block by hand; OCR's own text is kept. */
  updateSource(imageId: Id, patch: SourceTextPatch, by: Id | null): Promise<void>;
}

export interface ItemImages {
  images: SceneImage[];
  translations: Translation[];
}

/** Review decisions a manager can take on an Under Review translation. */
export type ReviewDecision = 'approve' | 'requestChanges';

/** Writes follow the status rules in src/domain/translationWorkflow.ts (DECISIONS D30). */
export interface TranslationRepository {
  /** Saves the text (autosave). Creates the translation on first save; no-op for empty new text. */
  save(imageId: Id, language: LanguageCode, text: string, by: Id | null): Promise<void>;
  /** "Mark translated" or undo it. */
  setReady(imageId: Id, language: LanguageCode, ready: boolean, by: Id | null): Promise<void>;
  /** Approve or request changes; the caller must be a manager. */
  review(imageId: Id, language: LanguageCode, decision: ReviewDecision, by: Id): Promise<void>;
  /** "Submit for review": moves the section's marked translations to Under Review. Returns how many. */
  submitSectionForReview(sectionId: Id, by: Id | null): Promise<number>;
  /** Every Under Review translation with its context, for "To review" (DECISIONS D44). */
  listReviewQueue(): Promise<ReviewQueueEntry[]>;
}

/** Where a content item lives, for the inbox pages (D43, D44). */
export interface ItemContext {
  project: Project;
  section: Section;
  item: ContentItem;
}

/** A translation waiting for a manager. */
export interface ReviewQueueEntry extends ItemContext {
  translation: Translation;
  image: SceneImage;
}

/** An assignment with its item's images and translations in that language. */
export interface AssignmentInboxEntry extends ItemContext {
  assignment: Assignment;
  /** In order. */
  images: SceneImage[];
  translations: Translation[];
}

/** A notification with what it is about, for the Notifications page (D45). */
export interface NotificationInboxEntry {
  notification: Notification;
  project: Project;
  section: Section | null;
  item: ContentItem | null;
  image: SceneImage | null;
  /** For comment events: the thread as it is now. */
  thread: ThreadWithComments | null;
  /** For review events: the translation as it is now. */
  translation: Translation | null;
}

export interface NotificationRepository {
  /** A person's notifications, of the projects that were not deleted. */
  listFor(recipientId: Id): Promise<NotificationInboxEntry[]>;
  markRead(ids: Id[]): Promise<void>;
  markAllRead(recipientId: Id): Promise<void>;
}

/** Who translates each content item into each language (D44). */
export interface AssignmentRepository {
  listForProject(projectId: Id): Promise<Assignment[]>;
  /**
   * Sets the assignee of an item in a language, or clears it with null. Only
   * managers assign, and only to the project's people.
   */
  assign(itemId: Id, language: LanguageCode, assigneeId: Id | null, by: Id): Promise<void>;
  /** Every assignment of the projects that were not deleted, with its context. */
  listInbox(): Promise<AssignmentInboxEntry[]>;
}

export interface ThreadWithComments {
  thread: CommentThread;
  /** Oldest first; the first one opened the thread. */
  comments: Comment[];
}

/** A thread with where it lives, for the Comments page (DECISIONS D43). */
export interface CommentInboxEntry extends ThreadWithComments {
  image: SceneImage;
  item: ContentItem;
  section: Section;
  project: Project;
}

export interface CommentRepository {
  /** Threads about an image, newest first. */
  listForImage(imageId: Id): Promise<ThreadWithComments[]>;
  /** Every thread of the projects that were not deleted, with its context. */
  listInbox(): Promise<CommentInboxEntry[]>;
  startThread(
    imageId: Id,
    language: LanguageCode | null,
    body: string,
    by: Id | null,
  ): Promise<void>;
  reply(threadId: Id, body: string, by: Id | null): Promise<void>;
  resolve(threadId: Id, by: Id | null): Promise<void>;
  reopen(threadId: Id, by: Id | null): Promise<void>;
}

/** Per-project glossary (SPEC 5.5, DECISIONS D31). Every save stores a version. */
export interface GlossaryRepository {
  listCategories(projectId: Id): Promise<GlossaryCategory[]>;
  /** Fails when the name is empty or already used in the project. */
  createCategory(projectId: Id, name: string, by: Id | null): Promise<GlossaryCategory>;
  listEntries(projectId: Id): Promise<GlossaryEntry[]>;
  getEntry(entryId: Id): Promise<GlossaryEntry | undefined>;
  createEntry(projectId: Id, content: GlossaryContent, by: Id | null): Promise<GlossaryEntry>;
  /** Saves the content as a new version (no version when nothing changed). */
  updateEntry(entryId: Id, content: GlossaryContent, by: Id | null): Promise<GlossaryEntry>;
  /** Counts a visit to the entry page (the overview shows the most viewed). */
  recordView(entryId: Id): Promise<void>;
  /** Newest first; the first one is the current version. */
  listVersions(entryId: Id): Promise<GlossaryVersion[]>;
  /** Saves an older version's content as a new version. */
  restoreVersion(entryId: Id, versionId: Id, by: Id | null): Promise<GlossaryEntry>;
  /** Stores an image for an entry gallery; returns its file id. */
  storeImage(file: NewImageFile): Promise<Id>;
}

export interface Repositories {
  members: MemberRepository;
  projects: ProjectRepository;
  sections: SectionRepository;
  contentItems: ContentItemRepository;
  images: ImageRepository;
  translations: TranslationRepository;
  comments: CommentRepository;
  glossary: GlossaryRepository;
  assignments: AssignmentRepository;
  notifications: NotificationRepository;
  workspace: WorkspaceRepository;
}
