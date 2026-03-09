/**
 * Normalize Tedim Labu verse numbering.
 *
 * For every JSON file in tedimlabu/ (excluding index.json):
 * - Look at sections[] in order
 * - For each section with type === \"verse\", renumber labels sequentially:
 *     first verse  -> \"Verse 1\"
 *     second verse -> \"Verse 2\", etc.
 * - Do not change any non-verse sections or other metadata.
 *
 * Run from repo root:
 *   node scripts/normalize-tedimlabu-verses.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEDIM_DIR = path.join(ROOT, 'tedimlabu');

function main() {
  const files = fs
    .readdirSync(TEDIM_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'index.json');

  let filesUpdated = 0;
  let labelsUpdated = 0;

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

    if (!Array.isArray(data.sections)) {
      continue;
    }

    let verseIndex = 0;
    let changed = false;

    for (const section of data.sections) {
      if (!section || section.type !== 'verse') continue;
      verseIndex += 1;
      const newLabel = `Verse ${verseIndex}`;
      if (section.label !== newLabel) {
        section.label = newLabel;
        labelsUpdated += 1;
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
      filesUpdated += 1;
    }
  }

  console.log('Tedim Labu verse normalization complete.');
  console.log('Files updated:', filesUpdated);
  console.log('Verse labels corrected:', labelsUpdated);
}

main();

