import { aProject, aSection, aTranslation, anImage, anItem } from '@/test/builders';
import { textStats } from './textStats';
import {
  approve,
  canMarkTranslated,
  canReview,
  editTranslation,
  isTranslated,
  requestChanges,
  setReady,
  submitForReview,
} from './translationWorkflow';
import type { Status, Translation } from './types';

const now = new Date('2026-10-22T10:00:00.000Z');
const image = anImage(anItem(aSection(aProject().id)));
const t = (status: Status, overrides: Partial<Translation> = {}) =>
  aTranslation(image, 'es', status, overrides);

describe('translation workflow', () => {
  it('editing makes a translation In progress, not ready and unreviewed', () => {
    for (const status of ['not-started', 'under-review', 'completed'] as const) {
      const before = t(status, { ready: true, reviewerId: 'm1' });
      expect(editTranslation(before, 'Hola', 'w1', now)).toMatchObject({
        text: 'Hola',
        status: 'in-progress',
        ready: false,
        reviewerId: null,
        authorId: 'w1',
        updatedBy: 'w1',
      });
    }
    const same = t('completed', { text: 'Hola' });
    expect(editTranslation(same, 'Hola', 'w1', now)).toBe(same);
  });

  it('marks only in-progress translations with text', () => {
    expect(setReady(t('in-progress', { text: 'Hola' }), true, 'w1', now).ready).toBe(true);
    expect(setReady(t('in-progress', { text: '  ' }), true, 'w1', now).ready).toBe(false);
    expect(canMarkTranslated(t('under-review'))).toBe(false);
    expect(setReady(t('in-progress', { ready: true }), false, 'w1', now).ready).toBe(false);
  });

  it('submits only the marked translations for review', () => {
    const marked = t('in-progress', { ready: true });
    const submitted = submitForReview([marked, t('in-progress'), t('completed')], 'w1', now);
    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toMatchObject({ id: marked.id, status: 'under-review', ready: false });
  });

  it('lets a manager approve or request changes on Under Review only', () => {
    expect(approve(t('under-review'), 'm1', now)).toMatchObject({
      status: 'completed',
      reviewerId: 'm1',
    });
    expect(requestChanges(t('under-review'), 'm1', now)).toMatchObject({
      status: 'in-progress',
      ready: false,
    });
    const inProgress = t('in-progress');
    expect(approve(inProgress, 'm1', now)).toBe(inProgress);
    expect(canReview({ category: 'manager' })).toBe(true);
    expect(canReview({ category: 'worker' })).toBe(false);
  });

  it('counts marked, under review and completed as translated', () => {
    expect(isTranslated(t('in-progress', { ready: true }))).toBe(true);
    expect(isTranslated(t('under-review'))).toBe(true);
    expect(isTranslated(t('in-progress'))).toBe(false);
    expect(isTranslated(undefined)).toBe(false);
  });
});

describe('textStats', () => {
  it('counts characters (accents and CJK as one) and lines', () => {
    expect(textStats('¡Hola!\nAdiós')).toEqual({ characters: 12, lines: 2 });
    expect(textStats('夜明け')).toEqual({ characters: 3, lines: 1 });
    expect(textStats('')).toEqual({ characters: 0, lines: 0 });
  });
});
