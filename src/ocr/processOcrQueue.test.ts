import 'fake-indexeddb/auto';
import { TranslatorDb } from '@/data/local/db';
import { createLocalRepositories } from '@/data/local/localRepositories';
import { createFixtureData } from '@/test/fixtures/workspaceFixture';
import { processOcrQueue } from './processOcrQueue';
import type { OcrProvider } from './types';

let counter = 0;

async function setup() {
  const db = new TranslatorDb(`ocr-queue-${++counter}`);
  const repos = createLocalRepositories(db);
  await repos.workspace.replace(createFixtureData(), []);
  const [summary] = await repos.projects.listSummaries();
  const detail = (await repos.projects.getDetail(summary!.project.id))!;
  const sectionId = detail.sections[0]!.section.id;
  const add = (...texts: string[]) =>
    repos.contentItems.create(
      sectionId,
      { name: 'Harbour', type: '' },
      texts.map((text, i) => ({ name: `${i}.png`, data: new Blob([text], { type: 'image/png' }) })),
      null,
    );
  return { db, repos, add };
}

/** Reads the blob's text back as the "detected" text; "boom" fails. */
const fakeProvider: OcrProvider = {
  async recognize(image) {
    const text = await image.text();
    if (text === 'boom') throw new Error('engine crashed');
    return { text, blocks: [], confidence: 90 };
  },
  async dispose() {},
};

describe('processOcrQueue', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));

  it('reads every pending image and stores text, empty and failed outcomes', async () => {
    const { db, repos, add } = await setup();
    await add('Meet me at the gate', '   ', 'boom');
    const onSaved = vi.fn();

    await processOcrQueue(repos.images, fakeProvider, onSaved);

    expect(onSaved).toHaveBeenCalledTimes(3);
    const images = (await db.images.where({ ocrStatus: 'done' }).toArray()).filter((i) => i.fileId);
    expect(images.map((i) => i.source.text)).toEqual(['Meet me at the gate']);
    expect(await db.images.where({ ocrStatus: 'empty' }).count()).toBe(1);
    const [failed] = await db.images.where({ ocrStatus: 'failed' }).toArray();
    expect(failed!.ocrError).toBe('engineError');
    expect(await repos.images.listPendingOcr()).toEqual([]);
  });
});
