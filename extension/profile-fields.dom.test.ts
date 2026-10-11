// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import '../extension/autofill.js'

/**
 * The profile details Jobright collects and Jobinko now holds too: middle name, address line, postal code, country, state,
 * county, phone type, the work-permit answers and the two new voluntary questions (LGBTQ+, Hispanic or Latino).
 */
type Fill = { fillForm: (p: Record<string, unknown>, d: Document, o?: Record<string, unknown>) => Promise<{ filled: { key: string; value: string }[] }>; questions: (d: Document) => { question: string }[] }
let A: Fill
beforeAll(() => { A = (globalThis as unknown as { SaafAutofill: Fill }).SaafAutofill })
afterEach(() => { document.body.innerHTML = '' })
const page = (html: string) => { document.body.innerHTML = `<form>${html}</form>`; return document }
const BASE = { fullName: 'Priya Iyer', email: 'priya@example.com', phone: '+91 98450 00000' }
const val = (sel: string) => (document.querySelector(sel) as HTMLInputElement | HTMLSelectElement).value
const radio = (name: string, v: string) => (document.querySelector(`input[name="${name}"][value="${v}"]`) as HTMLInputElement).checked

describe('the new contact details', () => {
  const FORM = `
    <label for="mn">Middle Name</label><input id="mn">
    <label for="pt">Phone Type</label><select id="pt"><option value="">Select</option><option>Home</option><option>Mobile</option><option>Work</option></select>
    <label for="a1">Address Line 1</label><input id="a1">
    <label for="a2">Address Line 2</label><input id="a2">
    <label for="co">Country/Region</label><select id="co"><option value="">Select</option><option>Australia</option><option>India</option></select>
    <label for="st">State/Province</label><input id="st">
    <label for="cy">County</label><input id="cy">
    <label for="pc">Postal Code</label><input id="pc">`
  it('fills each from the profile, and leaves Address line 2 for the person', async () => {
    page(FORM)
    await A.fillForm({ ...BASE, middleName: 'R', phoneType: 'Mobile', address: '12 MG Road', country: 'India', state: 'Karnataka', county: 'Bengaluru Urban', postalCode: '560001' }, document, { mode: 'manual' })
    expect(val('#mn')).toBe('R')
    expect(val('#pt')).toBe('Mobile')
    expect(val('#a1')).toBe('12 MG Road')
    expect(val('#a2')).toBe('')
    expect(val('#co')).toBe('India')
    expect(val('#st')).toBe('Karnataka')
    expect(val('#cy')).toBe('Bengaluru Urban')
    expect(val('#pc')).toBe('560001')
  })
  it('never types an email address into the address box', async () => {
    page('<label for="e">Email address</label><input id="e"><label for="a1">Address</label><input id="a1">')
    await A.fillForm({ ...BASE, address: '12 MG Road' }, document, { mode: 'manual' })
    expect(val('#e')).toBe('priya@example.com')
    expect(val('#a1')).toBe('12 MG Road')
  })
})

describe('work-permit answers are about India', () => {
  const Q = (legend: string, name: string) => `<fieldset><legend>${legend} *</legend><label><input type="radio" name="${name}" value="y" required> Yes</label><label><input type="radio" name="${name}" value="n"> No</label></fieldset>`
  it('answers a question that names India — or no country — from the profile', async () => {
    page(Q('Are you legally authorised to work in India?', 'a') + Q('Will you now or in the future require sponsorship for an employment visa?', 'b') + Q('Are you willing to relocate?', 'c'))
    await A.fillForm({ ...BASE, authorisedToWork: 'yes', needsSponsorship: 'no', willingToRelocate: 'yes' }, document, { mode: 'manual' })
    expect(radio('a', 'y')).toBe(true)
    expect(radio('b', 'n')).toBe(true)
    expect(radio('c', 'y')).toBe(true)
  })
  it('does NOT give the Indian answer to a question about the US or the UK — it is asked instead', async () => {
    page(Q('Are you authorized to work in the US?', 'a') + Q('Do you need a visa sponsorship to work in the UK?', 'b'))
    await A.fillForm({ ...BASE, authorisedToWork: 'yes', needsSponsorship: 'no' }, document, { mode: 'manual' })
    expect(radio('a', 'y')).toBe(false)
    expect(radio('a', 'n')).toBe(false)
    expect(radio('b', 'n')).toBe(false)
    expect(A.questions(document).map((q) => q.question).join(' | ')).toMatch(/US.*UK/)
  })
  it('the pronoun "us" is not a country', async () => {
    page(Q('Are you legally authorised to work with us?', 'a'))
    await A.fillForm({ ...BASE, authorisedToWork: 'yes' }, document, { mode: 'manual' })
    expect(radio('a', 'y')).toBe(true)
  })
})

describe('the two new voluntary questions', () => {
  const Q = (legend: string, name: string) => `<fieldset><legend>${legend} *</legend><label><input type="radio" name="${name}" value="y" required> Yes</label><label><input type="radio" name="${name}" value="n"> No</label><label><input type="radio" name="${name}" value="d"> Decline to state</label></fieldset>`
  it('are filled only from the person’s own answer', async () => {
    page(Q('Do you identify as LGBTQ+?', 'l') + Q('Are you Hispanic or Latino?', 'h'))
    await A.fillForm({ ...BASE, selfId: { lgbtq: 'no', hispanic: 'no' } }, document, { mode: 'manual' })
    expect(radio('l', 'n')).toBe(true)
    expect(radio('h', 'n')).toBe(true)
  })
  it('are left alone — and never asked in the panel — when the person has not answered', async () => {
    page(Q('Do you identify as LGBTQ+?', 'l') + Q('Are you Hispanic or Latino?', 'h'))
    await A.fillForm({ ...BASE, selfId: {} }, document, { mode: 'manual' })
    expect(['y', 'n', 'd'].some((v) => radio('l', v) || radio('h', v))).toBe(false)
    expect(A.questions(document)).toEqual([])
  })
})

describe('GPA, and a declined answer', () => {
  it('fills GPA from the profile', async () => {
    page('<label for="g">GPA / CGPA</label><input id="g">')
    await A.fillForm({ ...BASE, gpa: '8.4' }, document, { mode: 'manual' })
    expect(val('#g')).toBe('8.4')
  })
  it('never fills a question the person declined — the form is left for them', async () => {
    page('<fieldset><legend>What is your gender? *</legend><label><input type="radio" name="g" value="m" required> Male</label><label><input type="radio" name="g" value="f"> Female</label></fieldset>')
    await A.fillForm({ ...BASE, selfId: { gender: 'decline' } }, document, { mode: 'manual' })
    expect(radio('g', 'm') || radio('g', 'f')).toBe(false)
  })
})
