# LST (Bible) integration guide

Use this when updating the app that consumes this content repo.

## Content source and routing

- **Index:** `https://ttuang.github.io/topahoihhi-content/lst/index.json`
- **Chapter URL:** `/lst/{bookSlug}/{chapter}.json` (e.g. `/lst/amos/5.json`)
- **Route:** `/lst/[bookSlug]/[chapterSlug]`

## Chapter JSON shape (new)

```json
{
  "book": "Amos",
  "chapter": 1,
  "sections": [
    {
      "sectionTitle": "Israel-te' Kiima Om Minam tungah Thukhenna",
      "reference": null,
      "verses": [
        { "verse": 1, "text": "..." },
        { "verse": 2, "text": "..." }
      ]
    }
  ]
}
```

Types and helper are in `lib/lst-types.ts`: `LstVerse`, `LstSection`, `LstChapter`, `LstBook`, `LstIndex`, and `getAllVersesFromChapter(chapter)`.

## Chapter reader UI

**Do not** use `chapter.verses` (old shape). Use sections:

```tsx
chapter.sections.map((section) => (
  <section key={/* stable key */}>
    {section.sectionTitle && (
      <h3 className="/* subtle heading */">{section.sectionTitle}</h3>
    )}
    {section.reference && (
      <p className="/* muted text */">{section.reference}</p>
    )}
    {section.verses.map((v) => (
      <p id={`verse-${v.verse}`} key={v.verse}>
        <span className="verse-num">{v.verse}</span> {v.text}
      </p>
    ))}
  </section>
))
```

- If `sectionTitle` exists: render above the verses with a subtle heading style.
- If `reference` exists: render below the title in muted text.

## Features that need a flat verse list

Where the app expects a single list of verses (e.g. for indexing, copy, export, keyboard nav), use:

```ts
import { getAllVersesFromChapter } from './lib/lst-types'

const allVerses = getAllVersesFromChapter(chapter)
```

Use `allVerses` for:

- Verse anchors (`#3` → id or scroll to verse 3)
- Copy verse
- Copy chapter
- Chapter export
- Keyboard navigation (next/prev verse)
- Chapter selector / verse count

Do **not** change:

- Gal Hiam
- Tedim Labu
- Global routing
- Chapter navigation logic (prev/next chapter)

Only update LST chapter parsing and rendering as above.
