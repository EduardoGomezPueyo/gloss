import Dexie, { type EntityTable } from 'dexie';
import { DEFAULT_CATEGORIES } from '@/domain/glossary';
import type {
  Comment,
  CommentThread,
  ContentItem,
  GlossaryCategory,
  GlossaryEntry,
  GlossaryVersion,
  Member,
  Project,
  SceneImage,
  Section,
  Translation,
} from '@/domain/types';

export interface MetaRecord {
  key: string;
  value: string;
}

/** Set once the workspace is initialized. The key predates D34, when it marked the seed. */
export const META_INITIALIZED_AT = 'seededAt';

/** The workspace settings as JSON (DECISIONS D41). */
export const META_SETTINGS = 'settings';

/**
 * An uploaded file. Stored as bytes rather than a Blob so it survives every
 * IndexedDB implementation (and serializes the same for a future backend).
 */
export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer;
  createdAt: string;
}

/** IndexedDB schema. Bump the version and add a migration when it changes. */
export class TranslatorDb extends Dexie {
  members!: EntityTable<Member, 'id'>;
  projects!: EntityTable<Project, 'id'>;
  sections!: EntityTable<Section, 'id'>;
  contentItems!: EntityTable<ContentItem, 'id'>;
  images!: EntityTable<SceneImage, 'id'>;
  translations!: EntityTable<Translation, 'id'>;
  files!: EntityTable<StoredFile, 'id'>;
  commentThreads!: EntityTable<CommentThread, 'id'>;
  comments!: EntityTable<Comment, 'id'>;
  glossaryCategories!: EntityTable<GlossaryCategory, 'id'>;
  glossaryEntries!: EntityTable<GlossaryEntry, 'id'>;
  glossaryVersions!: EntityTable<GlossaryVersion, 'id'>;
  meta!: EntityTable<MetaRecord, 'key'>;

  constructor(name = 'translator') {
    super(name);
    this.version(1).stores({
      members: 'id',
      projects: 'id',
      sections: 'id, projectId',
      contentItems: 'id, projectId, sectionId',
      images: 'id, projectId, contentItemId',
      translations: 'id, projectId, imageId, &[imageId+language]',
      meta: 'key',
    });
    // Phase 4: image files and OCR status; images lose their title (DECISIONS D29).
    this.version(2)
      .stores({
        images: 'id, projectId, contentItemId, ocrStatus',
        files: 'id',
      })
      .upgrade((tx) =>
        tx
          .table('images')
          .toCollection()
          .modify((image: Record<string, unknown>) => {
            delete image.title;
            image.ocrStatus ??= 'done';
            image.ocrError ??= null;
          }),
      );
    // Phase 5: comments, and the "Mark translated" flag (DECISIONS D30).
    this.version(3)
      .stores({
        commentThreads: 'id, projectId, imageId',
        comments: 'id, projectId, threadId',
      })
      .upgrade((tx) =>
        tx
          .table('translations')
          .toCollection()
          .modify((translation: Record<string, unknown>) => {
            translation.ready ??= false;
          }),
      );
    // Phase 6: per-project glossary (DECISIONS D31). Existing projects get the default categories.
    this.version(4)
      .stores({
        glossaryCategories: 'id, projectId',
        glossaryEntries: 'id, projectId',
        glossaryVersions: 'id, projectId, entryId',
      })
      .upgrade(async (tx) => {
        const projects = await tx.table('projects').toArray();
        const now = new Date().toISOString();
        await tx.table('glossaryCategories').bulkAdd(
          projects.flatMap((project: { id: string }) =>
            DEFAULT_CATEGORIES.map((name, order) => ({
              id: crypto.randomUUID(),
              createdAt: now,
              updatedAt: now,
              createdBy: null,
              updatedBy: null,
              projectId: project.id,
              name,
              order,
            })),
          ),
        );
      });
  }

  /** Tables that hold workspace data (everything except meta). */
  get dataTables() {
    return [
      this.members,
      this.projects,
      this.sections,
      this.contentItems,
      this.images,
      this.translations,
      this.files,
      this.commentThreads,
      this.comments,
      this.glossaryCategories,
      this.glossaryEntries,
      this.glossaryVersions,
    ];
  }
}
