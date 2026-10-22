import Dexie, { type EntityTable } from 'dexie';
import type {
  ContentItem,
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

export const META_SEEDED_AT = 'seededAt';

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
    ];
  }
}
