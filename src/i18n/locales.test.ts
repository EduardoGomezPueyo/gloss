import en from './locales/en.json';
import es from './locales/es.json';

function keyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('UI locales', () => {
  it('Spanish defines exactly the same keys as English', () => {
    expect(keyPaths(es).sort()).toEqual(keyPaths(en).sort());
  });
});
