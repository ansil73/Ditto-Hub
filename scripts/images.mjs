// Makes small and medium copies of every product, Instagram and review photo
// (480 px and 960 px WebP) so phones download only what they show.
// Runs before every build. Copies are kept in public/_gen and reused while the original
// photo is unchanged (checked by content, so the GitHub Actions cache works after checkout).
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve('public');
const GEN = path.join(ROOT, '_gen');
const MANIFEST = path.join(GEN, 'manifest.json');
const FOLDERS = ['products', 'insta', 'reviews'];
const WIDTHS = [480, 960];
const IMAGE = /\.(jpe?g|png|webp|avif)$/i;
const VERSION = 1; // bump to rebuild every copy (e.g. after changing sizes or quality)

async function* walk(dir) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (IMAGE.test(entry.name)) yield full;
  }
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

let manifest = {};
try {
  const saved = JSON.parse(await readFile(MANIFEST, 'utf8'));
  if (saved.version === VERSION) manifest = saved.files ?? {};
} catch {
  manifest = {};
}

const next = {};
let made = 0;
let kept = 0;
for (const folder of FOLDERS) {
  for await (const file of walk(path.join(ROOT, folder))) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const base = rel.replace(IMAGE, '');
    const data = await readFile(file);
    const hash = createHash('sha1').update(data).digest('hex');
    next[rel] = hash;
    for (const width of WIDTHS) {
      const target = path.join(GEN, `${base}-${width}.webp`);
      if (manifest[rel] === hash && (await exists(target))) {
        kept++;
        continue;
      }
      await mkdir(path.dirname(target), { recursive: true });
      await sharp(data).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toFile(target);
      made++;
    }
  }
}

// Remove copies of photos that were deleted or renamed.
let removed = 0;
for (const rel of Object.keys(manifest)) {
  if (next[rel]) continue;
  const base = rel.replace(IMAGE, '');
  for (const width of WIDTHS) {
    await rm(path.join(GEN, `${base}-${width}.webp`), { force: true });
    removed++;
  }
}

await mkdir(GEN, { recursive: true });
await writeFile(MANIFEST, JSON.stringify({ version: VERSION, files: next }));
console.log(`[images] ${made} resized, ${kept} up to date${removed ? `, ${removed} old copies removed` : ''}`);
