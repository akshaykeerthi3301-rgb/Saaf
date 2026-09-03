/**
 * Extract plain text from a PDF buffer, in memory only.
 *
 * pdfjs-dist ships ESM builds; the `legacy` one is the build that runs under
 * Node without a DOM. Imported dynamically so it never reaches a client bundle.
 *
 * Cleanup detail worth keeping: in pdfjs-dist v6 the LOADING TASK owns
 * `destroy()`; the document proxy only has `cleanup()`. Calling `doc.destroy()`
 * throws. Since this runs inside a server action on every résumé upload,
 * failing to release the task would leak per request.
 */
// No résumé is legitimately longer than this. Bounds worst-case parse time
// under disableWorker's single-threaded, synchronous-per-page loop — a
// pathological PDF (many pages, heavy fonts/images) near the 5MB cap could
// otherwise run long enough to hit the platform's function timeout with no
// clean error surfaced to the client at all.
const MAX_PAGES = 15

export async function pdfToText(buffer: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')

  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    // No worker in Node. Parsing is short and runs on the request thread.
    disableWorker: true,
  } as Parameters<typeof pdfjs.getDocument>[0])

  try {
    const doc = await task.promise
    const pages: string[] = []
    for (let i = 1; i <= Math.min(doc.numPages, MAX_PAGES); i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      // pdfjs emits a separate item per glyph run, so a naive join yields
      // "Rohan   Sharma" with runs of spaces. Collapsing them here means every
      // downstream consumer sees normal prose instead of each having to cope.
      const line = content.items
        .map((it) => ('str' in it ? it.str : ''))
        .join(' ')
        .replace(/[ \t\u00a0]+/g, ' ')
        .trim()
      pages.push(line)
    }
    return pages.join('\n')
  } finally {
    await task.destroy()
  }
}
