import {
  canEditProject,
  checkProjectDetails,
  formatReleaseDate,
  parseReleaseDate,
  releaseYears,
} from './projectDetails';

describe('project details', () => {
  it('lets only active managers edit', () => {
    expect(canEditProject({ category: 'manager', status: 'active' })).toBe(true);
    expect(canEditProject({ category: 'manager', status: 'invited' })).toBe(false);
    expect(canEditProject({ category: 'worker', status: 'active' })).toBe(false);
    expect(canEditProject(null)).toBe(false);
  });

  it('keeps at least one manager and nobody in both roles', () => {
    const project = { managerIds: ['a'], memberIds: ['b'] };
    expect(checkProjectDetails(project, { priority: 'high' })).toBeNull();
    expect(checkProjectDetails(project, { managerIds: [] })).toBe('managerRequired');
    expect(checkProjectDetails(project, { memberIds: ['a', 'b'] })).toBe('managerAndMember');
    expect(checkProjectDetails(project, { managerIds: ['a', 'c'] })).toBeNull();
  });

  it('reads and writes release quarters', () => {
    expect(parseReleaseDate('Q3 2026')).toEqual({ quarter: 3, year: 2026 });
    expect(parseReleaseDate(' q1  2027 ')).toEqual({ quarter: 1, year: 2027 });
    expect(parseReleaseDate('Spring 2026')).toBeNull();
    expect(parseReleaseDate(null)).toBeNull();
    expect(formatReleaseDate({ quarter: 4, year: 2028 })).toBe('Q4 2028');
  });

  it('offers last year to ten years ahead, keeping a stored year outside the range', () => {
    const years = releaseYears(2026);
    expect(years[0]).toBe(2025);
    expect(years.at(-1)).toBe(2036);
    expect(releaseYears(2026, 2020)[0]).toBe(2020);
  });
});
