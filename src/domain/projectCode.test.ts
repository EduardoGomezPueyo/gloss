import { generateProjectCode } from './projectCode';

describe('generateProjectCode', () => {
  it('uses the initials of up to three words and the year', () => {
    expect(generateProjectCode('The Lantern Keeper of Ashvale', 2026, [])).toBe('TLK-2026');
  });

  it('uses the first letters of a single word', () => {
    expect(generateProjectCode('Moonfall', 2026, [])).toBe('MOON-2026');
  });

  it('ignores accents and punctuation', () => {
    expect(generateProjectCode('Ébano: el Río', 2027, [])).toBe('EER-2027');
  });

  it('falls back to PRJ when the name has no letters or digits', () => {
    expect(generateProjectCode('***', 2026, [])).toBe('PRJ-2026');
  });

  it('adds a numeric suffix when the code is taken', () => {
    expect(generateProjectCode('Moonfall', 2026, ['MOON-2026', 'MOON-2026-2'])).toBe('MOON-2026-3');
  });
});
