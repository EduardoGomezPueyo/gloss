import { formatRelativeTime, relativeTime } from './relativeTime';

const now = new Date('2026-10-22T12:00:00.000Z');
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString();

describe('relativeTime', () => {
  it('uses the largest whole unit', () => {
    expect(relativeTime(ago(30), now)).toEqual({ value: 0, unit: 'second' });
    expect(relativeTime(ago(5 * 60), now)).toEqual({ value: -5, unit: 'minute' });
    expect(relativeTime(ago(2 * 3600 + 59 * 60), now)).toEqual({ value: -2, unit: 'hour' });
    expect(relativeTime(ago(3 * 86400), now)).toEqual({ value: -3, unit: 'day' });
    expect(relativeTime(ago(400 * 86400), now)).toEqual({ value: -1, unit: 'year' });
  });

  it('treats future timestamps (clock skew) as now', () => {
    expect(relativeTime(ago(-60), now)).toEqual({ value: 0, unit: 'second' });
  });

  it('formats in the interface language', () => {
    expect(formatRelativeTime(ago(2 * 3600), now, 'en')).toBe('2h ago');
    expect(formatRelativeTime(ago(2 * 3600), now, 'es')).toBe('hace 2 h');
  });
});
