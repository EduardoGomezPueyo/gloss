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

/** IndexedDB schema. Bump the version and add a migration when it changes. */
export class TranslatorDb extends Dexie {
  members!: EntityTable<Member, 'id'>;
  projects!: EntityTable<Project, 'id'>;
  sections!: EntityTable<Section, 'id'>;
  contentItems!: EntityTable<ContentItem, 'id'>;
  images!: EntityTable<SceneImage, 'id'>;
  translations!: EntityTable<Translation, 'id'>;
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
    ];
  }
}
