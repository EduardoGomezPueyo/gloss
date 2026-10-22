import type { LanguageCode } from '@/domain/types';

/*
 * "Export to code" (SPEC 5.2, DECISIONS D33). The export is built once in a
 * format-independent shape; each format is a separate adapter, so others can add
 * more (PO, XLIFF in v2) without touching the rest.
 */

/** Which translations go into the file: approved only, or anything with text. */
export type ExportInclude = 'completed' | 'all';

export interface ExportOptions {
  languages: LanguageCode[];
  include: ExportInclude;
}

/** One string of the game: an image's text block and its translations. */
export interface ExportString {
  /** Readable key: section.item.position slugs, e.g. "act-1-opening.north-gate.01". */
  key: string;
  /** Stable internal id of the image; never changes on renames. */
  id: string;
  section: string;
  item: string;
  /** 1-based position of the image in its content item. */
  position: number;
  speaker: string | null;
  type: string | null;
  context: string | null;
  source: string;
  /** null when there is no translation that passes the filter. */
  translations: Record<LanguageCode, string | null>;
}

export interface ExportData {
  project: { name: string; code: string; sourceLanguage: LanguageCode };
  exportedAt: string;
  languages: LanguageCode[];
  include: ExportInclude;
  strings: ExportString[];
}

export interface TranslationExporter {
  id: string;
  /** Shown in the export dialog. */
  label: string;
  extension: string;
  mimeType: string;
  serialize(data: ExportData): string;
}
