/**
 * Clean hymn numbering prefixes from tedimlabu/index.json titles.
 *
 * Patterns removed from the start of each title:
 *   numbers + optional letters + optional parentheses + period + space
 * Example matches: "003A. ", "009(B). ", "118(A). ", "121. "
 *
 * Regex used: ^\\s*[0-9]+[A-Z]?(?:\\([A-Z]\\))?\\.\\s*
 *
 * Run from repo root:
 *   node scripts/clean-tedimlabu-titles.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'tedimlabu', 'index.json');

function main() {
  const raw = fs.readFileSync(INDEX_PATH, 'utf8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.songs)) {
    throw new Error('tedimlabu/index.json is missing songs[]');
  }

  // Allow an optional space before the dot, e.g. \"121(B) . Title\"
  const prefixRe = /^\s*[0-9]+[A-Z]?(?:\([A-Z]\))?\s*\.\s*/;

  for (const song of data.songs) {
    if (typeof song.title !== 'string') continue;
    const original = song.title;
    const cleaned = original.replace(prefixRe, '');
    song.title = cleaned;
  }

  fs.writeFileSync(INDEX_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('Cleaned hymn numbering from tedimlabu/index.json titles.');
}

main();

