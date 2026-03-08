/**
 * Normalize Gal Hiam filenames to match slugs in galhiam/index.json.
 * Renames e.g. A-Manpha-Si.json -> a-manpha-si.json (lowercase, hyphenated).
 * Run from repo root: node scripts/normalize-galhiam.cjs
 */

const fs = require('fs');
const path = require('path');

const GALHIAM_DIR = path.join(__dirname, '..', 'galhiam');
const INDEX_PATH = path.join(GALHIAM_DIR, 'index.json');

const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
const slugs = index.songs.map((s) => s.slug);

const files = fs.readdirSync(GALHIAM_DIR).filter((f) => {
  if (f === 'index.json') return false;
  if (!f.endsWith('.json')) return false;
  return true;
});

// normalized name (lowercase, no .json) -> current filename
const normalizedToFile = {};
for (const file of files) {
  const base = file.replace(/\.json$/i, '');
  const normalized = base.toLowerCase();
  if (!normalizedToFile[normalized]) {
    normalizedToFile[normalized] = file;
  }
}

const renames = [];
for (const slug of slugs) {
  const currentFile = normalizedToFile[slug];
  const targetFile = slug + '.json';
  if (!currentFile) continue;
  if (currentFile === targetFile) continue;
  renames.push({ from: currentFile, to: targetFile });
}

// Two-step rename to handle case-insensitive filesystems (e.g. Windows)
// Step 1: current -> tmp-{slug}.json   Step 2: tmp-{slug}.json -> {slug}.json
const tempPrefix = 'tmp-';
for (const { from, to } of renames) {
  const fromPath = path.join(GALHIAM_DIR, from);
  const tempPath = path.join(GALHIAM_DIR, tempPrefix + to);
  const toPath = path.join(GALHIAM_DIR, to);
  fs.renameSync(fromPath, tempPath);
  if (fs.existsSync(toPath)) fs.unlinkSync(toPath);
  fs.renameSync(tempPath, toPath);
  console.log(from, '->', tempPrefix + to, '->', to);
}

// Remove any stray temp files (safety)
const afterFiles = fs.readdirSync(GALHIAM_DIR);
for (const f of afterFiles) {
  if (f.startsWith(tempPrefix) && f.endsWith('.json')) {
    fs.unlinkSync(path.join(GALHIAM_DIR, f));
    console.log('Removed stray temp:', f);
  }
}

// Optionally remove " - Copy" files that are NOT in the slug list
const copyPattern = / - copy$/i;
for (const file of fs.readdirSync(GALHIAM_DIR)) {
  if (file === 'index.json' || !file.endsWith('.json')) continue;
  const base = file.replace(/\.json$/i, '');
  if (copyPattern.test(base)) {
    const slugMatch = slugs.find((s) => s.toLowerCase() === base.toLowerCase());
    if (!slugMatch) {
      const p = path.join(GALHIAM_DIR, file);
      fs.unlinkSync(p);
      console.log('Removed copy (not in index):', file);
    }
  }
}

// Verify: every slug has galhiam/{slug}.json
console.log('\nVerification:');
let ok = true;
const missing = [];
for (const slug of slugs) {
  const filePath = path.join(GALHIAM_DIR, slug + '.json');
  if (!fs.existsSync(filePath)) {
    missing.push(slug);
    ok = false;
  }
}
if (missing.length) {
  console.error('Missing files for slugs:', missing.length);
  missing.slice(0, 20).forEach((s) => console.error('  -', s + '.json'));
  if (missing.length > 20) console.error('  ... and', missing.length - 20, 'more');
} else {
  console.log('All', slugs.length, 'slugs have a matching file.');
}

// Verify no uppercase/case-mismatch filenames remain (slug filenames must be exactly lowercase)
const finalFiles = fs.readdirSync(GALHIAM_DIR).filter((f) => f.endsWith('.json'));
const uppercase = finalFiles.filter((f) => f !== 'index.json' && /[A-Z]/.test(f));
if (uppercase.length) {
  console.error('\nFilenames with uppercase (must be lowercase for GitHub Pages):', uppercase.length);
  uppercase.slice(0, 20).forEach((f) => console.error('  -', f));
  ok = false;
} else {
  console.log('No uppercase or case-mismatch filenames in galhiam/.');
}
process.exit(ok ? 0 : 1);
