/**
 * A minimal PDF writer, for test fixtures only.
 *
 * Why hand-rolled rather than a library: the whole point of these fixtures is
 * to pin GEOMETRY. A generator that decides its own line positions cannot test
 * a parser whose job is to recover those positions. Here the caller states an
 * exact (x, y) per text run and the file contains exactly that, so
 * "did column detection find a corridor at x=220" is a question with a known
 * right answer rather than whatever the layout engine happened to do.
 *
 * Not for production use: no compression, no encoding beyond WinAnsi, one font.
 */

export type Run = { text: string; x: number; y: number; size?: number; bold?: boolean }
export type Page = { runs: Run[]; width?: number; height?: number }

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

function contentStream(runs: Run[]): string {
  return runs
    .map(
      (r) =>
        `BT /${r.bold ? 'F2' : 'F1'} ${r.size ?? 10} Tf 1 0 0 1 ${r.x} ${r.y} Tm (${esc(r.text)}) Tj ET`,
    )
    .join('\n')
}

export function makePdf(pages: Page[]): Buffer {
  const objects: string[] = []
  // 1 catalog, 2 pages, then per page: a page object and a content stream.
  const pageIds = pages.map((_, i) => 3 + i * 2)
  objects.push(`<< /Type /Catalog /Pages 2 0 R >>`)
  objects.push(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  )

  const fontId = 3 + pages.length * 2
  for (const [i, page] of pages.entries()) {
    const w = page.width ?? 612
    const h = page.height ?? 792
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents ${pageIds[i] + 1} 0 R ` +
        `/Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontId + 1} 0 R >> >> >>`,
    )
    const stream = contentStream(page.runs)
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`)
  }
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`)
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`)

  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  for (const [i, body] of objects.entries()) {
    offsets.push(Buffer.byteLength(out, 'latin1'))
    out += `${i + 1} 0 obj\n${body}\nendobj\n`
  }
  const xref = Buffer.byteLength(out, 'latin1')
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}
