/**
 * Rebuild tedimlabu/index.json from actual song files.
 * - Reads every *.json in tedimlabu/ except index.json
 * - Uses the JSON "title" field for the title
 * - Uses the filename (without .json) as the slug
 * - Writes:
 *   { "songs": [ { "title": "...", "slug": "..." }, ... ] }
 * - One entry per file, no duplicates by slug
 * - Sorted alphabetically by title
 *
 * Run from repo root:
 *   node scripts/rebuild-tedimlabu-index.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEDIM_DIR = path.join(ROOT, 'tedimlabu');
const INDEX_PATH = path.join(TEDIM_DIR, 'index.json');

function main() {
  const files = fs
    .readdirSync(TEDIM_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'index.json');

  const bySlug = new Map();

  for (const file of files) {
    const fullPath = path.join(TEDIM_DIR, file);
    let data;
    try {
      const raw = fs.readFileSync(fullPath, 'utf8');
      data = JSON.parse(raw);
    } catch (e) {
      console.error('Skip (invalid JSON):', file, e.message);
      continue;
    }

    const title = typeof data.title === 'string' && data.title.trim()
      ? data.title.trim()
      : path.basename(file, '.json');

    const slug = path.basename(file, '.json');

    if (!bySlug.has(slug)) {
      bySlug.set(slug, { title, slug });
    }
  }

  const songs = Array.from(bySlug.values()).sort((a, b) =>
    a.title.localeCompare(b.title, 'en', { sensitivity: 'base' })
  );

  const indexData = { songs };
  fs.writeFileSync(INDEX_PATH, JSON.stringify(indexData, null, 2) + '\n', 'utf8');

  // Verification
  const slugsInIndex = new Set(songs.map((s) => s.slug));
  const filesSet = new Set(files.map((f) => path.basename(f, '.json')));

  const missingFiles = songs
    .map((s) => s.slug)
    .filter((slug) => !filesSet.has(slug));

  const missingIndex = Array.from(filesSet).filter((slug) => !slugsInIndex.has(slug));

  console.log('Rebuilt tedimlabu/index.json');
  console.log('Total song files:', files.length);
  console.log('Total songs in index:', songs.length);

  if (missingFiles.length) {
    console.warn('Entries with no matching file:', missingFiles.length);
    missingFiles.forEach((s) => console.warn('  -', s + '.json'));
  }

  if (missingIndex.length) {
    console.warn('Files not represented in index:', missingIndex.length);
    missingIndex.slice(0, 20).forEach((s) => console.warn('  -', s + '.json'));
    if (missingIndex.length > 20) {
      console.warn('  ... and', missingIndex.length - 20, 'more');
    }
  }

  if (!missingFiles.length && !missingIndex.length) {
    console.log('Verified: every slug has a file and every file has an index entry.');
  }
}

main();

