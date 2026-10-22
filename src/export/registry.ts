import { csvExporter } from './csv';
import { jsonExporter } from './json';
import type { TranslationExporter } from './types';

/** Available export formats, in the order the dialog shows them. Add new adapters here. */
export const EXPORTERS: readonly TranslationExporter[] = [jsonExporter, csvExporter];

export function getExporter(id: string): TranslationExporter {
  const exporter = EXPORTERS.find((e) => e.id === id);
  if (!exporter) throw new Error(`Unknown export format: ${id}`);
  return exporter;
}
