import type { Timestamp } from './types';

export interface RelativeTime {
  value: number;
  unit: Intl.RelativeTimeFormatUnit;
}

const STEPS: ReadonlyArray<[unit: Intl.RelativeTimeFormatUnit, seconds: number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** Largest whole unit between `at` and `now`, as a negative value for the past ("2h ago"). */
export function relativeTime(at: Timestamp, now: Date): RelativeTime {
  const seconds = Math.round((now.getTime() - new Date(at).getTime()) / 1000);
  const elapsed = Math.max(seconds, 0);
  for (const [unit, size] of STEPS) {
    if (elapsed >= size) return { value: -Math.floor(elapsed / size), unit };
  }
  return { value: 0, unit: 'second' };
}

/** e.g. "2h ago" / "hace 2 h", in the interface language. */
export function formatRelativeTime(at: Timestamp, now: Date, locale: string): string {
  const { value, unit } = relativeTime(at, now);
  return new Intl.RelativeTimeFormat(locale, { style: 'narrow', numeric: 'auto' }).format(
    value,
    unit,
  );
}
