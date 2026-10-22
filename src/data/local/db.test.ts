import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { TranslatorDb } from './db';

describe('TranslatorDb migrations', () => {
  it('upgrades a v1 database to the current schema', async () => {
    const name = 'migration-test';
    const v1 = new Dexie(name);
    v1.version(1).stores({
      members: 'id',
      projects: 'id',
      sections: 'id, projectId',
      contentItems: 'id, projectId, sectionId',
      images: 'id, projectId, contentItemId',
      translations: 'id, projectId, imageId, &[imageId+language]',
      meta: 'key',
    });
    await v1.table('images').add({ id: 'i1', title: 'Old title', fileName: 'a.png' });
    await v1.table('translations').add({ id: 't1', imageId: 'i1', language: 'es' });
    await v1.table('projects').add({ id: 'p1', name: 'Existing' });
    v1.close();

    const db = new TranslatorDb(name);
    const image = (await db.images.get('i1')) as unknown as Record<string, unknown>;
    expect(image).not.toHaveProperty('title');
    expect(image).toMatchObject({ fileName: 'a.png', ocrStatus: 'done', ocrError: null });
    expect(await db.files.count()).toBe(0);
    // v3: translations get the "Mark translated" flag; v4: projects get default categories.
    expect(await db.translations.get('t1')).toMatchObject({ ready: false });
    const categories = await db.glossaryCategories.where({ projectId: 'p1' }).toArray();
    expect(categories.map((c) => c.name).sort()).toEqual([
      'Characters',
      'Factions',
      'Locations',
      'Lore',
    ]);
    db.close();
  });
});
