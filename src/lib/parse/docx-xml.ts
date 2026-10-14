import JSZip from 'jszip'
import { DOMParser, type Element as XmlElement, type Node as XmlNode } from '@xmldom/xmldom'

/**
 * A Word file read from its own XML, in reading order — not flattened by `mammoth`.
 *
 * WHY NOT MAMMOTH ALONE. Its raw-text mode drops text boxes, and the two-column Word templates every résumé site sells
 * are built from text boxes or one-row tables. Measured on a fixture with a sidebar text box: mammoth returns the main
 * column and loses the sidebar (contact, skills). `mammoth` stays as the fallback (engine.ts) for a file this reader
 * cannot open.
 *
 * WHAT THIS DOES THAT MATTERS
 *  - Text boxes are read once. Word stores each one TWICE (`mc:Choice` for modern Word, `mc:Fallback` for old) — reading
 *    both prints every sidebar line twice, and the skills list doubles.
 *  - A table of ONE row and several cells is a column layout: each cell is emitted whole, left to right (column-major).
 *    A table of several rows is a list of records ("dates | role"): each row becomes one line, cells joined by a tab,
 *    which is how the section parser already understands a two-part header.
 *  - Headers and footers are included (templates put the name and phone there); identical lines are kept once.
 *  - Text formatted as hidden (`w:vanish`) is skipped. It is invisible to the candidate and a favourite place for
 *    keyword stuffing; reading it would score words nobody can see.
 *  - Numbered/bulleted paragraphs get a "• " prefix: the numbering glyph is not in the XML, so without this a bullet
 *    reads as a sentence.
 *
 * ponytail: no styles, no footnotes, no comments, no `w:vMerge` handling. Add only if a real résumé needs them.
 */

type El = XmlElement
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

const isW = (n: XmlNode, local: string): boolean => n.nodeType === 1 && (n as El).localName === local && (n as El).namespaceURI === W
const named = (n: XmlNode): n is El => n.nodeType === 1
const kids = (n: XmlNode): El[] => Array.from(n.childNodes as unknown as ArrayLike<XmlNode>).filter(named)

function isHidden(run: El): boolean {
  const pr = kids(run).find((c) => isW(c, 'rPr'))
  const v = pr && kids(pr).find((c) => isW(c, 'vanish'))
  return Boolean(v) && v!.getAttributeNS(W, 'val') !== '0' && v!.getAttribute('w:val') !== 'false'
}

/** Text of one paragraph; text boxes it anchors are returned separately (they are blocks of their own). */
function paragraph(p: El, floating: string[][]): string {
  let out = ''
  const walk = (n: El): void => {
    for (const c of kids(n)) {
      if (c.localName === 'Fallback') continue // the duplicate Word keeps for old readers
      if (isW(c, 'txbxContent')) { floating.push(blocks(c)); continue }
      if (isW(c, 'r') && isHidden(c)) continue
      if (isW(c, 't')) out += c.textContent ?? ''
      else if (isW(c, 'tab')) out += '\t'
      else if (isW(c, 'br') || isW(c, 'cr')) out += '\n'
      else if (isW(c, 'noBreakHyphen')) out += '-'
      else if (isW(c, 'instrText') || isW(c, 'pPr') || isW(c, 'rPr')) continue
      else walk(c)
    }
  }
  walk(p)
  const pPr = kids(p).find((c) => isW(c, 'pPr'))
  const bulleted = Boolean(pPr && kids(pPr).some((c) => isW(c, 'numPr')))
  const text = out.replace(/[  ]+\n/g, '\n').trim()
  return text && bulleted ? `• ${text}` : text
}

function table(t: El): string[] {
  const rows = kids(t).filter((c) => isW(c, 'tr'))
  const cells = rows.map((r) => kids(r).filter((c) => isW(c, 'tc')).map((c) => blocks(c)))
  if (rows.length === 1 && cells[0].length >= 2) return cells[0].flat() // a column layout: whole cells, left to right
  const lines: string[] = []
  for (const row of cells) {
    const live = row.filter((c) => c.length > 0)
    if (live.length === 0) continue
    lines.push(live.map((c) => c[0]).join('\t'))
    for (const c of live) lines.push(...c.slice(1))
  }
  return lines
}

/** The lines of any block container (body, cell, text box, content control), in reading order. */
function blocks(container: El): string[] {
  const lines: string[] = []
  for (const c of kids(container)) {
    if (c.localName === 'Fallback') continue
    if (isW(c, 'p')) {
      const floating: string[][] = []
      const text = paragraph(c, floating)
      for (const f of floating) lines.push(...f)
      if (text) lines.push(...text.split('\n').map((l) => l.trim()).filter(Boolean))
    } else if (isW(c, 'tbl')) lines.push(...table(c))
    else if (isW(c, 'sdt')) {
      const content = kids(c).find((k) => isW(k, 'sdtContent'))
      if (content) lines.push(...blocks(content))
    } else if (c.localName === 'AlternateContent') {
      const choice = kids(c).find((k) => k.localName === 'Choice')
      if (choice) lines.push(...blocks(choice))
    }
  }
  return lines
}

function linesOf(xml: string): string[] {
  const doc = new DOMParser({ onError: () => undefined }).parseFromString(xml, 'text/xml')
  const body = Array.from(doc.getElementsByTagNameNS(W, 'body'))[0] ?? Array.from(doc.getElementsByTagNameNS(W, 'hdr'))[0] ?? Array.from(doc.getElementsByTagNameNS(W, 'ftr'))[0]
  return body ? blocks(body) : []
}

export class NotAWordFileError extends Error {}

/**
 * ⚠️ A WORD FILE IS A ZIP, AND A 4 MB UPLOAD CAN UNPACK TO GIGABYTES. Thirty megabytes of zeros deflate to about 30 KB.
 * Reading such a file into memory would take the server down, so the declared unpacked size of every part is checked
 * BEFORE any part is read. A real résumé unpacks to well under 2 MB; the ceilings are generous but finite.
 */
const MAX_PART_BYTES = 20 * 1024 * 1024
const MAX_TOTAL_BYTES = 50 * 1024 * 1024
function assertUnpackedSizeIsSane(zip: JSZip): void {
  let total = 0
  for (const f of Object.values(zip.files)) {
    const size = (f as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0
    total += size
    if (size > MAX_PART_BYTES || total > MAX_TOTAL_BYTES) throw new NotAWordFileError('That Word file unpacks to an unreasonable size.')
  }
}

export async function docxToLines(buffer: Buffer): Promise<string[]> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch {
    throw new NotAWordFileError('This is not a Word (.docx) file.')
  }
  assertUnpackedSizeIsSane(zip)
  const main = zip.file('word/document.xml')
  if (!main) throw new NotAWordFileError('This is not a Word (.docx) file.')
  const listing = (re: RegExp) => Object.keys(zip.files).filter((f) => re.test(f)).sort()
  const read = async (names: string[]) => (await Promise.all(names.map(async (n) => linesOf(await zip.file(n)!.async('string'))))).flat()
  const headers = await read(listing(/^word\/header\d*\.xml$/))
  const body = linesOf(await main.async('string'))
  const footers = await read(listing(/^word\/footer\d*\.xml$/))
  const seen = new Set<string>()
  // Headers and footers repeat on every page section; keep each distinct line once, but never dedupe the body itself.
  const once = (ls: string[]) => ls.filter((l) => (seen.has(l) ? false : (seen.add(l), true)))
  return [...once(headers), ...body, ...once(footers).filter((l) => !/^(page\s*)?\d+(\s*(of|\/)\s*\d+)?$/i.test(l))]
}

/** When the Word file was last saved (core properties), or null. */
export async function docxDocumentDate(buffer: Buffer): Promise<string | null> {
  try {
    const xml = await (await JSZip.loadAsync(buffer)).file('docProps/core.xml')?.async('string')
    const m = xml?.match(/<dcterms:modified[^>]*>(\d{4}-\d{2}-\d{2})/) ?? xml?.match(/<dcterms:created[^>]*>(\d{4}-\d{2}-\d{2})/)
    return m?.[1] ?? null
  } catch {
    return null
  }
}

export async function docxToStructuredText(buffer: Buffer): Promise<string> {
  return (await docxToLines(buffer)).join('\n')
}
