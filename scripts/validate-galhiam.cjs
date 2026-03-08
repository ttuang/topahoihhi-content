/**
 * Validate and fix Gal Hiam slug/file consistency.
 * Ensures every slug in index.json has exact file galhiam/{slug}.json (lowercase).
 * Run from repo root: node scripts/validate-galhiam.cjs
 */

const fs = require('fs');
const path = require('path');

const GALHIAM_DIR = path.join(__dirname, '..', 'galhiam');
const INDEX_PATH = path.join(GALHIAM_DIR, 'index.json');

const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
const slugs = index.songs.map((s) => s.slug);
const slugSet = new Set(slugs);

const allFiles = fs.readdirSync(GALHIAM_DIR).filter((f) => f.endsWith('.json') && f !== 'index.json');

// 1) Slugs missing exact file (index says slug but file doesn't exist with exact name)
const missingExact = [];
const normalizedToFile = {}; // lowercase basename -> actual filename
for (const file of allFiles) {
  const base = file.replace(/\.json$/i, '');
  const norm = base.toLowerCase();
  if (!normalizedToFile[norm]) normalizedToFile[norm] = file;
}
for (const slug of slugs) {
  const exactPath = path.join(GALHIAM_DIR, slug + '.json');
  if (!fs.existsSync(exactPath)) missingExact.push(slug);
}

// 2) Files that need rename (file exists, same name when lowercased, but wrong case)
const renames = [];
for (const slug of missingExact) {
  const currentFile = normalizedToFile[slug];
  const targetFile = slug + '.json';
  if (currentFile && currentFile !== targetFile) {
    renames.push({ from: currentFile, to: targetFile, slug });
  }
}

// 3) Still missing after renames (no file even when ignoring case) - could fix index if similar file exists
const stillMissing = missingExact.filter((s) => !renames.some((r) => r.slug === s));

// 4) Orphan files (file not matching any slug) - exclude " - copy" which we may remove
const copyPattern = / - copy$/i;
const orphanFiles = allFiles.filter((f) => {
  const base = f.replace(/\.json$/i, '');
  if (copyPattern.test(base)) return false; // handle separately
  const norm = base.toLowerCase();
  return !slugSet.has(norm);
});

// 5) Remove " - Copy" files not in index
let removedCopy = 0;
for (const file of fs.readdirSync(GALHIAM_DIR)) {
  if (file === 'index.json' || !file.endsWith('.json')) continue;
  const base = file.replace(/\.json$/i, '');
  if (copyPattern.test(base)) {
    const inIndex = slugs.some((s) => s.toLowerCase() === base.toLowerCase());
    if (!inIndex) {
      fs.unlinkSync(path.join(GALHIAM_DIR, file));
      removedCopy++;
      console.log('Removed (not in index):', file);
    }
  }
}

// 6) Apply renames (two-step for case-insensitive filesystems)
const tempPrefix = 'tmp-';
const fixedSlugs = [];
for (const { from, to, slug } of renames) {
  const fromPath = path.join(GALHIAM_DIR, from);
  const tempPath = path.join(GALHIAM_DIR, tempPrefix + to);
  const toPath = path.join(GALHIAM_DIR, to);
  if (!fs.existsSync(fromPath)) continue;
  fs.renameSync(fromPath, tempPath);
  if (fs.existsSync(toPath)) fs.unlinkSync(toPath);
  fs.renameSync(tempPath, toPath);
  fixedSlugs.push(slug);
  console.log('Renamed:', from, '->', to);
}

// Remove stray temp files
for (const f of fs.readdirSync(GALHIAM_DIR)) {
  if (f.startsWith(tempPrefix) && f.endsWith('.json')) {
    fs.unlinkSync(path.join(GALHIAM_DIR, f));
  }
}

// 7) Fix typos: file exists with different spelling (e.g. a-sagna-... vs a-sangna-...) -> rename file to match index slug
if (stillMissing.length) {
  const filesByNorm = {}; // lowercase base -> actual filename
  for (const f of fs.readdirSync(GALHIAM_DIR)) {
    if (!f.endsWith('.json') || f === 'index.json') continue;
    const base = f.replace(/\.json$/i, '');
    const norm = base.toLowerCase();
    if (!filesByNorm[norm]) filesByNorm[norm] = f;
  }
  for (let i = 0; i < index.songs.length; i++) {
    const slug = index.songs[i].slug;
    if (fs.existsSync(path.join(GALHIAM_DIR, slug + '.json'))) continue;
    const slugNorm = slug.toLowerCase();
    let best = null;
    for (const [norm, filename] of Object.entries(filesByNorm)) {
      if (norm === slugNorm) continue;
      if (Math.abs(norm.length - slugNorm.length) > 3) continue;
      let diff = 0;
      const maxLen = Math.max(norm.length, slugNorm.length);
      for (let j = 0; j < maxLen; j++) {
        if ((norm[j] || '') !== (slugNorm[j] || '')) diff++;
      }
      if (diff <= 2 && (!best || diff < best.diff)) best = { norm, filename, diff };
    }
    if (best && best.diff <= 2) {
      const fromPath = path.join(GALHIAM_DIR, best.filename);
      const toPath = path.join(GALHIAM_DIR, slug + '.json');
      if (fs.existsSync(fromPath)) {
        fs.renameSync(fromPath, toPath);
        delete filesByNorm[best.norm];
        fixedSlugs.push(slug);
        console.log('Fixed typo (file -> slug):', best.filename, '->', slug + '.json');
      }
    }
  }
}

// Re-read state after fixes
const finalFiles = fs.readdirSync(GALHIAM_DIR).filter((f) => f.endsWith('.json') && f !== 'index.json');
const matching = slugs.filter((slug) => fs.existsSync(path.join(GALHIAM_DIR, slug + '.json')));
const missingAfter = slugs.filter((slug) => !fs.existsSync(path.join(GALHIAM_DIR, slug + '.json')));
const uppercaseAfter = finalFiles.filter((f) => /[A-Z]/.test(f));

// Summary
console.log('\n--- Summary ---');
console.log('Total songs in index:', slugs.length);
console.log('Total matching files (exact slug.json):', matching.length);
if (fixedSlugs.length) {
  console.log('Slugs fixed (file renamed or corrected):', fixedSlugs.length);
  fixedSlugs.slice(0, 30).forEach((s) => console.log('  -', s));
  if (fixedSlugs.length > 30) console.log('  ... and', fixedSlugs.length - 30, 'more');
}
if (removedCopy) console.log('Removed duplicate " - Copy" files (not in index):', removedCopy);
if (missingAfter.length) {
  console.log('Still missing (no file for slug):', missingAfter.length);
  missingAfter.forEach((s) => console.log('  -', s + '.json'));
}
if (uppercaseAfter.length) {
  console.log('Filenames still with uppercase:', uppercaseAfter.length);
  uppercaseAfter.forEach((f) => console.log('  -', f));
}
if (missingAfter.length === 0 && uppercaseAfter.length === 0) {
  console.log('OK: Every slug has an exact matching lowercase file.');
}
process.exit(missingAfter.length > 0 ? 1 : 0);
