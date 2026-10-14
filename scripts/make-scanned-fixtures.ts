/**
 * Builds image-only PDFs (no text layer — what a scanner makes) from the SYNTHETIC résumés, so the OCR path has
 * something to be measured on without anyone's real document. Output: tests/fixtures/resumes/scanned/.
 *   npm run audit:fixtures
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { renderPdf } from '../src/lib/parse/ocr'

const OUT = join(process.cwd(), 'tests/fixtures/resumes/scanned')
const SRC = join(process.cwd(), 'bench/corpus/synthetic')

/** A PDF whose pages are each one JPEG. Hand-written because the only alternative is a new dependency. */
function imagePdf(jpegs: { data: Buffer; w: number; h: number }[]): Buffer {
  const parts: Buffer[] = []
  const offsets: number[] = []
  let len = 0
  const push = (b: Buffer | string) => { const x = Buffer.isBuffer(b) ? b : Buffer.from(b, 'latin1'); parts.push(x); len += x.length }
  const obj = (n: number, body: () => void) => { offsets[n] = len; push(`${n} 0 obj\n`); body(); push('\nendobj\n') }
  push('%PDF-1.4\n')
  const pageIds = jpegs.map((_, i) => 3 + i * 3)
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'))
  obj(2, () => push(`<< /Type /Pages /Kids [${pageIds.map((n) => `${n} 0 R`).join(' ')}] /Count ${jpegs.length} >>`))
  jpegs.forEach((j, i) => {
    const page = 3 + i * 3, img = page + 1, content = page + 2
    const pw = Math.round(j.w / 2.5), ph = Math.round(j.h / 2.5) // pixels were rendered at 2.5× a 72-dpi page
    obj(page, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 ${img} 0 R >> >> /Contents ${content} 0 R >>`))
    obj(img, () => { push(`<< /Type /XObject /Subtype /Image /Width ${j.w} /Height ${j.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${j.data.length} >>\nstream\n`); push(j.data); push('\nendstream') })
    const stream = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`
    obj(content, () => push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`))
  })
  const xref = len
  const n = 3 + jpegs.length * 3
  push(`xref\n0 ${n}\n0000000000 65535 f \n`)
  for (let i = 1; i < n; i++) push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${n} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)
  return Buffer.concat(parts)
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  for (const name of ['single-column', 'two-column', 'table-layout']) {
    const { images: pages } = await renderPdf(readFileSync(join(SRC, `${name}.pdf`)), 2.5, 'image/jpeg')
    const dims = pages.map((p) => {
      // JPEG SOF0/SOF2 marker carries height then width.
      for (let i = 2; i < p.length - 9; i++) if (p[i] === 0xff && (p[i + 1] === 0xc0 || p[i + 1] === 0xc2)) return { data: p, h: p.readUInt16BE(i + 5), w: p.readUInt16BE(i + 7) }
      throw new Error('no JPEG size marker')
    })
    writeFileSync(join(OUT, `scan-${name}.pdf`), imagePdf(dims))
    console.log(`wrote scan-${name}.pdf (${dims.length} page${dims.length === 1 ? '' : 's'})`)
  }
}
main()
