/**
 * Force all Gal Hiam filenames to lowercase slugs (two-step rename).
 * Uses fs.renameSync for the renames, then git rm --cached + git add so Git
 * records the new names (Git does not track case-only renames on Windows otherwise).
 * Run from repo root: node scripts/galhiam-force-lowercase.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GALHIAM_DIR = path.join(__dirname, '..', 'galhiam');
const INDEX_PATH = path.join(GALHIAM_DIR, 'index.json');
const REPO_ROOT = path.join(__dirname, '..');

const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
const slugs = index.songs.map((s) => s.slug);

// Get filenames as Git sees them
let gitPaths = [];
try {
  const out = execSync('git ls-files galhiam/*.json', { cwd: REPO_ROOT, encoding: 'utf8' });
  gitPaths = out.split(/\r?\n/).filter((f) => f && f !== 'galhiam/index.json');
} catch (_) {
  gitPaths = [];
}

// Actual files on disk (readdir returns filesystem names)
const diskFiles = fs.readdirSync(GALHIAM_DIR).filter((f) => f.endsWith('.json') && f !== 'index.json');
const normalizedToDisk = {};
for (const f of diskFiles) {
  const norm = f.replace(/\.json$/i, '').toLowerCase();
  normalizedToDisk[norm] = f;
}

// Map slug -> Git path (so we can git rm old name later)
const slugToGitPath = {};
for (const gp of gitPaths) {
  const base = path.basename(gp, '.json');
  const norm = base.toLowerCase();
  slugToGitPath[norm] = gp;
}

const tempPrefix = 'tmp-';
let renamed = 0;

function runGit(args) {
  const cmd = 'git ' + args.map((a) => (a.startsWith('-') ? a : JSON.stringify(a))).join(' ');
  return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', shell: true });
}

for (const slug of slugs) {
  const targetFileName = slug + '.json';
  const targetPath = path.join(GALHIAM_DIR, targetFileName);
  const currentFileName = normalizedToDisk[slug];
  if (!currentFileName) {
    console.warn('No file on disk for slug:', slug);
    continue;
  }
  if (currentFileName === targetFileName) {
    // Case might still differ in Git; update index if needed
    const gitPath = slugToGitPath[slug];
    if (gitPath && path.basename(gitPath) !== targetFileName) {
      try {
        runGit(['rm', '--cached', '--ignore-unmatch', gitPath]);
        runGit(['add', 'galhiam/' + targetFileName]);
        console.log('Git index updated:', gitPath, '->', 'galhiam/' + targetFileName);
        renamed++;
      } catch (e) {
        console.error('Git update failed for', slug, e.message);
      }
    }
    continue;
  }
  const currentPath = path.join(GALHIAM_DIR, currentFileName);
  const tempPath = path.join(GALHIAM_DIR, tempPrefix + slug + '.json');
  try {
    fs.renameSync(currentPath, tempPath);
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    fs.renameSync(tempPath, targetPath);
    const gitPath = slugToGitPath[slug];
    if (gitPath) {
      runGit(['rm', '--cached', '--ignore-unmatch', gitPath]);
    }
    runGit(['add', 'galhiam/' + targetFileName]);
    console.log(currentFileName, '->', targetFileName);
    renamed++;
    normalizedToDisk[slug] = targetFileName;
  } catch (err) {
    console.error('Failed:', slug, err.message);
  }
}

// Verify: no uppercase in Git index
console.log('\nVerification:');
let gitFilesAfter = [];
try {
  const out = execSync('git ls-files galhiam/*.json', { cwd: REPO_ROOT, encoding: 'utf8' });
  gitFilesAfter = out.split(/\r?\n/).filter((f) => f && f !== 'galhiam/index.json');
} catch (_) {
  gitFilesAfter = fs.readdirSync(GALHIAM_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => 'galhiam/' + f);
}

const uppercase = gitFilesAfter.filter((p) => /[A-Z]/.test(path.basename(p)));
const missing = slugs.filter((s) => !gitFilesAfter.some((p) => path.basename(p, '.json').toLowerCase() === s));

// Also check on-disk filenames
const diskAfter = fs.readdirSync(GALHIAM_DIR).filter((f) => f.endsWith('.json') && f !== 'index.json');
const diskUppercase = diskAfter.filter((f) => /[A-Z]/.test(f));

if (uppercase.length || diskUppercase.length) {
  console.error('Filenames still with uppercase:', uppercase.length || diskUppercase.length);
  if (uppercase.length) uppercase.slice(0, 10).forEach((p) => console.error('  (Git)', p));
  if (diskUppercase.length) diskUppercase.slice(0, 10).forEach((f) => console.error('  (disk)', f));
}
if (missing.length) {
  console.error('Slugs with no file:', missing.length);
  missing.slice(0, 10).forEach((s) => console.error('  -', s + '.json'));
}
if (uppercase.length === 0 && diskUppercase.length === 0 && missing.length === 0) {
  console.log('All', slugs.length, 'slugs have a matching lowercase file.');
  console.log('Renamed/updated', renamed, 'files.');
}
process.exit(uppercase.length > 0 || diskUppercase.length > 0 || missing.length > 0 ? 1 : 0);
