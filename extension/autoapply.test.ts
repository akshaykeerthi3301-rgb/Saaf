// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import '../extension/autofill.js'
import '../extension/autoapply.js'

/**
 * "Apply for me" (2026-09-25). The refusals matter more than the submissions:
 * every "stops" case below is a way a real application could go out wrong.
 */
type Result = { status: string; reason: string; filled: unknown[] }
type Auto = {
  run: (d: Document, p: Record<string, string>, o?: Record<string, unknown>) => Promise<Result>
  missingRequired: (d: Document) => string[]
  findSubmit: (d: Document) => HTMLElement | null
  confirmationSeen: (d: Document) => boolean
}
let A: Auto
beforeAll(() => { A = (globalThis as unknown as { SaafAutoApply: Auto }).SaafAutoApply })
afterEach(() => { document.body.innerHTML = '' })

const P = { fullName: 'Priya Iyer', email: 'priya@example.com', phone: '+91 98765 43210', authorisedToWork: 'yes' }
const FAST = { waitMs: 50, settleMs: 10, confirmMs: 600 }
const form = (html: string, onSubmit?: () => void) => {
  document.body.innerHTML = `<form id="f">${html}<button type="submit">Submit application</button></form>`
  document.getElementById('f')!.addEventListener('submit', (e) => {
    e.preventDefault()
    onSubmit?.()
  })
}
const confirmOnSubmit = () => { document.body.innerHTML = '<h1>Thank you for applying! We have received your application.</h1>' }

describe('submits only a complete form, and only calls it submitted when the page confirms', () => {
  it('fills, submits, and reports submitted on a confirmation page', async () => {
    let submitted = 0
    form(`<label for="n">Full name</label><input id="n" required><label for="e">Email</label><input id="e" type="email" required>`,
      () => { submitted++; confirmOnSubmit() })
    const r = await A.run(document, P, FAST)
    expect(submitted).toBe(1)
    expect(r.status).toBe('submitted')
  })

  it('reports "unconfirmed", never "submitted", when no confirmation appears', async () => {
    form(`<label for="n">Full name</label><input id="n" required>`, () => {})
    const r = await A.run(document, P, FAST)
    expect(r.status).toBe('unconfirmed')
  })
})

describe('stops and hands over', () => {
  it('stops at a CAPTCHA without touching Submit', async () => {
    let submitted = 0
    form(`<label for="n">Full name</label><input id="n" required><div class="g-recaptcha" data-sitekey="x"></div>`, () => { submitted++ })
    const r = await A.run(document, P, FAST)
    expect([r.status, submitted]).toEqual(['needs-you', 0])
    expect(r.reason).toMatch(/CAPTCHA/)
  })

  it('stops when a required question has no stored answer', async () => {
    let submitted = 0
    form(`<label for="n">Full name</label><input id="n" required>
      <label for="w">Why do you want to work here?</label><textarea id="w" required></textarea>`, () => { submitted++ })
    const r = await A.run(document, P, FAST)
    expect([r.status, submitted]).toEqual(['needs-you', 0])
    expect(r.reason).toMatch(/Why do you want to work here/)
  })

  it('stops on a required demographic question — we never answer those', async () => {
    let submitted = 0
    form(`<label for="n">Full name</label><input id="n" required>
      <label for="g">Gender</label><select id="g" required><option value="">Select</option><option>Female</option></select>`, () => { submitted++ })
    const r = await A.run(document, P, FAST)
    expect([r.status, submitted]).toEqual(['needs-you', 0])
  })

  it('stops on a required résumé upload with no stored file', async () => {
    let submitted = 0
    form(`<label for="n">Full name</label><input id="n" required><label for="r">Resume</label><input id="r" type="file" required>`, () => { submitted++ })
    const r = await A.run(document, P, FAST)
    expect([r.status, submitted]).toEqual(['needs-you', 0])
  })

  it('attaches the stored résumé, then submits', async () => {
    let submitted = 0
    form(`<label for="n">Full name</label><input id="n" required><label for="r">Resume</label><input id="r" type="file" required>`,
      () => { submitted++; confirmOnSubmit() })
    const r = await A.run(document, P, { ...FAST, resumeFile: { name: 'cv.pdf', type: 'application/pdf', base64: btoa('%PDF') } })
    expect([r.status, submitted]).toEqual(['submitted', 1])
  })
})

describe('findSubmit', () => {
  it('never picks "Apply with LinkedIn" or "Save draft"', () => {
    document.body.innerHTML = `<form><button type="button">Apply with LinkedIn</button><button type="button">Save draft</button></form>`
    expect(A.findSubmit(document)).toBeNull()
  })
})

describe('confirmationSeen', () => {
  it.each(['Thank you for your application', 'Your application has been submitted', "We've received your application"])('%s', (t) => {
    document.body.innerHTML = `<p>${t}</p>`
    expect(A.confirmationSeen(document)).toBe(true)
  })
  it('is not fooled by the word "apply" alone', () => {
    document.body.innerHTML = '<p>Thank you for your interest. Apply below.</p>'
    expect(A.confirmationSeen(document)).toBe(false)
  })
})
