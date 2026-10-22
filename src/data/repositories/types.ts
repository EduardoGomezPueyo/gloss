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

import type { OcrOutcome } from '@/domain/images';
import type { NewContentItemInput, NewImageFile } from '@/domain/newContentItem';
import type { NewProjectInput } from '@/domain/newProject';
import type { ProjectDetail, ProjectSummary } from '@/domain/progress';
import type { SectionInput } from '@/domain/sections';
import type {
  ContentItem,
  Id,
  LanguageCode,
  Member,
  Project,
  SceneImage,
  Section,
} from '@/domain/types';

export interface MemberRepository {
  /** Active and invited members, excluding removed ones. */
  list(): Promise<Member[]>;
  get(id: Id): Promise<Member | undefined>;
}

export interface ProjectRepository {
  /** Every project with its progress, status and per-language progress. */
  listSummaries(): Promise<ProjectSummary[]>;
  /** One project with its sections and content items summarized; undefined if not found. */
  getDetail(id: Id): Promise<ProjectDetail | undefined>;
  /** Creates an empty project (no sections yet); the code is generated from the name. */
  create(input: NewProjectInput, by: Id | null): Promise<Project>;
  /** Adds a target language (not the source, not already added); it starts not started. */
  addLanguage(projectId: Id, language: LanguageCode, by: Id | null): Promise<Project>;
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
}

/** Demo sandbox controls (local data source only). */
export interface DemoRepository {
  /** Seeds the demo data if the store is empty. Safe to call more than once. */
  ensureSeeded(): Promise<void>;
  /** Deletes all data and seeds the demo again. */
  reset(): Promise<void>;
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
}

export interface Repositories {
  members: MemberRepository;
  projects: ProjectRepository;
  sections: SectionRepository;
  contentItems: ContentItemRepository;
  images: ImageRepository;
  demo: DemoRepository;
}
