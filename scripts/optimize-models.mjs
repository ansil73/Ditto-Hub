// Shrinks 3D models (GLB) for the website: Meshopt-compressed geometry and WebP textures.
//
//   1. Put the original model in models-src/ named after the product ID, e.g. models-src/DH-SN-0001.glb
//   2. Run:  npm run optimize:models
//   3. The small version is written to public/products/DH-SN-0001/model.glb
//   4. In /admin, open the product and set "3D model" to /products/DH-SN-0001/model.glb
//
// Options:  npm run optimize:models -- --texture 1024   (smaller textures if a model is still over 3 MB)
//           npm run optimize:models -- DH-SN-0001       (only this product)
import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, instance, join, meshopt, prune, resample, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const SRC = 'models-src';
const LIMIT = 3 * 1024 * 1024;
const args = process.argv.slice(2);
const textureFlag = args.indexOf('--texture');
const textureSize = textureFlag >= 0 ? Number(args[textureFlag + 1]) : 2048;
const only = args.filter((a, i) => !a.startsWith('--') && i !== textureFlag + 1);

if (!Number.isFinite(textureSize) || textureSize < 256) {
  console.error('--texture needs a size in pixels, like 1024 or 2048.');
  process.exit(1);
}

let files;
try {
  files = (await readdir(SRC)).filter((f) => f.toLowerCase().endsWith('.glb'));
} catch {
  console.log(`No ${SRC}/ folder yet. Create it and put your .glb files in it, named after the product ID (DH-SN-0001.glb).`);
  process.exit(0);
}
if (only.length) files = files.filter((f) => only.includes(path.basename(f, path.extname(f))));
if (!files.length) {
  console.log(`No .glb files to optimise in ${SRC}/.`);
  process.exit(0);
}

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;
let failed = 0;

for (const file of files) {
  const id = path.basename(file, path.extname(file));
  if (!/^DH-(SN|WT|GD)-\d{4}$/.test(id)) {
    console.warn(`! ${file}: name it after the product ID, like DH-SN-0001.glb. Skipped.`);
    continue;
  }
  const input = path.join(SRC, file);
  const outDir = path.join('public', 'products', id);
  const output = path.join(outDir, 'model.glb');
  try {
    const before = (await stat(input)).size;
    const doc = await io.read(input);
    await doc.transform(
      dedup(),
      instance({ min: 5 }),
      flatten(),
      join(),
      weld(),
      resample(),
      prune(),
      textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [textureSize, textureSize], quality: 82 }),
      meshopt({ encoder: MeshoptEncoder, level: 'medium' })
    );
    await mkdir(outDir, { recursive: true });
    await io.write(output, doc);
    const after = (await stat(output)).size;
    const note = after > LIMIT ? `  ← over 3 MB: run again with --texture 1024` : '';
    console.log(`✓ ${id}: ${mb(before)} → ${mb(after)}  (${output})${note}`);
    console.log(`  In /admin set "3D model" for ${id} to /products/${id}/model.glb`);
  } catch (err) {
    failed++;
    console.error(`✗ ${id}: ${err instanceof Error ? err.message : err}`);
  }
}

process.exit(failed ? 1 : 0);
