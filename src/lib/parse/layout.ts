/**
 * Recover a PDF's LINE AND COLUMN STRUCTURE from pdfjs's positioned text items.
 *
 * ⚠️ WHY THIS FILE EXISTS, AND WHY IT IS THE MOST LOAD-BEARING PARSER CHANGE
 * THIS REPO HAS MADE. Until 2026-09-12 `pdfToText` mapped every text item to
 * `.str` and joined them with a space — ONE LINE PER PAGE. Measured on the
 * repo's own fixture: the identical résumé scored 34/100 as a PDF and 65/100 as
 * a .docx, and `parseSections` returned zero experience, zero skills and zero
 * sections for EVERY PDF, because its heading rule needs lines under 42
 * characters and a whole page is one. Thirteen of the checker's rules read
 * `experience[].bullets` and therefore never fired. The score was measuring the
 * file container, not the résumé.
 *
 * pdfjs already hands us everything needed to undo that — `transform[4]/[5]`
 * (x/y), `width`, `height`, `fontName` — and the old code discarded all of it.
 *
 * Deliberate non-goals: this does not OCR, does not read images, and does not
 * try to understand meaning. It answers three geometric questions — which
 * glyphs share a line, which lines share a column, and which x-positions repeat
 * down the page — and leaves every semantic decision to sections.ts.
 */

export type LayoutItem = {
  text: string
  x: number
  y: number
  /** Advance width in points, from pdfjs. Needed to know where a run ENDS. */
  w: number
  /** Glyph height in points. Zero for whitespace-only runs. */
  h: number
  font: string
}

export type LayoutLine = {
  text: string
  x: number
  y: number
  /** 0-based column index within the page, in reading order. */
  column: number
  /** Point size, taken as the max glyph height on the line. */
  size: number
  bold: boolean
}

export type LayoutPage = {
  lines: LayoutLine[]
  /** How many text columns this page is laid out in. 1 for ordinary résumés. */
  columns: number
  width: number
  height: number
  /** Distinct x-positions that repeat down the page — a table-ish signal. */
  alignedColumns: number
}

export type LayoutDoc = { pages: LayoutPage[] }

/**
 * A split is only a column boundary if NO text crosses it. Text that crosses is
 * a full-width line, which is what a single-column résumé is made of.
 * Measured in points; a résumé page is 612 wide.
 */
const SPLIT_SEARCH_MIN = 0.25
const SPLIT_SEARCH_MAX = 0.75
/** Each side must hold at least this share of the page's items to be a column. */
const MIN_COLUMN_SHARE = 0.15
/**
 * A RAIL IS NOT A COLUMN. A right-aligned run of dates and cities ("Jul 2017 - Jun 2021", "Gurugram") has plenty of items
 * and almost no text; read as a second column it moved every date to the end of the page, so each role lost its dates and
 * the experience total fell to zero. A narrow side column is rejected only when it is BOTH small (under this share of the
 * page's characters) AND made of dates and place names. Size alone is the wrong test: a real sidebar on a dense page can
 * be just as small (a three-page career measured 12%) and must stay a column.
 */
const MIN_COLUMN_CHAR_SHARE = 0.15
const RAIL_SHARE = 0.75
/** A date, a date range, an open-ended word, or a one- or two-word capitalised place name. */
const RAIL_ITEM = /^(?:(?:[A-Za-z]{3,9}\.?['’]?\s*)?(?:19|20)?\d{2,4}\b.*|present|current|till date|to date|ongoing|[A-Z][a-z]{2,14}(?: [A-Z][a-z]{2,14})?)$/i
const isRailText = (t: string) => RAIL_ITEM.test(t.trim())
/** Two runs are on the same line if their baselines are within this × median height. */
const LINE_TOLERANCE = 0.5
/** An x-position seen on at least this many lines is an alignment guide. */
const ALIGNED_MIN_ROWS = 3
/**
 * ...and only past here. Word starts in a left-aligned monospace document
 * repeat at identical x by construction, so counting every recurring position
 * reported four "columns" in a plain single-column text dump. An alignment
 * guide that matters — a right-hand date rail, a table cell — sits well into
 * the page.
 */
const ALIGNED_MIN_X_SHARE = 0.45

function median(ns: number[]): number {
  if (ns.length === 0) return 0
  const s = [...ns].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

/**
 * Group items into lines by shared baseline.
 *
 * Tolerance is derived from the document's own median glyph height rather than
 * fixed, because a 7pt dense résumé and a 14pt airy one disagree about how far
 * apart two baselines can be and still be one line.
 */
function toLines(items: LayoutItem[]): { y: number; items: LayoutItem[] }[] {
  const heights = items.map((i) => i.h).filter((h) => h > 0)
  const tol = Math.max(1, median(heights) * LINE_TOLERANCE)
  const rows: { y: number; items: LayoutItem[] }[] = []
  for (const item of items) {
    const row = rows.find((r) => Math.abs(r.y - item.y) <= tol)
    if (row) {
      row.items.push(item)
      // Track the row's baseline as the lowest (most common) y seen, so a
      // superscript or a slightly-raised glyph does not drag the row.
      row.y = Math.min(row.y, item.y)
    } else {
      rows.push({ y: item.y, items: [item] })
    }
  }
  return rows.sort((a, b) => b.y - a.y)
}

/**
 * Find vertical whitespace corridors that split the page into columns.
 *
 * The test is the strict one on purpose: a candidate x is a boundary only when
 * not a single text run crosses it. A two-column résumé has such a corridor by
 * construction; a single-column one cannot, because its body lines span the
 * page. This is why it replaces `looksMultiColumn`'s `/\S {3,}\S/` heuristic in
 * ats-check.ts — that rule was looking for the runs of spaces a column layout
 * leaves in flattened text, which the old extractor had already destroyed.
 */
function findColumnSplits(items: LayoutItem[], width: number): number[] {
  if (items.length < 8) return []
  const splits: number[] = []
  const chars = (xs: LayoutItem[]) => xs.reduce((n, i) => n + i.text.trim().length, 0)
  const totalChars = chars(items)
  const isColumn = (mid: number) => {
    const left = items.filter((i) => i.x + i.w <= mid)
    const right = items.filter((i) => i.x >= mid)
    const share = MIN_COLUMN_SHARE * items.length
    if (left.length < share || right.length < share) return false
    const small = (side: LayoutItem[]) => chars(side) < MIN_COLUMN_CHAR_SHARE * totalChars
    const rail = (side: LayoutItem[]) => side.filter((i) => isRailText(i.text)).length >= RAIL_SHARE * side.length
    return !(small(left) && rail(left)) && !(small(right) && rail(right))
  }
  const lo = Math.round(width * SPLIT_SEARCH_MIN)
  const hi = Math.round(width * SPLIT_SEARCH_MAX)
  let run: number[] = []
  for (let x = lo; x <= hi; x += 2) {
    const crosses = items.some((i) => i.x < x && i.x + i.w > x)
    if (crosses) {
      if (run.length) {
        const mid = run[Math.floor(run.length / 2)]
        if (isColumn(mid)) splits.push(mid)
        run = []
      }
    } else {
      run.push(x)
    }
  }
  if (run.length) {
    const mid = run[Math.floor(run.length / 2)]
    if (isColumn(mid)) splits.push(mid)
  }
  return splits
}

/**
 * Count x-positions that recur down the page — right-aligned dates, table cells.
 *
 * Reported, not yet scored. There is no corpus-validated threshold at which
 * this becomes a defect, and a penalty without one is a guess with a number in
 * front of it — which is the failure mode this whole rebuild exists to end.
 */
function countAlignedColumns(rows: { items: LayoutItem[] }[], width: number): number {
  const floor = width * ALIGNED_MIN_X_SHARE
  const tally = new Map<number, number>()
  for (const row of rows) {
    if (row.items.length < 2) continue
    for (const x of new Set(row.items.map((i) => Math.round(i.x / 4) * 4))) {
      if (x < floor) continue
      tally.set(x, (tally.get(x) ?? 0) + 1)
    }
  }
  return [...tally.values()].filter((n) => n >= ALIGNED_MIN_ROWS).length
}

/**
 * pdfjs emits a separate item per glyph run, so joining naively yields
 * "Rohan   Sharma". Join on a single space and collapse — but only WITHIN a
 * line, which is the difference that matters: the old code collapsed across the
 * whole page and destroyed the layout in the process.
 */
function rowText(items: LayoutItem[]): string {
  const sorted = items.sort((a, b) => a.x - b.x)
  /**
   * A wide gap between two runs on one line is a COLUMN of the row — "Senior Analyst" ⟷ "Gurugram", "ICICI Bank" ⟷
   * "Jun 2025 – Present" — and is kept as a tab. Joining everything with one space read a right-aligned city as part of
   * the job title ("Senior Analyst Gurugram"). The threshold is relative to the glyph height, so a 7 pt dense résumé
   * and a 14 pt airy one both keep ordinary word gaps as spaces.
   */
  let out = ''
  for (const [k, it] of sorted.entries()) {
    if (k > 0) {
      const prev = sorted[k - 1]
      const gap = it.x - (prev.x + prev.w)
      out += gap > Math.max(prev.h, it.h, 8) * 3 ? '\t' : ' '
    }
    out += it.text
  }
  return out.replace(/[ \u00a0]+/g, ' ').replace(/ ?\t ?/g, '\t').trim()
}

export function buildPage(items: LayoutItem[], width: number, height: number): LayoutPage {
  const real = items.filter((i) => i.text.trim().length > 0)
  if (real.length === 0) return { lines: [], columns: 1, width, height, alignedColumns: 0 }

  const splits = findColumnSplits(real, width)
  const bounds = [0, ...splits, width]
  const columns = bounds.length - 1

  const lines: LayoutLine[] = []
  for (let c = 0; c < columns; c++) {
    const inColumn = real.filter((i) => {
      const centre = i.x + i.w / 2
      return centre >= bounds[c] && centre < bounds[c + 1]
    })
    for (const row of toLines(inColumn)) {
      const text = rowText(row.items)
      if (!text) continue
      lines.push({
        text,
        x: Math.min(...row.items.map((i) => i.x)),
        y: row.y,
        column: c,
        size: Math.max(...row.items.map((i) => i.h)),
        // pdfjs font records carry the weight in their name for standard fonts;
        // for embedded subsets it often does not, so this is a hint, not a fact.
        bold: row.items.some((i) => /bold|black|heavy|semib/i.test(i.font)),
      })
    }
  }

  return {
    lines,
    columns,
    width,
    height,
    alignedColumns: countAlignedColumns(toLines(real), width),
  }
}

/**
 * Flatten a laid-out document back to text — with REAL newlines, which is the
 * whole point. Columns are emitted in reading order (left column entire, then
 * the next), because that is the order a human reads a sidebar résumé and the
 * order an ATS needs in order to keep a job title next to its own bullets.
 */
/**
 * A line from a column other than the first — evidence for the column finding.
 *
 * ⚠️ THE FINDING LOST ITS QUOTE WHEN DETECTION MOVED TO GEOMETRY. Its evidence
 * used to come from `looksMultiColumn`'s whitespace sample, and that heuristic
 * no longer runs once a measured column count is available — so the highest
 * severity check in the file was the one with nothing to show. A line we
 * actually found in the sidebar is better evidence than the run of spaces that
 * used to stand in for one.
 */
export function columnSample(doc: LayoutDoc): string | undefined {
  /**
   * A heading is poor evidence twice over: it is usually the candidate's
   * shortest line, and the preview renders headings from OUR vocabulary rather
   * than their words, so a quoted heading could never be found in the document
   * on screen. Prefer a line of actual content.
   */
  const isContent = (text: string) => {
    const t = text.trim()
    return t.length > 24 && /[a-z]/.test(t)
  }
  for (const page of doc.pages) {
    if (page.columns < 2) continue
    /**
     * And prefer the NARROWER column. A sidebar is where a two-column résumé
     * puts the things an interleaving parser damages worst — contact details,
     * skills, dates — so showing the reader a line from there is showing them
     * the part actually at risk, not merely proof that two columns exist.
     */
    const byColumn = new Map<number, typeof page.lines>()
    for (const l of page.lines) byColumn.set(l.column, [...(byColumn.get(l.column) ?? []), l])
    const columns = [...byColumn.entries()].sort((a, b) => a[1].length - b[1].length)
    for (const [, lines] of columns) {
      const line = lines.find((l) => isContent(l.text))
      if (line) return line.text
    }
  }
  return undefined
}

export function layoutToText(doc: LayoutDoc): string {
  return doc.pages
    .map((p) => p.lines.map((l) => l.text).join('\n'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
