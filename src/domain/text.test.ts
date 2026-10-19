import { countCharacters, countLines, countWords } from './text';

describe('countWords', () => {
  it('counts words, ignoring punctuation and extra spaces', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('  Hello,   world!  ')).toBe(2);
    expect(countWords("Don't stop — well-known 8 steps")).toBe(5);
    expect(countWords('¡Nos vemos en la estación!')).toBe(5);
  });
});

describe('countCharacters', () => {
  it('counts user-perceived characters', () => {
    expect(countCharacters('')).toBe(0);
    expect(countCharacters('año')).toBe(3);
    expect(countCharacters('👍🏽!')).toBe(2);
  });
});

describe('countLines', () => {
  it('counts lines with any line ending', () => {
    expect(countLines('')).toBe(0);
    expect(countLines('one')).toBe(1);
    expect(countLines('one\ntwo\r\nthree')).toBe(3);
  });
});
