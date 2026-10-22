import type { ProjectData } from '@/domain/progress';
import type { Id } from '@/domain/types';
import type { ExportData, ExportOptions, ExportString } from './types';

/** "Act 1 - Opening" → "act-1-opening"; accents removed, never empty. */
export function slugify(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'untitled';
}

/** Gives repeated slugs a suffix ("intro", "intro-2"…), in order of appearance. */
function uniqueSlugs<T extends { id: Id; name: string }>(things: readonly T[]): Map<Id, string> {
  const used = new Map<string, number>();
  const result = new Map<Id, string>();
  for (const thing of things) {
    const base = slugify(thing.name);
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    result.set(thing.id, count === 1 ? base : `${base}-${count}`);
  }
  return result;
}

/**
 * Every image of the project, in section → item → image order, with the chosen
 * languages' translations (DECISIONS D33). Pure: the caller passes the time.
 */
export function buildExport(
  data: ProjectData,
  options: ExportOptions,
  exportedAt: Date,
): ExportData {
  const { project } = data;
  const languages = project.targetLanguages.filter((l) => options.languages.includes(l));
  const sections = [...data.sections].sort((a, b) => a.order - b.order);
  const sectionSlugs = uniqueSlugs(sections);
  const strings: ExportString[] = [];

  for (const section of sections) {
    const items = data.items
      .filter((i) => i.sectionId === section.id)
      .sort((a, b) => a.order - b.order);
    const itemSlugs = uniqueSlugs(items);
    for (const item of items) {
      const images = data.images
        .filter((i) => i.contentItemId === item.id)
        .sort((a, b) => a.order - b.order);
      images.forEach((image, index) => {
        const position = index + 1;
        const translations = Object.fromEntries(
          languages.map((language) => {
            const t = data.translations.find(
              (t) => t.imageId === image.id && t.language === language,
            );
            const passes =
              t && t.text.trim() !== '' && (options.include === 'all' || t.status === 'completed');
            return [language, passes ? t.text : null];
          }),
        );
        strings.push({
          key: `${sectionSlugs.get(section.id)}.${itemSlugs.get(item.id)}.${String(position).padStart(2, '0')}`,
          id: image.id,
          section: section.name,
          item: item.name,
          position,
          speaker: image.source.speaker,
          type: image.source.type,
          context: image.source.contextNote,
          source: image.source.text,
          translations,
        });
      });
    }
  }

  return {
    project: { name: project.name, code: project.code, sourceLanguage: project.sourceLanguage },
    exportedAt: exportedAt.toISOString(),
    languages,
    include: options.include,
    strings,
  };
}

/** File name for a download, e.g. "SMP-ALPHA-2026-translations.json". */
export function exportFileName(code: string, extension: string): string {
  return `${slugify(code).toUpperCase()}-translations.${extension}`;
}
