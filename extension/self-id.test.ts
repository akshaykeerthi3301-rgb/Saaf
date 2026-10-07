// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import '../extension/autofill.js'

/**
 * TASK-171 — the one way a demographic question is ever answered: from words the
 * candidate typed themselves. The refusals stay the default; every case here that
 * "fills" has a twin that "leaves it".
 *
 * ⚠️ THE CASE THAT MATTERS MOST: "Male" is a substring of "Female". A filler that
 * matched options by "contains" would tick Female for a candidate who typed Male.
 */
type Verdict = { key?: string; refused?: boolean; reason?: string } | null
type Result = { filled: { key: string; value: string; how: string }[]; refused: { reason: string }[]; skipped: number }
type Autofill = {
  classify: (s: string, selfId?: Record<string, string>) => Verdict
  fillForm: (p: Record<string, unknown>, d: Document, o?: Record<string, unknown>) => Promise<Result>
}
let A: Autofill
beforeAll(() => { A = (globalThis as unknown as { SaafAutofill: Autofill }).SaafAutofill })
afterEach(() => { document.body.innerHTML = '' })

const BASE = { fullName: 'Priya Iyer', email: 'priya@example.com' }
const form = (html: string) => { document.body.innerHTML = `<form>${html}</form>`; return document }
const checked = () => [...document.querySelectorAll<HTMLInputElement>('input:checked')].map((e) => e.value)

const GENDER_RADIOS = `
  <fieldset><legend>Gender</legend>
    <label><input type="radio" name="g" value="m"> Male</label>
    <label><input type="radio" name="g" value="f"> Female</label>
    <label><input type="radio" name="g" value="x"> Decline to self-identify</label>
  </fieldset>`

describe('the default has not moved: nothing typed means nothing filled', () => {
  const LABELS = ['Gender', 'Race / Ethnicity', 'Veteran status', 'Disability status', 'Caste', 'Religion', 'Marital status', 'Sexual orientation', 'Pronouns', 'Date of Birth', 'Are you pregnant']
  it.each(LABELS)('refuses %s with no selfId at all', (label) => {
    expect(A.classify(label)?.refused).toBe(true)
  })
  it.each(LABELS)('refuses %s with an empty selfId', (label) => {
    expect(A.classify(label, {})?.refused).toBe(true)
  })
  it('refuses a blank or whitespace-only answer — that is not an answer', () => {
    expect(A.classify('Gender', { gender: '' })?.refused).toBe(true)
    expect(A.classify('Gender', { gender: '   ' })?.refused).toBe(true)
  })
  it('leaves a whole demographic form untouched when nothing was typed', async () => {
    form(GENDER_RADIOS)
    const r = await A.fillForm({ ...BASE }, document)
    expect(checked()).toEqual([])
    expect(r.refused.some((x) => /demographic/.test(x.reason))).toBe(true)
  })
})

describe('an answer the candidate typed lifts exactly that one question', () => {
  it('answers Gender from the typed word, and only Gender', () => {
    expect(A.classify('Gender', { gender: 'Male' })?.key).toBe('selfId:gender')
    expect(A.classify('Religion', { gender: 'Male' })?.refused).toBe(true)
    expect(A.classify('Caste', { gender: 'Male' })?.refused).toBe(true)
  })

  it('never answers date of birth, age or pregnancy, whatever else is stored', () => {
    const all = { gender: 'Male', ethnicity: 'x', disability: 'no', veteran: 'no', orientation: 'x', caste: 'x', religion: 'x', marital: 'x', pronouns: 'he/him' }
    for (const label of ['Date of Birth', 'DOB', 'Age', 'Are you pregnant', 'Gender and date of birth']) {
      expect(A.classify(label, all)?.refused).toBe(true)
    }
  })

  it('refuses a label that asks two things at once', () => {
    expect(A.classify('Gender and sexual orientation', { gender: 'Male', orientation: 'x' })?.refused).toBe(true)
  })

  it('ticks Male for a candidate who typed Male — never Female', async () => {
    form(GENDER_RADIOS)
    const r = await A.fillForm({ ...BASE, selfId: { gender: 'Male' } }, document)
    expect(checked()).toEqual(['m'])
    expect(r.filled.find((f) => f.key === 'selfId:gender')?.value).toBe('Male')
  })

  it('ticks Female for Female, and Man/Woman wordings map to what was typed', async () => {
    form(GENDER_RADIOS)
    await A.fillForm({ ...BASE, selfId: { gender: 'Female' } }, document)
    expect(checked()).toEqual(['f'])
    document.body.innerHTML = ''
    form(`<fieldset><legend>Gender</legend>
      <label><input type="radio" name="g" value="a"> Man</label><label><input type="radio" name="g" value="b"> Woman</label></fieldset>`)
    await A.fillForm({ ...BASE, selfId: { gender: 'Male' } }, document)
    expect(checked()).toEqual(['a'])
  })

  it('leaves the question when the options do not contain what they typed — it does not pick the nearest', async () => {
    form(`<fieldset><legend>Gender</legend>
      <label><input type="radio" name="g" value="f"> Female</label><label><input type="radio" name="g" value="o"> Prefer not to say</label></fieldset>`)
    const r = await A.fillForm({ ...BASE, selfId: { gender: 'Male' } }, document)
    expect(checked()).toEqual([])
    expect(r.refused.length).toBeGreaterThan(0)
  })

  it('picks a dropdown option by whole text', async () => {
    form(`<label for="g">Gender</label><select id="g"><option value="">Select</option><option value="f">Female</option><option value="m">Male</option></select>`)
    await A.fillForm({ ...BASE, selfId: { gender: 'Male' } }, document)
    expect((document.getElementById('g') as HTMLSelectElement).value).toBe('m')
  })

  it('answers a yes/no disability question with Yes or No, from the stored yes/no only', async () => {
    form(`<fieldset><legend>Do you have a disability?</legend>
      <label><input type="radio" name="d" value="y"> Yes, I have a disability</label>
      <label><input type="radio" name="d" value="n"> No, I do not have a disability</label>
      <label><input type="radio" name="d" value="x"> I do not wish to answer</label></fieldset>`)
    await A.fillForm({ ...BASE, selfId: { disability: 'no' } }, document)
    expect(checked()).toEqual(['n'])
    document.body.innerHTML = ''
    form(`<fieldset><legend>Do you have a disability?</legend>
      <label><input type="radio" name="d" value="y"> Yes</label><label><input type="radio" name="d" value="n"> No</label></fieldset>`)
    await A.fillForm({ ...BASE, selfId: { disability: 'maybe' } }, document)
    expect(checked()).toEqual([])
  })

  it('types a free-text answer exactly as written', async () => {
    form(`<label for="p">Pronouns</label><input id="p" type="text">`)
    await A.fillForm({ ...BASE, selfId: { pronouns: 'she/her' } }, document)
    expect((document.getElementById('p') as HTMLInputElement).value).toBe('she/her')
  })

  it('does not fill a neighbouring demographic question from an answer typed for another', async () => {
    form(`<label for="r">Religion</label><input id="r" type="text"><label for="g">Gender</label><input id="g" type="text">`)
    await A.fillForm({ ...BASE, selfId: { gender: 'Female' } }, document)
    expect((document.getElementById('r') as HTMLInputElement).value).toBe('')
    expect((document.getElementById('g') as HTMLInputElement).value).toBe('Female')
  })
})
