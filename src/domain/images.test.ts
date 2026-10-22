import { imageLabel, ocrProgress } from './images';

describe('imageLabel', () => {
  it('names images after their item and position', () => {
    expect(imageLabel('Station rendezvous', 2)).toBe('Station rendezvous - 2');
  });
});

describe('ocrProgress', () => {
  it('counts pending, empty and failed images', () => {
    const statuses = ['done', 'pending', 'pending', 'empty', 'failed'] as const;
    expect(ocrProgress(statuses.map((ocrStatus) => ({ ocrStatus })))).toEqual({
      pending: 2,
      empty: 1,
      failed: 1,
    });
  });
});
