import { aggregateStatus } from './status';

describe('aggregateStatus', () => {
  it('is "not started" when there is nothing or nothing has started', () => {
    expect(aggregateStatus([])).toBe('not-started');
    expect(aggregateStatus(['not-started', 'not-started'])).toBe('not-started');
  });

  it('is "completed" only when everything is completed', () => {
    expect(aggregateStatus(['completed', 'completed'])).toBe('completed');
  });

  it('is "under review" when everything is under review or completed', () => {
    expect(aggregateStatus(['under-review', 'completed'])).toBe('under-review');
    expect(aggregateStatus(['under-review'])).toBe('under-review');
  });

  it('is "in progress" for any other mix', () => {
    expect(aggregateStatus(['in-progress'])).toBe('in-progress');
    expect(aggregateStatus(['not-started', 'completed'])).toBe('in-progress');
    expect(aggregateStatus(['not-started', 'under-review'])).toBe('in-progress');
    expect(aggregateStatus(['in-progress', 'completed'])).toBe('in-progress');
  });
});
