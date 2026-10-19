import { aProject } from '@/test/builders';
import type { ProjectSummary } from './progress';
import { DEFAULT_PROJECT_SORT, nextSort, sortProjects } from './sorting';
import type { Priority, Status } from './types';

function summary(name: string, priority: Priority, status: Status): ProjectSummary {
  return {
    project: aProject({ name, priority }),
    wordCount: 0,
    progress: 0,
    status,
    languages: [],
  };
}

const projects = [
  summary('beta', 'low', 'completed'),
  summary('Alpha', 'urgent', 'not-started'),
  summary('Gamma 10', 'none', 'in-progress'),
  summary('Gamma 2', 'high', 'under-review'),
  summary('delta', 'urgent', 'in-progress'),
];

const names = (list: ProjectSummary[]) => list.map((p) => p.project.name);

describe('sortProjects', () => {
  it('sorts by name A-Z by default, case-insensitively and with natural numbers', () => {
    expect(names(sortProjects(projects))).toEqual([
      'Alpha',
      'beta',
      'delta',
      'Gamma 2',
      'Gamma 10',
    ]);
  });

  it('sorts by name Z-A', () => {
    expect(names(sortProjects(projects, { key: 'name', direction: 'desc' }))).toEqual([
      'Gamma 10',
      'Gamma 2',
      'delta',
      'beta',
      'Alpha',
    ]);
  });

  it('sorts by priority from Urgent to None, ties by name', () => {
    expect(names(sortProjects(projects, { key: 'priority', direction: 'asc' }))).toEqual([
      'Alpha',
      'delta',
      'Gamma 2',
      'beta',
      'Gamma 10',
    ]);
  });

  it('sorts by status: In progress > Under Review > Not started > Completed', () => {
    expect(names(sortProjects(projects, { key: 'status', direction: 'asc' }))).toEqual([
      'delta',
      'Gamma 10',
      'Gamma 2',
      'Alpha',
      'beta',
    ]);
  });

  it('does not mutate the input', () => {
    const copy = [...projects];
    sortProjects(projects, { key: 'priority', direction: 'desc' });
    expect(projects).toEqual(copy);
  });
});

describe('nextSort', () => {
  it('toggles direction on the same column and resets on a new one', () => {
    const desc = nextSort(DEFAULT_PROJECT_SORT, 'name');
    expect(desc).toEqual({ key: 'name', direction: 'desc' });
    expect(nextSort(desc, 'name')).toEqual({ key: 'name', direction: 'asc' });
    expect(nextSort(desc, 'priority')).toEqual({ key: 'priority', direction: 'asc' });
  });
});
