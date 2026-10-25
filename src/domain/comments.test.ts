import { filterCommentInbox, involves, lastActivity, mentions, type ThreadLike } from './comments';

const ben = { id: 'ben', name: 'Ben Carter' };

function entry(
  overrides: Partial<ThreadLike['thread']>,
  comments: Partial<ThreadLike['comments'][number]>[],
): ThreadLike {
  return {
    thread: {
      projectId: 'p1',
      language: 'es',
      resolvedAt: null,
      createdAt: '2026-10-01T10:00:00.000Z',
      ...overrides,
    },
    comments: comments.map((c) => ({
      authorId: 'ana',
      body: 'A comment',
      createdAt: '2026-10-01T10:00:00.000Z',
      ...c,
    })),
  };
}

describe('mentions and involvement', () => {
  it('finds a whole "@Full Name" mention', () => {
    expect(mentions('Please check @Ben Carter.', ben)).toBe(true);
    expect(mentions('@Ben Carter', ben)).toBe(true);
    expect(mentions('Ask @Ben Carterson', ben)).toBe(false);
    expect(mentions('Ben Carter, no at sign', ben)).toBe(false);
  });

  it('counts writing in a thread or being mentioned in any comment', () => {
    expect(involves(entry({}, [{ authorId: 'ben' }]), ben)).toBe(true);
    expect(involves(entry({}, [{}, { body: 'cc @Ben Carter' }]), ben)).toBe(true);
    expect(involves(entry({}, [{}]), ben)).toBe(false);
  });
});

describe('filterCommentInbox', () => {
  const old = entry({ createdAt: '2026-10-01T00:00:00.000Z' }, [
    { createdAt: '2026-10-01T00:00:00.000Z', authorId: 'ben' },
    { createdAt: '2026-10-05T00:00:00.000Z' },
  ]);
  const recent = entry({ createdAt: '2026-10-03T00:00:00.000Z', language: null }, [
    { createdAt: '2026-10-03T00:00:00.000Z' },
  ]);
  const resolved = entry(
    { createdAt: '2026-10-02T00:00:00.000Z', resolvedAt: '2026-10-06T00:00:00.000Z' },
    [{ createdAt: '2026-10-02T00:00:00.000Z', body: '@Ben Carter look' }],
  );
  const all = [recent, old, resolved];
  const base = { state: 'open', language: null, projectId: null, involving: null } as const;

  it('orders by latest activity, replies and resolution included', () => {
    expect(lastActivity(old)).toBe('2026-10-05T00:00:00.000Z');
    expect(lastActivity(resolved)).toBe('2026-10-06T00:00:00.000Z');
    expect(filterCommentInbox(all, base)).toEqual([old, recent]);
  });

  it('filters by state, language, project and involvement', () => {
    expect(filterCommentInbox(all, { ...base, state: 'resolved' })).toEqual([resolved]);
    expect(filterCommentInbox(all, { ...base, language: 'general' })).toEqual([recent]);
    expect(filterCommentInbox(all, { ...base, projectId: 'p2' })).toEqual([]);
    expect(filterCommentInbox(all, { ...base, involving: ben })).toEqual([old]);
  });
});
