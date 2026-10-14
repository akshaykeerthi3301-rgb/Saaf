import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { detectKind, parseResume, ResumeFileError } from '../engine'
import { MAX_RESUME_BYTES } from '../constants'

/** Files that are broken, the wrong type, or hostile. Each must fail with a TYPED, SHOWABLE error — never a crash, never a hang. */
const code = async (b: Buffer) => parseResume(b, { ocr: 'never' }).then(() => 'parsed', (e: unknown) => (e instanceof ResumeFileError ? e.code : `UNTYPED:${String(e).slice(0, 80)}`))

describe('detectKind', () => {
  it('trusts bytes, not names', () => {
    expect(detectKind(Buffer.from('%PDF-1.7\n...'))).toBe('pdf')
    expect(detectKind(Buffer.concat([Buffer.from('junk before the header\n'), Buffer.from('%PDF-1.4')]))).toBe('pdf') // PDFs may start with junk
    expect(detectKind(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0]))).toBe('docx')
    expect(detectKind(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('image')
    expect(detectKind(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe('image')
    expect(detectKind(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0]))).toBe('doc')
    expect(detectKind(Buffer.from('hello world'))).toBe('unknown')
  })
})

describe('hostile and broken files', () => {
  it('an empty file', async () => expect(await code(Buffer.alloc(0))).toBe('empty'))
  it('random bytes', async () => expect(await code(Buffer.from('this is not a résumé at all'))).toBe('unsupported'))
  it('an old binary .doc', async () => expect(await code(Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(64)]))).toBe('legacy_doc'))
  it('a file over the size limit', async () => expect(await code(Buffer.alloc(MAX_RESUME_BYTES + 1))).toBe('too_large'))
  it('a PDF header and nothing else', async () => expect(await code(Buffer.from('%PDF-1.4\n%%EOF'))).toBe('unreadable'))
  it('a truncated PDF', async () => expect(await code(Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'))).toBe('unreadable'))
  it('a zip that is not a Word file', async () => {
    const z = new JSZip(); z.file('notes.txt', 'hello')
    expect(await code(await z.generateAsync({ type: 'nodebuffer' }))).toBe('unreadable')
  })
  it('a ZIP BOMB: 30 MB of zeros packed into a few KB must be refused before it is unpacked', async () => {
    const z = new JSZip()
    z.file('word/document.xml', Buffer.alloc(30 * 1024 * 1024))
    const bomb = await z.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    expect(bomb.length).toBeLessThan(200 * 1024) // it really is tiny on the wire
    const t0 = Date.now()
    expect(await code(bomb)).toBe('unreadable')
    expect(Date.now() - t0).toBeLessThan(3000) // refused from the directory, not after inflating
  }, 30_000)
  it('a Word file whose XML is malformed still yields an answer or a typed error', async () => {
    const z = new JSZip(); z.file('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>oops'); 
    expect(['parsed', 'unreadable']).toContain(await code(await z.generateAsync({ type: 'nodebuffer' })))
  })
  it('a PNG header with garbage after it fails typed, not raw', async () => {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 7)])
    expect(await code(png)).toBe('unreadable')
  }, 60_000)
})
