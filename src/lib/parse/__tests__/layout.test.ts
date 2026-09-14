import { describe, it, expect } from 'vitest'
import { buildPage, columnSample, layoutToText, type LayoutItem } from '../layout'

/**
 * Unit tests for the geometry, built from synthetic text items rather than real
 * PDFs.
 *
 * The bench (`npm run bench`) already exercises this against 26 real documents,
 * which is where accuracy is measured. What that cannot do is pin the SHAPE of
 * the decisions — a corpus run tells you the column count came out wrong, not
 * which rule decided it. These are the cases worth being able to reason about
 * in isolation.
 */

/** A text run, positioned. Widths are deliberate: they decide the corridors. */
const run = (text: string, x: number, y: number, w = text.length * 5, font = 'g_d0_f1'): LayoutItem => ({
  text,
  x,
  y,
  w,
  h: 10,
  font,
})

describe('line reconstruction', () => {
  it('groups runs that share a baseline, in reading order', () => {
    const page = buildPage(
      [run('Sharma', 60, 700, 30), run('Rohan', 16, 700, 30), run('Bengaluru', 16, 686, 45)],
      612,
      792,
    )
    expect(page.lines.map((l) => l.text)).toEqual(['Rohan Sharma', 'Bengaluru'])
  })

  it('tolerates a baseline that is off by less than half a glyph', () => {
    // Subscripts, inline symbols and some producers nudge the baseline. A
    // half-height tolerance keeps them on their own line rather than inventing
    // one per glyph run — which is what made a résumé arrive as 200 "lines".
    const page = buildPage([run('Owned the', 16, 700, 45), run('funnel', 64, 703, 30)], 612, 792)
    expect(page.lines).toHaveLength(1)
  })

  it('orders lines down the page, not by the order pdfjs emitted them', () => {
    const page = buildPage([run('third', 16, 600), run('first', 16, 700), run('second', 16, 650)], 612, 792)
    expect(page.lines.map((l) => l.text)).toEqual(['first', 'second', 'third'])
  })
})

describe('column detection', () => {
  /** A sidebar at x=40 and a main column at x=300, with a clear corridor. */
  const twoColumn: LayoutItem[] = [
    ...['Priya Iyer', 'Bengaluru', 'SQL', 'Figma', 'Jira'].map((t, i) => run(t, 40, 700 - i * 14, 90)),
    ...['Senior Product Manager', 'Mar 2022 - Present', 'Led the rollout', 'Cut drop-off'].map((t, i) =>
      run(t, 300, 700 - i * 14, 200),
    ),
  ]

  it('finds a corridor no text crosses', () => {
    expect(buildPage(twoColumn, 612, 792).columns).toBe(2)
  })

  it('reads a column whole before moving to the next', () => {
    // ⚠️ THE REASON COLUMN DETECTION EARNS ITS KEEP. Read in baseline order,
    // a sidebar résumé interleaves — "Priya Iyer  Senior Product Manager" —
    // and a job title arrives joined to an unrelated line from the other side.
    const text = layoutToText({ pages: [buildPage(twoColumn, 612, 792)] })
    expect(text.indexOf('Jira')).toBeLessThan(text.indexOf('Senior Product Manager'))
  })

  it('does not split a single column whose lines span the page', () => {
    const wide = ['Owned the merchant payments funnel end to end', 'Ran the experiments that lifted completion'].map(
      (t, i) => run(t, 40, 700 - i * 14, 520),
    )
    expect(buildPage(wide, 612, 792).columns).toBe(1)
  })

  it('refuses a corridor when one side holds almost nothing', () => {
    // A page number or a stray mark in the margin is not a column, and treating
    // it as one would reorder the whole document around it.
    const lopsided = [
      ...Array.from({ length: 12 }, (_, i) => run('A full width line of body text here', 40, 700 - i * 14, 400)),
      run('2', 560, 40, 6),
    ]
    expect(buildPage(lopsided, 612, 792).columns).toBe(1)
  })
})

describe('the evidence a column finding quotes', () => {
  it('prefers content from the narrower column over a heading', () => {
    const page = buildPage(
      [
        run('SKILLS', 40, 700, 40),
        run('Experiment design and analytics', 40, 686, 140),
        ...Array.from({ length: 6 }, (_, i) =>
          run('A long line of body text in the main column', 300, 700 - i * 14, 200),
        ),
      ],
      612,
      792,
    )
    // The sidebar is the narrower column and the part an interleaving parser
    // damages worst, so that is what the reader is shown — and never the
    // heading, which the preview renders from our own vocabulary and so could
    // never be found in the document on screen.
    expect(columnSample({ pages: [page] })).toBe('Experiment design and analytics')
  })

  it('returns nothing for a single-column document', () => {
    const page = buildPage([run('Owned the merchant payments funnel end to end', 40, 700, 520)], 612, 792)
    expect(columnSample({ pages: [page] })).toBeUndefined()
  })
})

describe('font signals', () => {
  it('reports a bold run so heading detection has more than word-matching', () => {
    const page = buildPage([run('WORK EXPERIENCE', 40, 700, 90, 'Helvetica-Bold')], 612, 792)
    expect(page.lines[0].bold).toBe(true)
    expect(page.lines[0].size).toBe(10)
  })
})
