/** Character and line counts, compared with the source to see whether a text fits (SPEC 5.4). */
export interface TextStats {
  characters: number;
  lines: number;
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function textStats(text: string): TextStats {
  // User-perceived characters, so accented letters and CJK count as one.
  const characters = [...graphemes.segment(text)].length;
  return { characters, lines: text === '' ? 0 : text.split(/\r\n|\r|\n/).length };
}
