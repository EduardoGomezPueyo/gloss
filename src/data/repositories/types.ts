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

import type { NewProjectInput } from '@/domain/newProject';
import type { ProjectDetail, ProjectSummary } from '@/domain/progress';
import type { SectionInput } from '@/domain/sections';
import type { Id, LanguageCode, Member, Project, Section } from '@/domain/types';

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

export interface Repositories {
  members: MemberRepository;
  projects: ProjectRepository;
  sections: SectionRepository;
  contentItems: ContentItemRepository;
  demo: DemoRepository;
}
