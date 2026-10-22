import { aggregateStatus } from './status';
import { countWords } from './text';
import type {
  ContentItem,
  Id,
  LanguageCode,
  Project,
  SceneImage,
  Section,
  Status,
  Timestamp,
  Translation,
} from './types';

/*
 * Progress and read models (SPEC 6, [Proposal] confirmed in DECISIONS D18):
 * - item     = completed translations ÷ (images × target languages)
 * - section  = average of its items
 * - project  = average of its sections
 * - language = completed translations in that language ÷ total images (of the
 *   project, or of one section for the section detail)
 * Progress is a fraction between 0 and 1.
 */

export interface LastUpdate {
  at: Timestamp;
  by: Id | null;
}

export interface ItemSummary {
  item: ContentItem;
  imageCount: number;
  wordCount: number;
  languageCount: number;
  progress: number;
  status: Status;
  lastUpdate: LastUpdate;
}

export interface SectionSummary {
  section: Section;
  items: ItemSummary[];
  wordCount: number;
  progress: number;
  status: Status;
  /** Per-language progress of this section's images only (DECISIONS D28). */
  languages: LanguageProgress[];
}

export interface LanguageProgress {
  language: LanguageCode;
  progress: number;
  status: Status;
}

export interface ProjectSummary {
  project: Project;
  wordCount: number;
  progress: number;
  status: Status;
  languages: LanguageProgress[];
}

export interface ProjectDetail extends ProjectSummary {
  sections: SectionSummary[];
}

/** Everything that belongs to one project. */
export interface ProjectData {
  project: Project;
  sections: Section[];
  items: ContentItem[];
  images: SceneImage[];
  translations: Translation[];
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
}

function byOrder<T extends { order: number }>(a: T, b: T): number {
  return a.order - b.order;
}

/** Status of every (image, target language) cell; missing translations count as not started. */
function cellStatuses(
  images: readonly SceneImage[],
  languages: readonly LanguageCode[],
  translationOf: (imageId: Id, language: LanguageCode) => Translation | undefined,
): Status[] {
  return images.flatMap((image) =>
    languages.map((language) => translationOf(image.id, language)?.status ?? 'not-started'),
  );
}

function completedShare(statuses: readonly Status[]): number {
  if (statuses.length === 0) return 0;
  return statuses.filter((s) => s === 'completed').length / statuses.length;
}

function latest(candidates: readonly LastUpdate[]): LastUpdate {
  return candidates.reduce((a, b) => (b.at > a.at ? b : a));
}

export function summarizeProject(data: ProjectData): ProjectDetail {
  const { project } = data;
  const languages = project.targetLanguages;

  const translationIndex = new Map<string, Translation>();
  for (const t of data.translations) {
    if (languages.includes(t.language)) translationIndex.set(`${t.imageId}|${t.language}`, t);
  }
  const translationOf = (imageId: Id, language: LanguageCode) =>
    translationIndex.get(`${imageId}|${language}`);

  const imagesByItem = new Map<Id, SceneImage[]>();
  for (const image of data.images) {
    const list = imagesByItem.get(image.contentItemId) ?? [];
    list.push(image);
    imagesByItem.set(image.contentItemId, list);
  }

  const summarizeItem = (item: ContentItem): ItemSummary => {
    const images = imagesByItem.get(item.id) ?? [];
    const statuses = cellStatuses(images, languages, translationOf);
    const updates: LastUpdate[] = [{ at: item.updatedAt, by: item.updatedBy }];
    for (const image of images) {
      updates.push({ at: image.updatedAt, by: image.updatedBy });
      for (const language of languages) {
        const t = translationOf(image.id, language);
        if (t) updates.push({ at: t.updatedAt, by: t.updatedBy });
      }
    }
    return {
      item,
      imageCount: images.length,
      wordCount: images.reduce((sum, image) => sum + countWords(image.source.text), 0),
      languageCount: languages.length,
      progress: completedShare(statuses),
      status: aggregateStatus(statuses),
      lastUpdate: latest(updates),
    };
  };

  const languageProgressOf = (images: readonly SceneImage[]): LanguageProgress[] =>
    languages.map((language) => {
      const statuses = cellStatuses(images, [language], translationOf);
      return { language, progress: completedShare(statuses), status: aggregateStatus(statuses) };
    });

  const sections: SectionSummary[] = [...data.sections].sort(byOrder).map((section) => {
    const sectionItems = data.items.filter((item) => item.sectionId === section.id).sort(byOrder);
    const images = sectionItems.flatMap((item) => imagesByItem.get(item.id) ?? []);
    const items = sectionItems.map(summarizeItem);
    return {
      section,
      items,
      wordCount: items.reduce((sum, i) => sum + i.wordCount, 0),
      progress: average(items.map((i) => i.progress)),
      status: aggregateStatus(cellStatuses(images, languages, translationOf)),
      languages: languageProgressOf(images),
    };
  });

  const projectImages = data.images.filter((image) =>
    data.items.some((item) => item.id === image.contentItemId),
  );

  return {
    project,
    sections,
    wordCount: sections.reduce((sum, s) => sum + s.wordCount, 0),
    progress: average(sections.map((s) => s.progress)),
    status: aggregateStatus(cellStatuses(projectImages, languages, translationOf)),
    languages: languageProgressOf(projectImages),
  };
}

/** Summary without the per-section breakdown (project list). */
export function toProjectSummary(detail: ProjectDetail): ProjectSummary {
  const { project, wordCount, progress, status, languages } = detail;
  return { project, wordCount, progress, status, languages };
}

/** Whole-number percentage for display. */
export function toPercent(progress: number): number {
  return Math.round(progress * 100);
}
