// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import '../extension/autofill.js'
import '../extension/autoapply.js'

/**
 * Forms built from web components (SmartRecruiters' one-click page): no ordinary <input> on the page at all — every box sits in a
 * shadow tree, and its label is an ATTRIBUTE on the component around it. Before this was handled the page "had no form" and the
 * Autofill button stayed grey.
 */
type A = {
  deepAll: (r: ParentNode, s: string) => HTMLElement[]
  signalsFor: (el: Element, d: Document) => string
  classify: (s: string, self?: unknown) => { key?: string; refused?: boolean } | null
  fillForm: (p: Record<string, unknown>, d: Document, o?: Record<string, unknown>) => Promise<{ filled: { key: string; value: string }[] }>
  checklist: (d: Document) => { items: { label: string; required: boolean; done: boolean }[] }
}
let F: A
let AP: { hasForm: (d: Document) => boolean }
beforeAll(() => {
  // The fake DOM draws nothing; a real browser reports a size for every visible box. Say they are all drawn.
  Element.prototype.getClientRects = function () { return [{ width: 100, height: 20 }] as unknown as DOMRectList }
  F = (globalThis as unknown as { SaafAutofill: A }).SaafAutofill; AP = (globalThis as unknown as { SaafAutoApply: typeof AP }).SaafAutoApply
})
afterEach(() => { document.body.innerHTML = '' })

/** <spl-input label=… required> with its box inside a nested shadow tree, and a listener on the component itself. */
function component(attrs: Record<string, string>, inner = '<input type="text">') {
  const host = document.createElement('spl-input')
  for (const [k, v] of Object.entries(attrs)) host.setAttribute(k, v)
  const sr = host.attachShadow({ mode: 'open' })
  sr.innerHTML = `<div>${inner}</div>`
  document.body.appendChild(host)
  return { host, input: sr.querySelector('input,textarea') as HTMLInputElement }
}
const PROFILE = { fullName: 'Priya Iyer', email: 'priya@example.com', phone: '+91 98450 00000', city: 'Bengaluru' }

describe('seeing inside web components', () => {
  it('finds boxes in shadow trees — and the page itself has none', () => {
    const { input } = component({ label: 'First name', required: '' })
    expect(document.querySelectorAll('input').length).toBe(0)
    expect(F.deepAll(document, 'input')).toContain(input)
  })
  it('reads the label from the component\'s attributes, and knows it is required', () => {
    const { input } = component({ label: 'First name', autocomplete: 'given-name', required: '' })
    expect(F.signalsFor(input, document)).toMatch(/first name/i)
    expect(F.checklist(document).items).toMatchObject([{ label: 'First name', required: true, done: false }])
  })
  it('the application logic now recognises such a page as having a form', () => {
    component({ label: 'Email', type: 'email' }, '<input type="email">')
    expect(AP.hasForm(document)).toBe(true)
  })
  it('an ordinary page behaves exactly as before', () => {
    document.body.innerHTML = '<form><label for="a">First name</label><input id="a"></form>'
    expect(F.deepAll(document, 'input')).toHaveLength(1)
    expect(AP.hasForm(document)).toBe(true)
    document.body.innerHTML = '<p>Nothing here</p>'
    expect(AP.hasForm(document)).toBe(false)
  })
})

describe('filling them', () => {
  it('fills the boxes, and the COMPONENT hears it (the event crosses the shadow edge)', async () => {
    const a = component({ label: 'First name', autocomplete: 'given-name', required: '' })
    const b = component({ label: 'Email', autocomplete: 'email', required: '' }, '<input type="email">')
    const heard: string[] = []
    for (const c of [a, b]) c.host.addEventListener('input', () => heard.push(c.input.value))
    const res = await F.fillForm(PROFILE, document, { mode: 'manual' })
    expect(a.input.value).toBe('Priya')
    expect(b.input.value).toBe('priya@example.com')
    expect(heard).toEqual(['Priya', 'priya@example.com'])
    expect(res.filled.map((f) => f.value)).toEqual(['Priya', 'priya@example.com'])
  })
  it('never types into a pick-a-country search box inside a phone component', async () => {
    const phone = document.createElement('spl-phone-field')
    const sr = phone.attachShadow({ mode: 'open' })
    sr.innerHTML = '<spl-dropdown-search></spl-dropdown-search>'
    const ds = sr.querySelector('spl-dropdown-search') as HTMLElement
    ds.attachShadow({ mode: 'open' }).innerHTML = '<input type="text" placeholder="Search" autocomplete="tel">'
    document.body.appendChild(phone)
    await F.fillForm(PROFILE, document, { mode: 'manual' })
    expect((ds.shadowRoot!.querySelector('input') as HTMLInputElement).value).toBe('')
  })
  it('leaves a site\'s own résumé-reader drop zone alone, and gives the real résumé box the file', async () => {
    const mk = (testId: string) => { const h = document.createElement('spl-dropzone'); h.setAttribute('data-test', testId); h.attachShadow({ mode: 'open' }).innerHTML = '<input type="file">'; document.body.appendChild(h); return h.shadowRoot!.querySelector('input') as HTMLInputElement }
    const helper = mk('apply-with-resume-container'); const real = mk('resume-upload')
    await F.fillForm(PROFILE, document, { mode: 'manual', resumeFile: { name: 'Priya.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', base64: btoa('PK') } })
    expect(helper.files?.length ?? 0).toBe(0)
    expect(real.files?.[0]?.name).toBe('Priya.docx')
  })
})

describe('the consent pattern no longer eats field names', () => {
  it('"Confirm your email" is a field to fill, not a consent box', () => {
    for (const s of ['Confirm your email', 'confirm email input i Confirm your email', 'Confirm phone number']) expect(F.classify(s)?.refused).not.toBe(true)
  })
  it('real consent wording is still refused', () => {
    for (const s of ['I confirm that the information is true', 'I hereby certify that', 'I acknowledge the privacy notice', 'I agree to the terms and conditions']) expect(F.classify(s)).toMatchObject({ refused: true })
  })
})
