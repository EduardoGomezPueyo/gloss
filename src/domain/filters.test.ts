import { aProject } from '@/test/builders';
import {
  clearFilterCategory,
  EMPTY_FILTERS,
  filterProjects,
  hasActiveFilters,
  matchesSearch,
  toggleFilterValue,
  type ProjectFilters,
} from './filters';
import type { ProjectSummary } from './progress';
import type { Project, Status } from './types';

function summary(overrides: Partial<Project>, status: Status = 'not-started'): ProjectSummary {
  return { project: aProject(overrides), wordCount: 0, progress: 0, status, languages: [] };
}

const alpha = summary(
  {
    name: 'Alpha',
    code: 'ALP-2026',
    platforms: ['pc', 'switch'],
    managerIds: ['m1'],
    memberIds: ['w1', 'w2'],
    priority: 'urgent',
  },
  'in-progress',
);
const beta = summary(
  {
    name: 'Bêta Quest',
    code: 'BQ-2026',
    platforms: ['xbox'],
    managerIds: ['m2'],
    memberIds: ['w2'],
    priority: 'low',
  },
  'completed',
);
const gamma = summary(
  {
    name: 'Gamma',
    code: 'GAM-2027',
    platforms: [],
    managerIds: ['m1', 'm2'],
    memberIds: [],
    priority: 'none',
  },
  'not-started',
);
const all = [alpha, beta, gamma];

const names = (list: ProjectSummary[]) => list.map((s) => s.project.name);
const filters = (patch: Partial<ProjectFilters>): ProjectFilters => ({
  ...EMPTY_FILTERS,
  ...patch,
});

describe('filterProjects', () => {
  it('returns every project with no filters and no search', () => {
    expect(names(filterProjects(all, EMPTY_FILTERS, ''))).toEqual(['Alpha', 'Bêta Quest', 'Gamma']);
  });

  it('filters by platform, manager, worker, priority and derived status', () => {
    expect(names(filterProjects(all, filters({ platforms: ['switch'] }), ''))).toEqual(['Alpha']);
    expect(names(filterProjects(all, filters({ managers: ['m2'] }), ''))).toEqual([
      'Bêta Quest',
      'Gamma',
    ]);
    expect(names(filterProjects(all, filters({ workers: ['w2'] }), ''))).toEqual([
      'Alpha',
      'Bêta Quest',
    ]);
    expect(names(filterProjects(all, filters({ priorities: ['none'] }), ''))).toEqual(['Gamma']);
    expect(names(filterProjects(all, filters({ statuses: ['completed'] }), ''))).toEqual([
      'Bêta Quest',
    ]);
  });

  it('matches any value inside one category (OR)', () => {
    expect(
      names(filterProjects(all, filters({ statuses: ['in-progress', 'not-started'] }), '')),
    ).toEqual(['Alpha', 'Gamma']);
  });

  it('requires every active category to match (AND)', () => {
    expect(
      names(filterProjects(all, filters({ managers: ['m1'], statuses: ['not-started'] }), '')),
    ).toEqual(['Gamma']);
    expect(filterProjects(all, filters({ managers: ['m2'], platforms: ['pc'] }), '')).toEqual([]);
  });

  it('combines filters with the search', () => {
    expect(names(filterProjects(all, filters({ managers: ['m1'] }), 'gam'))).toEqual(['Gamma']);
  });
});

describe('matchesSearch', () => {
  it('ignores case, accents and surrounding spaces', () => {
    expect(matchesSearch(beta, '  BETA ')).toBe(true);
    expect(matchesSearch(beta, 'quest')).toBe(true);
    expect(matchesSearch(beta, 'alpha')).toBe(false);
  });

  it('also matches the project code', () => {
    expect(matchesSearch(gamma, 'gam-2027')).toBe(true);
  });

  it('matches everything with an empty query', () => {
    expect(matchesSearch(alpha, '   ')).toBe(true);
  });
});

describe('filter state helpers', () => {
  it('toggles a value on and off', () => {
    const on = toggleFilterValue(EMPTY_FILTERS, 'platforms', 'pc');
    expect(on.platforms).toEqual(['pc']);
    expect(hasActiveFilters(on)).toBe(true);
    const off = toggleFilterValue(on, 'platforms', 'pc');
    expect(off.platforms).toEqual([]);
    expect(hasActiveFilters(off)).toBe(false);
  });

  it('clears one category and keeps the others', () => {
    const state = filters({ statuses: ['completed'], managers: ['m1'] });
    expect(clearFilterCategory(state, 'statuses')).toEqual(filters({ managers: ['m1'] }));
  });
});
