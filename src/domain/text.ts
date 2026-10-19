/** Words in a text: runs of letters or digits (works for spaced scripts; CJK counts per run). */
export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

/** Characters as the user perceives them (grapheme clusters), not UTF-16 units. */
export function countCharacters(text: string): number {
  return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length;
}

export function countLines(text: string): number {
  return text === '' ? 0 : text.split(/\r\n|\r|\n/).length;
}
