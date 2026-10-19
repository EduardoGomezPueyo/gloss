import type {
  ContentItem,
  Entity,
  Project,
  SceneImage,
  Section,
  Status,
  Translation,
} from '@/domain/types';

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

function entity(prefix: string, at = '2026-01-01T00:00:00.000Z'): Entity {
  return { id: nextId(prefix), createdAt: at, updatedAt: at, createdBy: null, updatedBy: null };
}

export function aProject(overrides: Partial<Project> = {}): Project {
  return {
    ...entity('project'),
    name: 'Project',
    code: 'P-1',
    releaseDate: null,
    sourceLanguage: 'en',
    targetLanguages: ['es', 'fr'],
    platforms: ['pc'],
    managerIds: [],
    memberIds: [],
    priority: 'none',
    ...overrides,
  };
}

export function aSection(projectId: string, overrides: Partial<Section> = {}): Section {
  return {
    ...entity('section'),
    projectId,
    name: 'Section',
    description: '',
    order: 0,
    ...overrides,
  };
}

export function anItem(section: Section, overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    ...entity('item'),
    projectId: section.projectId,
    sectionId: section.id,
    name: 'Item',
    type: 'Dialogue',
    order: 0,
    translatorNote: null,
    ...overrides,
  };
}

export function anImage(item: ContentItem, overrides: Partial<SceneImage> = {}): SceneImage {
  return {
    ...entity('image'),
    projectId: item.projectId,
    contentItemId: item.id,
    order: 0,
    title: 'Image',
    fileName: 'image.png',
    fileId: null,
    source: {
      text: 'one two three',
      speaker: null,
      type: null,
      contextNote: null,
      ocrText: null,
      ocrBlocks: [],
    },
    ...overrides,
  };
}

export function aTranslation(
  image: SceneImage,
  language: string,
  status: Status,
  overrides: Partial<Translation> = {},
): Translation {
  return {
    ...entity('translation'),
    projectId: image.projectId,
    imageId: image.id,
    language,
    text: `${language}: ${image.source.text}`,
    status,
    authorId: null,
    reviewerId: null,
    ...overrides,
  };
}
