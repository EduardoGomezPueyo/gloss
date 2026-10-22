import { LANGUAGES } from '@/domain/languages';
import { tesseractLanguage } from './languages';
import { pickBetterResult, softenPixels } from './preprocess';

describe('tesseractLanguage', () => {
  it('has a model for every catalog language, regional variants sharing one', () => {
    for (const { code } of LANGUAGES) expect(tesseractLanguage(code)).toBeTruthy();
    expect(tesseractLanguage('pt-BR')).toBe(tesseractLanguage('pt'));
    expect(tesseractLanguage('ja')).toBe('jpn');
    expect(tesseractLanguage('xx')).toBeUndefined();
  });
});

describe('softenPixels', () => {
  it('turns a dark image into inverted grayscale', () => {
    // A dark blue box (most pixels) with one white text pixel at the end.
    const box = [20, 40, 140, 255];
    const pixels = new Uint8ClampedArray([...box, ...box, ...box, 255, 255, 255, 255]);
    expect(softenPixels(pixels)).toBe(true);
    expect(pixels[12]).toBe(0); // white text became black
    expect(pixels[0]).toBeGreaterThan(180); // dark box became light
    expect(pixels[0]).toBe(pixels[1]);
    expect(pixels[3]).toBe(255); // alpha untouched
  });

  it('keeps a light image the right way round', () => {
    const pixels = new Uint8ClampedArray([240, 240, 240, 255, 10, 10, 10, 255, 250, 250, 250, 255]);
    expect(softenPixels(pixels)).toBe(false);
    expect(pixels[4]).toBe(10);
  });
});

describe('pickBetterResult', () => {
  const result = (text: string, confidence: number) => ({ text, confidence, blocks: [] });

  it('ignores a confident empty result', () => {
    const read = result('Meet me at the gate', 80);
    expect(pickBetterResult(result('', 95), read)).toBe(read);
  });

  it('prefers more text read with similar confidence', () => {
    const full = result('Meet me at the north gate', 90);
    expect(pickBetterResult(full, result('Meet', 92))).toBe(full);
  });
});
