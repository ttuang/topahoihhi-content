/**
 * Normalize LST structure: book folders -> lowercase slugs, chapter files -> N.json
 * Run from repo root: node scripts/normalize-lst.cjs
 */

const fs = require('fs');
const path = require('path');

const LST_DIR = path.join(__dirname, '..', 'lst');
const INDEX_PATH = path.join(LST_DIR, 'index.json');

// Load index to get book name -> slug and chapter counts
const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
const bookToSlug = {};
const bookToChapters = {};
for (const b of index.books) {
  bookToSlug[b.book] = b.slug;
  bookToChapters[b.book] = b.chapters;
}

const dirs = fs.readdirSync(LST_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

for (const bookFolder of dirs) {
  const slug = bookToSlug[bookFolder];
  if (!slug) {
    console.warn('Skip (not in index):', bookFolder);
    continue;
  }

  const srcDir = path.join(LST_DIR, bookFolder);
  const tempDir = path.join(LST_DIR, '_temp_' + slug);

  fs.mkdirSync(tempDir, { recursive: true });

  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const match = file.match(/^(.+?)(\d+)\.json$/);
    if (!match) {
      console.warn('Skip file (unexpected name):', path.join(bookFolder, file));
      continue;
    }
    const chapterNum = match[2];
    const destPath = path.join(tempDir, chapterNum + '.json');
    fs.copyFileSync(path.join(srcDir, file), destPath);
  }

  // Remove old folder
  for (const f of fs.readdirSync(srcDir)) {
    fs.unlinkSync(path.join(srcDir, f));
  }
  fs.rmdirSync(srcDir);

  // Rename temp to final slug folder
  const finalDir = path.join(LST_DIR, slug);
  if (fs.existsSync(finalDir)) {
    // temp was created as _temp_amos; if amos already exists (e.g. from prior run), remove it
    const existing = fs.readdirSync(finalDir);
    for (const f of existing) fs.unlinkSync(path.join(finalDir, f));
    fs.rmdirSync(finalDir);
  }
  fs.renameSync(tempDir, finalDir);
  console.log(bookFolder, '->', slug);
}

// Verify: every book folder has 1.json, 2.json, ... up to chapters
console.log('\nVerification:');
let ok = true;
for (const b of index.books) {
  const slug = b.slug;
  const dir = path.join(LST_DIR, slug);
  const expected = b.chapters;
  if (!fs.existsSync(dir)) {
    console.error('Missing folder:', slug);
    ok = false;
    continue;
  }
  const files = fs.readdirSync(dir).filter(f => /^\d+\.json$/.test(f));
  const numbers = files.map(f => parseInt(f.replace('.json', ''), 10)).sort((a, b) => a - b);
  for (let n = 1; n <= expected; n++) {
    if (!numbers.includes(n)) {
      console.error(slug, ': missing', n + '.json');
      ok = false;
    }
  }
  if (numbers.length !== expected) {
    console.error(slug, ': expected', expected, 'chapters, found', numbers.length);
    ok = false;
  }
}
console.log(ok ? 'All book folders have correct 1.json, 2.json, ...' : 'Verification failed.');
