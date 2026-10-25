import {
  addedPeople,
  commentNotifications,
  filterNotifications,
  notify,
  sortNotifications,
} from './notifications';

const about = { projectId: 'p1', threadId: 't1' };
const people = [
  { id: 'ana', name: 'Ana Torres' },
  { id: 'ben', name: 'Ben Carter' },
  { id: 'chloe', name: 'Chloé Martin' },
];

describe('notify', () => {
  it('skips the person who acted, empty recipients and repeats', () => {
    expect(notify(['ana', 'ben', 'ana', null, 'chloe'], 'chloe', 'resolved', about)).toEqual([
      { recipientId: 'ana', kind: 'resolved', ...about },
      { recipientId: 'ben', kind: 'resolved', ...about },
    ]);
  });
});

describe('commentNotifications', () => {
  it('tells the mentioned people and the earlier writers, once each', () => {
    const drafts = commentNotifications({
      body: 'Thoughts, @Ben Carter?',
      by: 'chloe',
      people,
      earlierAuthorIds: ['ana', 'ben', 'chloe'],
      about,
    });
    expect(drafts.map((d) => [d.recipientId, d.kind])).toEqual([
      ['ben', 'mention'],
      ['ana', 'reply'],
    ]);
  });

  it('only mentions the project people, and never the author', () => {
    const drafts = commentNotifications({
      body: '@Chloé Martin and @Somebody Else',
      by: 'chloe',
      people,
      earlierAuthorIds: [],
      about,
    });
    expect(drafts).toEqual([]);
  });
});

describe('people added to a project', () => {
  it('finds new managers and members, and everyone on a new project', () => {
    expect(
      addedPeople(
        { managerIds: ['ana'], memberIds: ['ben'] },
        { managerIds: ['ana'], memberIds: ['ben', 'chloe'] },
      ),
    ).toEqual(['chloe']);
    expect(addedPeople(null, { managerIds: ['ana'], memberIds: ['ben'] })).toEqual(['ana', 'ben']);
  });
});

describe('the notification list', () => {
  const list = [
    { id: 'a', kind: 'mention' as const, readAt: null, createdAt: '2026-10-01' },
    { id: 'b', kind: 'reply' as const, readAt: '2026-10-03', createdAt: '2026-10-02' },
    { id: 'c', kind: 'assigned' as const, readAt: null, createdAt: '2026-10-03' },
  ];

  it('orders newest first and filters unread or mentions', () => {
    expect(sortNotifications(list).map((n) => n.id)).toEqual(['c', 'b', 'a']);
    expect(filterNotifications(list, 'unread').map((n) => n.id)).toEqual(['a', 'c']);
    expect(filterNotifications(list, 'mentions').map((n) => n.id)).toEqual(['a']);
    expect(filterNotifications(list, 'all')).toHaveLength(3);
  });
});
