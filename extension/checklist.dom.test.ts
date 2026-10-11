// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import '../extension/autofill.js'

/**
 * The panel's "Completion" bar and "Required" list. The numbers a person trusts must be the page's own: required
 * means the page marked it required, done means it holds a value. Nothing is guessed, nothing is written.
 */
type Item = { label: string; required: boolean; done: boolean; el: Element }
type Checklist = { items: Item[]; required: number; done: number; counted: Item[] }
let check: (d: Document) => Checklist
beforeAll(() => { check = (globalThis as unknown as { SaafAutofill: { checklist: typeof check } }).SaafAutofill.checklist })
afterEach(() => { document.body.innerHTML = '' })
const form = (html: string) => { document.body.innerHTML = `<form>${html}</form>`; return document }

describe('checklist', () => {
  it('counts what the page marks required, and which of those hold a value', () => {
    const r = check(form(`
      <label for="a">First name *</label><input id="a" required value="Priya">
      <label for="b">Email</label><input id="b" type="email" required>
      <label for="c">Nickname</label><input id="c">`))
    expect(r.items.map((i) => [i.label, i.required, i.done])).toEqual([['First name', true, true], ['Email', true, false], ['Nickname', false, false]])
    expect([r.required, r.done]).toEqual([2, 1])
  })

  it('counts every box when the page marks none required', () => {
    const r = check(form(`<label for="a">City</label><input id="a" value="Pune"><label for="b">Phone</label><input id="b">`))
    expect([r.required, r.done]).toEqual([2, 1])
  })

  it('treats a dropdown on its placeholder as unanswered, and a chosen option as answered', () => {
    const r = check(form(`
      <label for="s">Country</label><select id="s" required><option value="">Select…</option><option value="in">India</option></select>`))
    expect(r.items[0].done).toBe(false)
    ;(document.querySelector('#s') as HTMLSelectElement).value = 'in'
    expect(check(document).items[0].done).toBe(true)
  })

  it('counts a radio group once, done when any option is picked, named by its legend', () => {
    document.body.innerHTML = `<form><fieldset><legend>Are you authorised to work here? *</legend>
      <label><input type="radio" name="auth" value="y" required> Yes</label>
      <label><input type="radio" name="auth" value="n"> No</label></fieldset></form>`
    let r = check(document)
    expect(r.items).toHaveLength(1)
    expect([r.items[0].label, r.items[0].required, r.items[0].done]).toEqual(['Are you authorised to work here?', true, false])
    ;(document.querySelector('input[value="y"]') as HTMLInputElement).checked = true
    r = check(document)
    expect(r.items[0].done).toBe(true)
  })

  it('reads a file box as done only when a file is attached, and skips hidden and button inputs', () => {
    const r = check(form(`
      <label for="f">Resume/CV *</label><input id="f" type="file" required>
      <input type="hidden" name="token" value="x"><input type="submit" value="Submit"><input type="password" name="p">`))
    expect(r.items.map((i) => [i.label, i.done])).toEqual([['Resume/CV', false]])
  })

  it('never writes to the page', () => {
    const d = form(`<label for="a">Email</label><input id="a" required>`)
    const before = d.body.innerHTML
    check(d)
    expect(d.body.innerHTML).toBe(before)
  })
})
