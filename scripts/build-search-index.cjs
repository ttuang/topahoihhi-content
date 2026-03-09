/**
 * Build search/search-index.json for the website.
 * Run from repo root: node scripts/build-search-index.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LST_DIR = path.join(ROOT, 'lst');
const GALHIAM_DIR = path.join(ROOT, 'galhiam');
const TEDIMLABU_DIR = path.join(ROOT, 'tedimlabu');
const SEARCH_DIR = path.join(ROOT, 'search');
const OUT_PATH = path.join(SEARCH_DIR, 'search-index.json');

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function findFileBySlug(dir, slug) {
  const exact = path.join(dir, slug + '.json');
  if (fs.existsSync(exact)) return path.basename(exact);
  const lower = (slug + '.json').toLowerCase();
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f.toLowerCase() === lower) return f;
  }
  return null;
}

function collect(lstDir, galhiamDir, tedimlabuDir) {
  const entries = [];

  // --- LST ---
  const lstIndex = safeReadJson(path.join(lstDir, 'index.json'));
  if (lstIndex && Array.isArray(lstIndex.books)) {
    for (const b of lstIndex.books) {
      const bookName = b.book || '';
      const bookSlug = b.slug || '';
      const chapters = Number(b.chapters) || 0;
      for (let c = 1; c <= chapters; c++) {
        const chapterPath = path.join(lstDir, bookSlug, String(c) + '.json');
        const chapter = safeReadJson(chapterPath);
        if (!chapter || !Array.isArray(chapter.sections)) continue;
        for (const sec of chapter.sections) {
          const sectionTitle = (sec.sectionTitle || '').trim();
          const verses = Array.isArray(sec.verses) ? sec.verses : [];
          for (const v of verses) {
            const verseNum = v.verse;
            const text = (v.text || '').trim();
            const snippet = text.slice(0, 200);
            const parts = [
              bookName,
              String(chapter.chapter ?? c),
              String(verseNum),
              sectionTitle,
              text
            ].filter(Boolean);
            const searchableText = parts.join(' ').toLowerCase();
            entries.push({
              type: 'lst',
              title: `${bookName} ${chapter.chapter ?? c}:${verseNum}`,
              snippet,
              href: `/lst/${bookSlug}/${chapter.chapter ?? c}#v${verseNum}`,
              searchableText
            });
          }
        }
      }
    }
  }

  const lstCount = entries.length;

  // --- Gal Hiam ---
  const galIndex = safeReadJson(path.join(galhiamDir, 'index.json'));
  if (galIndex && Array.isArray(galIndex.songs)) {
    for (const s of galIndex.songs) {
      const slug = s.slug;
      const fileName = findFileBySlug(galhiamDir, slug);
      if (!fileName) continue;
      const song = safeReadJson(path.join(galhiamDir, fileName));
      if (!song) continue;
      const title = (song.title || s.title || '').trim();
      const key = (song.key || '').trim();
      const galHiam = (song.galHiam || '').trim();
      const zbc = (song.ZBC || '').trim();
      const textParts = [title, key, galHiam, zbc];
      let firstLine = '';
      if (Array.isArray(song.sections)) {
        for (const sec of song.sections) {
          textParts.push(sec.label || '');
          const lines = Array.isArray(sec.lines) ? sec.lines : [];
          for (const line of lines) {
            textParts.push(line || '');
            if (!firstLine && (line || '').trim()) firstLine = (line || '').trim();
          }
        }
      }
      const searchableText = textParts.join(' ').toLowerCase();
      const snippet = firstLine || title.slice(0, 120);
      entries.push({
        type: 'galhiam',
        title,
        snippet,
        href: `/galhiam/${slug}`,
        searchableText
      });
    }
  }

  const galhiamCount = entries.length - lstCount;

  // --- Tedim Labu ---
  const tedIndex = safeReadJson(path.join(tedimlabuDir, 'index.json'));
  if (tedIndex && Array.isArray(tedIndex.songs)) {
    for (const s of tedIndex.songs) {
      const slug = s.slug;
      const fileName = findFileBySlug(tedimlabuDir, slug);
      if (!fileName) continue;
      const song = safeReadJson(path.join(tedimlabuDir, fileName));
      if (!song) continue;
      const title = (song.title || s.title || '').trim();
      const key = (song.key || '').trim();
      const zbc = (song.ZBC || '').trim();
      const textParts = [title, key, zbc];
      let firstLine = '';
      if (Array.isArray(song.sections)) {
        for (const sec of song.sections) {
          textParts.push(sec.label || '');
          const lines = Array.isArray(sec.lines) ? sec.lines : [];
          for (const line of lines) {
            textParts.push(line || '');
            if (!firstLine && (line || '').trim()) firstLine = (line || '').trim();
          }
        }
      }
      const searchableText = textParts.join(' ').toLowerCase();
      const snippet = firstLine || title.slice(0, 120);
      entries.push({
        type: 'tedimlabu',
        title,
        snippet,
        href: `/tedimlabu/${slug}`,
        searchableText
      });
    }
  }

  const tedimlabuCount = entries.length - lstCount - galhiamCount;

  return { entries, lstCount, galhiamCount, tedimlabuCount };
}

function main() {
  const { entries, lstCount, galhiamCount, tedimlabuCount } = collect(
    LST_DIR,
    GALHIAM_DIR,
    TEDIMLABU_DIR
  );

  if (!fs.existsSync(SEARCH_DIR)) {
    fs.mkdirSync(SEARCH_DIR, { recursive: true });
  }
  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify({ entries }, null, 0),
    'utf8'
  );

  console.log('Generated search/search-index.json');
  console.log('Total LST entries:', lstCount);
  console.log('Total Gal Hiam entries:', galhiamCount);
  console.log('Total Tedim Labu entries:', tedimlabuCount);
  console.log('Total combined entries:', entries.length);
}

main();
