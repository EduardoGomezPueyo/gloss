import {
  parseWorkspaceSnapshot,
  rebaseTimestamps,
  WORKSPACE_DATA_KEYS,
  type WorkspaceData,
} from './workspace';

const emptyData = () =>
  Object.fromEntries(WORKSPACE_DATA_KEYS.map((key) => [key, []])) as unknown as WorkspaceData;

const snapshot = (overrides: Record<string, unknown> = {}) => ({
  format: 'translator-tool-workspace',
  version: 1,
  exportedAt: '2026-01-01T00:00:00.000Z',
  data: emptyData(),
  files: [{ id: 'f1', name: 'a.svg', type: 'image/svg+xml', url: 'images/a.svg' }],
  ...overrides,
});

describe('parseWorkspaceSnapshot', () => {
  it('accepts a valid snapshot and defaults missing files to none', () => {
    expect(parseWorkspaceSnapshot(snapshot())).toMatchObject({ ok: true });
    const parsed = parseWorkspaceSnapshot(snapshot({ files: undefined }));
    expect(parsed.ok && parsed.snapshot.files).toEqual([]);
  });

  it('rejects other formats, versions and shapes', () => {
    expect(parseWorkspaceSnapshot(null)).toEqual({ ok: false, error: 'format' });
    expect(parseWorkspaceSnapshot(snapshot({ format: 'other' }))).toEqual({
      ok: false,
      error: 'format',
    });
    expect(parseWorkspaceSnapshot(snapshot({ version: 2 }))).toEqual({
      ok: false,
      error: 'version',
    });
    expect(parseWorkspaceSnapshot(snapshot({ exportedAt: 'yesterday' }))).toMatchObject({
      error: 'shape',
    });
    expect(
      parseWorkspaceSnapshot(snapshot({ data: { ...emptyData(), members: undefined } })),
    ).toMatchObject({ error: 'shape' });
    expect(parseWorkspaceSnapshot(snapshot({ files: [{ id: 'f1' }] }))).toMatchObject({
      error: 'shape',
    });
  });
});

describe('rebaseTimestamps', () => {
  it('moves every *At field forward by the time since the export', () => {
    const data = emptyData();
    data.commentThreads = [
      {
        id: 't1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        createdBy: null,
        updatedBy: null,
        projectId: 'p1',
        imageId: 'i1',
        language: null,
        resolvedAt: null,
        resolvedBy: null,
      },
    ];
    const rebased = rebaseTimestamps(
      data,
      '2026-01-03T00:00:00.000Z',
      new Date('2026-01-13T00:00:00.000Z'),
    );
    expect(rebased.commentThreads[0]).toMatchObject({
      createdAt: '2026-01-11T00:00:00.000Z',
      updatedAt: '2026-01-12T00:00:00.000Z',
      resolvedAt: null,
      imageId: 'i1',
    });
    expect(data.commentThreads[0]!.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('leaves the data as it is when the export is not in the past', () => {
    const data = emptyData();
    expect(rebaseTimestamps(data, '2026-01-03T00:00:00.000Z', new Date('2026-01-01'))).toBe(data);
  });
});
