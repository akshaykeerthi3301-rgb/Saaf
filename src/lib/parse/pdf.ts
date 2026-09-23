/**
 * Extract text and layout from a PDF buffer, in memory only.
 *
 * pdfjs-dist ships ESM builds; the `legacy` one is the build that runs under
 * Node without a DOM. Imported dynamically so it never reaches a client bundle.
 *
 * Cleanup detail worth keeping: in pdfjs-dist v6 the LOADING TASK owns
 * `destroy()`; the document proxy only has `cleanup()`. Calling `doc.destroy()`
 * throws. Since this runs inside a server action on every résumé upload,
 * failing to release the task would leak per request.
 *
 * ⚠️ THIS FILE USED TO RETURN ONE LINE PER PAGE. It mapped every text item to
 * `.str`, joined on a space and collapsed the whitespace — discarding the
 * position, size and font data pdfjs hands over for free. See the header of
 * `layout.ts` for what that cost. `pdfToText` keeps its exact signature so
 * every existing caller is unaffected; it is now a thin flattening of the real
 * structure rather than the only thing we could produce.
 */
import { buildPage, layoutToText, type LayoutDoc, type LayoutItem } from './layout'

// No résumé is legitimately longer than this. Bounds worst-case parse time
// under disableWorker's single-threaded, synchronous-per-page loop — a
// pathological PDF (many pages, heavy fonts/images) near the upload cap could
// otherwise run long enough to hit the platform's function timeout with no
// clean error surfaced to the client at all.
const MAX_PAGES = 15

async function loadDocument(buffer: Buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')

  // On Node, pdfjs-dist always disables the real Worker and instead boots a
  // "fake worker" by dynamically importing GlobalWorkerOptions.workerSrc — a
  // runtime STRING VARIABLE it defaults to the relative path
  // "./pdf.worker.mjs". Next's file tracer can't see a dynamic import whose
  // specifier is a variable, so that file never made it into the deployed
  // Vercel function; every résumé upload failed with "Setting up fake
  // worker failed" (confirmed via Vercel's own function logs, not assumed —
  // this is a different bug than it first looked like: @napi-rs/canvas's
  // own missing-binary warning is real but harmless, since getTextContent()
  // never touches DOMMatrix/Path2D; this worker bootstrap was the actual
  // crash). Importing the worker module here uses a literal specifier in
  // OUR source, which the tracer can see and bundle correctly, then handing
  // it to pdfjs-dist directly short-circuits its own untraceable import.
  const { WorkerMessageHandler } = await import('pdfjs-dist/legacy/build/pdf.worker.mjs')
  ;(globalThis as typeof globalThis & { pdfjsWorker?: { WorkerMessageHandler: unknown } }).pdfjsWorker = {
    WorkerMessageHandler,
  }

  return pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    // No worker in Node. Parsing is short and runs on the request thread.
    disableWorker: true,
  } as Parameters<typeof pdfjs.getDocument>[0])
}

/**
 * Read a PDF's full page/column/line structure.
 *
 * Prefer this over `pdfToText` anywhere the ANSWER DEPENDS ON LAYOUT — column
 * count, a heading's point size, whether text sits in the header margin. The
 * ATS checker needs all three and could not ask before.
 */
export async function pdfToLayout(buffer: Buffer): Promise<LayoutDoc> {
  const task = await loadDocument(buffer)
  try {
    const doc = await task.promise
    const pages = []
    for (let i = 1; i <= Math.min(doc.numPages, MAX_PAGES); i++) {
      const page = await doc.getPage(i)
      const viewport = page.getViewport({ scale: 1 })
      const content = await page.getTextContent()
      const items: LayoutItem[] = []
      for (const it of content.items) {
        // `items` is (TextItem | TextMarkedContent)[]; only the former has text.
        // Narrowed in a loop rather than a filter so the check is control-flow
        // narrowing rather than an asserted predicate — no cast, no `any`.
        if (!('str' in it)) continue
        items.push({
          text: it.str,
          // transform is a 6-element affine matrix; [4] and [5] are the
          // translation, i.e. the run's origin on the page.
          x: it.transform[4],
          y: it.transform[5],
          w: it.width,
          h: it.height,
          font: it.fontName,
        })
      }
      pages.push(buildPage(items, viewport.width, viewport.height))
    }
    return { pages }
  } finally {
    await task.destroy()
  }
}

/**
 * Why a PDF yielded no text, in the candidate's own terms.
 *
 * ⚠️ "MICROSOFT PRINT TO PDF" IS THE COMMONEST CAUSE AND THE LEAST OBVIOUS ONE.
 * Two of eleven public sample résumés collected on 2026-09-12 had zero text
 * items and ~12,000 drawing operations: the words are painted as vector shapes,
 * so the file looks perfect on screen and every applicant tracking system in
 * the market reads it as blank. The existing copy called this "likely a scan or
 * an image", which is true of the RESULT and useless as advice — nobody who
 * chose File → Print recognises themselves in the word "scan", so they re-send
 * the same file. Naming the producer turns an unactionable warning into one
 * instruction.
 */
export async function pdfProducer(buffer: Buffer): Promise<string | undefined> {
  const task = await loadDocument(buffer)
  try {
    const doc = await task.promise
    const meta = await doc.getMetadata()
    const info = meta.info as { Producer?: string; Creator?: string } | undefined
    return info?.Producer ?? info?.Creator
  } catch {
    return undefined
  } finally {
    await task.destroy()
  }
}

/** Plain text, with the document's real line breaks preserved. */
export async function pdfToText(buffer: Buffer): Promise<string> {
  return layoutToText(await pdfToLayout(buffer))
}
