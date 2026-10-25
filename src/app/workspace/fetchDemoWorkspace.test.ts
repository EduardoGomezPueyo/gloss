import { WORKSPACE_DATA_KEYS } from '@/domain/workspace';
import { fetchDemoWorkspace, InvalidBackupError, readBackupFile } from './fetchDemoWorkspace';

const SNAPSHOT = {
  format: 'translator-tool-workspace',
  version: 1,
  exportedAt: '2026-01-01T00:00:00.000Z',
  data: {
    ...Object.fromEntries(WORKSPACE_DATA_KEYS.map((key) => [key, []])),
    members: [
      {
        id: 'm1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        createdBy: null,
        updatedBy: null,
        name: 'Demo Manager',
        email: 'demo@example.com',
        category: 'manager',
        status: 'active',
        removedAt: null,
      },
    ],
  },
  files: [{ id: 'f1', name: 'scene.svg', type: 'image/svg+xml', url: 'images/scene.svg' }],
};

function fakeFetch(routes: Record<string, () => Response>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const route = routes[url];
    return route ? route() : new Response('missing', { status: 404 });
  }) as unknown as typeof fetch;
}

describe('fetchDemoWorkspace', () => {
  it('downloads the snapshot and its files relative to it, with recent dates', async () => {
    const fetch = fakeFetch({
      'https://demo.test/v1/workspace.json': () => Response.json(SNAPSHOT),
      // Raw hosts serve SVG as text: the snapshot's type wins.
      'https://demo.test/v1/images/scene.svg': () =>
        new Response('<svg/>', { headers: { 'Content-Type': 'text/plain' } }),
    });
    const loaded = await fetchDemoWorkspace('https://demo.test/v1/workspace.json', {
      fetch,
      now: new Date('2026-01-11T00:00:00.000Z'),
    });

    expect(loaded.data.members[0]).toMatchObject({
      name: 'Demo Manager',
      createdAt: '2026-01-11T00:00:00.000Z',
    });
    expect(loaded.files).toHaveLength(1);
    expect(loaded.files[0]!.data.type).toBe('image/svg+xml');
    expect(await loaded.files[0]!.data.text()).toBe('<svg/>');
  });

  it('fails on HTTP errors and invalid snapshots', async () => {
    await expect(
      fetchDemoWorkspace('https://demo.test/none.json', { fetch: fakeFetch({}) }),
    ).rejects.toThrow('HTTP 404');
    const invalid = fakeFetch({ 'https://demo.test/bad.json': () => Response.json({}) });
    await expect(
      fetchDemoWorkspace('https://demo.test/bad.json', { fetch: invalid }),
    ).rejects.toThrow('invalid format');
  });
});

describe('readBackupFile', () => {
  it('reads a backup with embedded files and keeps its dates', async () => {
    const backup = {
      ...SNAPSHOT,
      files: [{ id: 'f1', name: 'scene.svg', type: 'image/svg+xml', url: 'data:,%3Csvg/%3E' }],
      settings: { workersSeeOnlyTheirProjects: false },
    };
    const loaded = await readBackupFile(new Blob([JSON.stringify(backup)]));
    expect(loaded.data.members[0]!.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(loaded.settings).toEqual({ workersSeeOnlyTheirProjects: false });
    expect(await loaded.files[0]!.data.text()).toBe('<svg/>');
    expect(loaded.files[0]!.data.type).toBe('image/svg+xml');
  });

  it('rejects files that are not backups', async () => {
    await expect(readBackupFile(new Blob(['not json']))).rejects.toBeInstanceOf(InvalidBackupError);
    await expect(readBackupFile(new Blob(['{"format":"other"}']))).rejects.toBeInstanceOf(
      InvalidBackupError,
    );
  });
});
