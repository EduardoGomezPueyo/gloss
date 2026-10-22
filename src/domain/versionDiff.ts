import { diffArrays, diffWordsWithSpace } from 'diff';

/*
 * "Compare versions" (Figma 370:6934, DECISIONS D7): what changed from an older
 * version to the current one, shown on the current column — added text
 * highlighted, removed text struck through, and a bar beside changed paragraphs.
 */

export type DiffKind = 'same' | 'added' | 'removed';

export interface DiffSegment {
  kind: DiffKind;
  text: string;
}

export interface DiffParagraph {
  segments: DiffSegment[];
  changed: boolean;
}

/** Word-level diff from `older` to `current`. */
export function diffText(older: string, current: string): DiffSegment[] {
  return diffWordsWithSpace(older, current).map((change) => ({
    kind: change.added ? 'added' : change.removed ? 'removed' : 'same',
    text: change.value,
  }));
}

/** The diff split into paragraphs (blank-line separated), each marked when it changed. */
export function diffParagraphs(older: string, current: string): DiffParagraph[] {
  const paragraphs: DiffParagraph[] = [{ segments: [], changed: false }];
  for (const segment of diffText(older, current)) {
    const pieces = segment.text.split(/(\n\s*\n)/);
    pieces.forEach((piece, index) => {
      if (index % 2 === 1) {
        paragraphs.push({ segments: [], changed: false });
        return;
      }
      if (piece === '') return;
      const paragraph = paragraphs.at(-1)!;
      paragraph.segments.push({ kind: segment.kind, text: piece });
      if (segment.kind !== 'same') paragraph.changed = true;
    });
  }
  return paragraphs.filter((p) => p.segments.length > 0);
}

/** Tags in current order plus removed ones, each marked. */
export function diffTags(older: readonly string[], current: readonly string[]): DiffSegment[] {
  return diffArrays([...older], [...current]).flatMap((change) =>
    change.value.map((text) => ({
      kind: (change.added ? 'added' : change.removed ? 'removed' : 'same') as DiffKind,
      text,
    })),
  );
}
