import { addableTargetLanguages } from './languages';
import { nextOrder, validateSection } from './sections';

describe('validateSection', () => {
  it('requires a name and trims both fields', () => {
    expect(validateSection({ name: '  ', description: 'x' })).toEqual({
      ok: false,
      errors: ['nameRequired'],
    });
    expect(validateSection({ name: ' Act 5 ', description: ' Finale. ' })).toEqual({
      ok: true,
      input: { name: 'Act 5', description: 'Finale.' },
    });
  });
});

describe('nextOrder', () => {
  it('places new sections after the last one', () => {
    expect(nextOrder([])).toBe(0);
    expect(nextOrder([{ order: 0 }, { order: 3 }, { order: 1 }])).toBe(4);
  });
});

describe('addableTargetLanguages', () => {
  it('excludes the source language and the languages already added', () => {
    const addable = addableTargetLanguages('en', ['es', 'fr']);
    expect(addable).not.toContain('en');
    expect(addable).not.toContain('es');
    expect(addable).not.toContain('fr');
    expect(addable).toContain('ja');
  });
});
