import { aggregateStatus, PRIORITY_SORT_ORDER } from './status';
import { isTranslated } from './translationWorkflow';
import type {
  Assignment,
  Id,
  LanguageCode,
  Priority,
  SceneImage,
  Status,
  Timestamp,
  Translation,
} from './types';

/*
 * "Assigned to me" (DECISIONS D44): content items assigned to a person for one
 * language, and the managers' review queue.
 */

/** The assignee of an item in a language, if any. */
export function assigneeOf(
  assignments: readonly Pick<Assignment, 'contentItemId' | 'language' | 'assigneeId'>[],
  itemId: Id,
  language: LanguageCode,
): Id | null {
  return (
    assignments.find((a) => a.contentItemId === itemId && a.language === language)?.assigneeId ??
    null
  );
}

export interface LanguageProgress {
  /** Images with a translation marked translated, under review or completed. */
  done: number;
  total: number;
  status: Status;
}

/** How far an item is in one language, as in the editor's language menu. */
export function itemLanguageProgress(
  images: readonly Pick<SceneImage, 'id'>[],
  translations: readonly Pick<Translation, 'imageId' | 'language' | 'status' | 'ready'>[],
  language: LanguageCode,
): LanguageProgress {
  const cells = images.map((image) =>
    translations.find((t) => t.imageId === image.id && t.language === language),
  );
  return {
    done: cells.filter(isTranslated).length,
    total: images.length,
    status: aggregateStatus(cells.map((c) => c?.status ?? 'not-started')),
  };
}

/** Most urgent project first, then the most recent assignment or submission. */
export function byPriorityThenRecent<T>(
  entries: readonly T[],
  priorityOf: (entry: T) => Priority,
  timeOf: (entry: T) => Timestamp,
): T[] {
  return [...entries].sort(
    (a, b) =>
      PRIORITY_SORT_ORDER.indexOf(priorityOf(a)) - PRIORITY_SORT_ORDER.indexOf(priorityOf(b)) ||
      timeOf(b).localeCompare(timeOf(a)),
  );
}
