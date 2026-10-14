import { join } from 'node:path'
import { loadDocument } from './pdf'
import { buildPage, layoutToText, type LayoutItem, type LayoutPage } from './layout'

/**
 * Local OCR for scanned and vector-painted résumés. NOTHING LEAVES THIS PROCESS: the page is rendered in memory and read
 * by Tesseract compiled to WebAssembly, using the English language data that ships in `@tesseract.js-data/eng` (so the
 * library has no reason to fetch it from a CDN). The privacy page promises a file is parsed and dropped; a hosted OCR or
 * vision model would break that, so this is the only OCR path (docs/RESUME-PARSING-BLUEPRINT.md §2.1, option A).
 *
 * ponytail: English only, one worker per call, ≤ 4 pages, no deskew. Add Hindi (`@tesseract.js-data/hin`) and a worker
 * pool only if the benchmark shows Hindi résumés or latency are real problems.
 */

const MAX_OCR_PAGES = 4
const SCALE = 2.5 // ~180 dpi from a 72 dpi page; Tesseract wants ≥ 150
const LANG_PATH = join(process.cwd(), 'node_modules', '@tesseract.js-data', 'eng', '4.0.0')

export type OcrResult = { text: string; confidence: number; pages: number; columns: number; /** Pages in the file that were NOT read (the cap). */ skippedPages: number }

/** PNG and JPEG carry their pixel size in the header; the OCR needs it to put word boxes on a 612-pt page. */
function imageSize(b: Buffer): { w: number; h: number } {
  if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
  for (let i = 2; i < b.length - 9; i++) if (b[i] === 0xff && (b[i + 1] === 0xc0 || b[i + 1] === 0xc2)) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) }
  return { w: 1530, h: 1980 }
}

/**
 * ⚠️ WE DO NOT USE TESSERACT'S OWN READING ORDER. On a two-column scan it returned one block and read straight across
 * the gutter ("SKILLS Mar 2022 - Present") — the column merge this whole layer exists to prevent. Instead the word boxes
 * are handed to the same column detector the text-PDF path uses (`layout.ts` buildPage), so a scan and a born-digital
 * file of the same résumé come out in the same order.
 */
/** Largest picture we will OCR, in pixels. A 4 MB PNG can declare a canvas of billions; a résumé page at 180 dpi is ~4 million. */
const MAX_PIXELS = 40_000_000

async function recognise(images: Buffer[], skippedPages = 0): Promise<OcrResult> {
  // ⚠️ VALIDATE BEFORE THE WORKER SEES IT. A corrupt image makes Tesseract's background worker throw an UNCAUGHT exception
  // — observed under test — which on a server ends the whole process, not just this upload. Decoding it here first turns
  // that into an ordinary rejected promise.
  const { loadImage } = await import('@napi-rs/canvas')
  for (const img of images) {
    const decoded = await loadImage(img)
    if (decoded.width * decoded.height > MAX_PIXELS) throw new Error('image too large')
  }
  const { createWorker } = await import('tesseract.js')
  // The worker reports failures by event as well as by rejection; with no handler of ours the event is rethrown unhandled.
  const worker = await createWorker('eng', 1, { langPath: LANG_PATH, gzip: true, cacheMethod: 'none', errorHandler: () => undefined })
  try {
    let conf = 0
    const pages: LayoutPage[] = []
    for (const img of images) {
      const { data } = await worker.recognize(img, {}, { text: true, blocks: true })
      const { w, h } = imageSize(img)
      const k = w / 612
      const items: LayoutItem[] = []
      for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) for (const wd of l.words) {
        if (!wd.text.trim()) continue
        // image y grows downward, PDF y upward; the baseline is the bottom of the box.
        items.push({ text: wd.text, x: wd.bbox.x0 / k, y: (h - wd.bbox.y1) / k, w: (wd.bbox.x1 - wd.bbox.x0) / k, h: (wd.bbox.y1 - wd.bbox.y0) / k, font: 'ocr' })
      }
      // No word boxes (unexpected API shape) → fall back to Tesseract's own text rather than return nothing.
      pages.push(items.length ? buildPage(items, 612, h / k) : buildPage([{ text: data.text, x: 0, y: 0, w: 612, h: 10, font: 'ocr' }], 612, h / k))
      conf += data.confidence
    }
    return {
      text: layoutToText({ pages }),
      confidence: images.length ? conf / images.length : 0,
      pages: images.length,
      columns: Math.max(1, ...pages.map((p) => p.columns)),
      skippedPages,
    }
  } finally {
    await worker.terminate()
  }
}

/** Render each PDF page to a PNG in memory. */
export async function renderPdf(buffer: Buffer, scale = SCALE, format: 'image/png' | 'image/jpeg' = 'image/png'): Promise<{ images: Buffer[]; total: number }> {
  const { createCanvas } = await import('@napi-rs/canvas')
  const task = await loadDocument(buffer)
  try {
    const doc = await task.promise
    const out: Buffer[] = []
    for (let i = 1; i <= Math.min(doc.numPages, MAX_OCR_PAGES); i++) {
      const page = await doc.getPage(i)
      const viewport = page.getViewport({ scale })
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({
        canvasContext: ctx as unknown as CanvasRenderingContext2D,
        canvas: canvas as unknown as HTMLCanvasElement,
        viewport,
      }).promise
      out.push(canvas.toBuffer(format as 'image/png'))
    }
    return { images: out, total: doc.numPages }
  } finally {
    await task.destroy()
  }
}

export async function ocrPdf(buffer: Buffer): Promise<OcrResult> {
  const { images, total } = await renderPdf(buffer)
  return recognise(images, Math.max(0, total - images.length))
}

export async function ocrImage(buffer: Buffer): Promise<OcrResult> {
  return recognise([buffer])
}
