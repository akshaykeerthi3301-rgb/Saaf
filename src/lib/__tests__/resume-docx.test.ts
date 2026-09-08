import { describe, it, expect } from 'vitest'
import { buildResumeDocx, docxFilename } from '../resume-docx'
import type { Draft } from '../tailor'

const draft: Draft = {
  bullets: [
    'Owned the merchant payments funnel end to end at Paytm.',
    'Ran A/B tests on the onboarding flow and reported weekly on activation.',
  ],
  coverNote: 'I am writing about the Senior Product Manager role at Razorpay.',
  matched: ['SQL'],
  provider: 'groq',
  dropped: [],
}

describe('the tailored .docx', () => {
  it('produces a real Word file, not an empty buffer', async () => {
    const buf = await buildResumeDocx({
      draft,
      roleTitle: 'Senior Product Manager',
      company: 'Razorpay',
    })
    expect(buf.length).toBeGreaterThan(2000)
    // A .docx is a ZIP, and every ZIP begins with the local file header 'PK'.
    // Checking the magic bytes is the difference between "a buffer came back"
    // and "a file Word will open".
    expect(buf.subarray(0, 2).toString('binary')).toBe('PK')
  })

  it('grows with the content, so the file is not silently empty', async () => {
    const full = await buildResumeDocx({ draft, roleTitle: 'Senior Product Manager' })
    // document.xml is deflated inside the zip, so the text is not greppable in
    // the raw buffer. Size is the honest proxy: a document carrying two real
    // paragraphs is materially larger than one carrying a single character.
    const minimal = await buildResumeDocx({
      draft: { ...draft, bullets: ['x'], coverNote: '' },
      roleTitle: 'X',
    })
    expect(full.length).toBeGreaterThan(minimal.length)
  })

  it('works with no cover note', async () => {
    const buf = await buildResumeDocx({
      draft: { ...draft, coverNote: '' },
      roleTitle: 'Analyst',
    })
    expect(buf.length).toBeGreaterThan(2000)
  })
})

describe('the filename', () => {
  it('is findable in a downloads folder', () => {
    expect(docxFilename('Senior Product Manager', 'Razorpay')).toBe(
      'saaf-tailored-senior-product-manager-razorpay.docx',
    )
  })

  it('survives punctuation and never produces a bare extension', () => {
    expect(docxFilename('Head of Go-to-Market (India)')).toBe(
      'saaf-tailored-head-of-go-to-market-india.docx',
    )
    expect(docxFilename('!!!')).toBe('saaf-tailored-resume.docx')
  })
})
