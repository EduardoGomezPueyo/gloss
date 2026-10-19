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

import type { ProjectDetail, ProjectSummary } from '@/domain/progress';
import type { Id, Member } from '@/domain/types';

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
  demo: DemoRepository;
}
