/**
 * LST (Bible) types for TopaHoihHi.
 * Content source: https://ttuang.github.io/topahoihhi-content/lst/index.json
 * Chapter URL: /lst/{bookSlug}/{chapter}.json
 */

export type LstVerse = {
  verse: number
  text: string
}

export type LstSection = {
  sectionTitle: string | null
  reference: string | null
  verses: LstVerse[]
}

export type LstChapter = {
  book: string
  chapter: number
  sections: LstSection[]
}

export type LstBook = {
  book: string
  slug: string
  chapters: number
  testament: 'old' | 'new'
}

export type LstIndex = {
  books: LstBook[]
}

/**
 * Flattens all verses from a chapter's sections into a single array.
 * Use this wherever the app expects a flat verse list (anchors, copy verse,
 * copy chapter, export, keyboard navigation, chapter selector).
 */
export function getAllVersesFromChapter(chapter: LstChapter): LstVerse[] {
  return chapter.sections.flatMap((section) => section.verses)
}
