import type { TranslationExporter } from './types';

/** RFC 4180: quote fields with commas, quotes or line breaks; double inner quotes. */
export function csvField(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Same rows as the JSON, one column per language. UTF-8 with a byte order mark so
 * spreadsheet apps read accents correctly; CRLF line endings (RFC 4180).
 */
export const csvExporter: TranslationExporter = {
  id: 'csv',
  label: 'CSV',
  extension: 'csv',
  mimeType: 'text/csv;charset=utf-8',
  serialize: (data) => {
    const header = [
      'key',
      'id',
      'section',
      'item',
      'position',
      'speaker',
      'type',
      'context',
      'source',
      ...data.languages,
    ];
    const rows = data.strings.map((s) => [
      s.key,
      s.id,
      s.section,
      s.item,
      s.position,
      s.speaker,
      s.type,
      s.context,
      s.source,
      ...data.languages.map((language) => s.translations[language] ?? null),
    ]);
    const lines = [header, ...rows].map((row) => row.map(csvField).join(','));
    return `\uFEFF${lines.join('\r\n')}\r\n`;
  },
};
