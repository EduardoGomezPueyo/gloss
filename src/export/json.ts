import type { TranslationExporter } from './types';

/** JSON schema version; bump it when the shape changes (DECISIONS D33). */
export const JSON_EXPORT_VERSION = 1;

/** One file with every string and all chosen languages (DECISIONS D33). */
export const jsonExporter: TranslationExporter = {
  id: 'json',
  label: 'JSON',
  extension: 'json',
  mimeType: 'application/json',
  serialize: (data) =>
    `${JSON.stringify({ format: 'translator-export', version: JSON_EXPORT_VERSION, ...data }, null, 2)}\n`,
};
