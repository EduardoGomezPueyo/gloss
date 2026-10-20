import { normalizeForSearch } from './filters';

/*
 * Project identifier (e.g. "SMP-ALPHA-2026"). The create modal has no field for
 * it, so it is generated from the name: up to three word initials (or the first
 * letters of a single word) plus the creation year, with a numeric suffix if
 * the code is already taken.
 */

export function generateProjectCode(
  name: string,
  year: number,
  existingCodes: readonly string[],
): string {
  const words = normalizeForSearch(name)
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

  let stem: string;
  if (words.length === 0) stem = 'PRJ';
  else if (words.length === 1) stem = words[0]!.slice(0, 4);
  else
    stem = words
      .slice(0, 3)
      .map((word) => word[0])
      .join('');

  const base = `${stem}-${year}`;
  const taken = new Set(existingCodes);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}
