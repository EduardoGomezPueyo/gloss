// Prepares the self-hosted OCR files in public/ocr (git-ignored, DECISIONS D29):
// - engine: the tesseract.js worker and the LSTM-only WebAssembly cores, copied from
//   node_modules (the browser loads one core, picked by its SIMD support);
// - languages: Tesseract "fast" models (Apache-2.0) for every language of the
//   catalog, downloaded once from the tessdata_fast repository and gzipped.
// Runs before `dev` and `build`; files already present are skipped.
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const engineDir = join(root, 'public/ocr/engine');
const langDir = join(root, 'public/ocr/lang');
const TESSDATA = 'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/4.1.0';

const exists = (path) =>
  stat(path).then(
    () => true,
    () => false,
  );

async function copyEngine() {
  await mkdir(engineDir, { recursive: true });
  const files = [
    ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
    ...['', '-simd', '-relaxedsimd'].map((variant) => {
      const name = `tesseract-core${variant}-lstm.wasm.js`;
      return [`tesseract.js-core/${name}`, name];
    }),
  ];
  for (const [from, to] of files) {
    await copyFile(join(root, 'node_modules', from), join(engineDir, to));
  }
}

async function downloadLanguages() {
  await mkdir(langDir, { recursive: true });
  const map = JSON.parse(await readFile(join(root, 'src/ocr/tesseractLanguages.json'), 'utf8'));
  const codes = [...new Set(Object.values(map))];
  const missing = [];
  for (const code of codes) {
    const target = join(langDir, `${code}.traineddata.gz`);
    if (await exists(target)) continue;
    try {
      const response = await fetch(`${TESSDATA}/${code}.traineddata`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = Buffer.from(await response.arrayBuffer());
      await writeFile(target, gzipSync(data, { level: 9 }));
      console.log(`ocr: downloaded ${code} (${(data.length / 1e6).toFixed(1)} MB)`);
    } catch (error) {
      missing.push(`${code} (${error.message})`);
    }
  }
  // Not fatal: OCR in a missing language fails with a clear message and can be retried.
  if (missing.length) console.warn(`ocr: could not download ${missing.join(', ')}`);
}

await copyEngine();
await downloadLanguages();
