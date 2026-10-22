import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { TranslatorDb } from './db';

describe('TranslatorDb migrations', () => {
  it('upgrades v1 images: drops the title and marks their OCR as done', async () => {
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
    v1.close();

    const db = new TranslatorDb(name);
    const image = (await db.images.get('i1')) as unknown as Record<string, unknown>;
    expect(image).not.toHaveProperty('title');
    expect(image).toMatchObject({ fileName: 'a.png', ocrStatus: 'done', ocrError: null });
    expect(await db.files.count()).toBe(0);
    db.close();
  });
});
