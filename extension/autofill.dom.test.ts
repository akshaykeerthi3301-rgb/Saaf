// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { createElement, useState, act } from 'react'
import { createRoot } from 'react-dom/client'
import '../extension/autofill.js'

/**
 * The form filler against a real DOM (happy-dom), for the parts a hand-rolled
 * fake cannot prove: framework state, dropdown options, radio groups, file
 * inputs and searchable pickers. Added 2026-09-25 with the Jobright-parity
 * autofill (dropdowns, choices, CTC, résumé upload).
 *
 * Every "fills" case has a matching "leaves it" case. A filler that is wrong
 * writes into a form a stranger reads.
 */
type Result = { filled: { key: string; value: string; how: string }[]; refused: { reason: string }[]; skipped: number }
type Autofill = { fillForm: (p: Record<string, string>, d: Document, o?: Record<string, unknown>) => Promise<Result> }
let A: Autofill
beforeAll(() => {
  A = (globalThis as unknown as { SaafAutofill: Autofill }).SaafAutofill
})
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
afterEach(() => { document.body.innerHTML = '' })

const PROFILE = {
  fullName: 'Priya Iyer', email: 'priya@example.com', phone: '+91 98765 43210',
  city: 'Bengaluru', currentTitle: 'Product Manager', currentEmployer: 'Paytm',
  yearsExperience: '4', noticePeriod: '30 days',
}
const form = (html: string) => { document.body.innerHTML = `<form>${html}</form>`; return document }
const $ = <T extends Element = HTMLInputElement>(sel: string) => document.querySelector(sel) as unknown as T

describe('React controlled inputs keep what we typed', () => {
  function Controlled() {
    const [v, setV] = useState('')
    return createElement('div', null,
      createElement('label', { htmlFor: 'em' }, 'Email'),
      createElement('input', { id: 'em', type: 'email', value: v, onChange: (e: { target: { value: string } }) => setV(e.target.value) }),
      createElement('output', { id: 'state' }, v))
  }

  async function mount() {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    await act(async () => { root.render(createElement(Controlled)) })
    return root
  }

  it('updates React state, so the value survives a re-render and is what submits', async () => {
    const root = await mount()
    await act(async () => { await A.fillForm(PROFILE, document) })
    expect($('#state').textContent).toBe('priya@example.com')
    expect($('#em').value).toBe('priya@example.com')
    root.unmount()
  })

  it('negative control: a plain `el.value =` looks filled but React never hears it', async () => {
    // This is the bug the native setter exists to avoid. If this test ever
    // starts passing with React state updated, the setter is no longer needed.
    const root = await mount()
    await act(async () => {
      const el = $('#em')
      el.value = 'priya@example.com'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect($('#state').textContent).toBe('')
    root.unmount()
  })
})

describe('dropdowns', () => {
  it('picks the one matching option and says which', async () => {
    form(`
      <label for="np">Notice period</label>
      <select id="np"><option value="">Select…</option><option>Immediate</option><option>15 Days</option><option>30 Days</option><option>60 Days</option></select>
      <label for="yx">Total experience</label>
      <select id="yx"><option value="">Choose</option><option>0-2 years</option><option>2-5 years</option><option>5+ years</option></select>`)
    const res = await A.fillForm(PROFILE, document)
    expect($<HTMLSelectElement>('#np').value).toBe('30 Days')
    expect($<HTMLSelectElement>('#yx').value).toBe('2-5 years')
    expect(res.filled.filter((f) => f.how === 'chose').map((f) => f.value)).toEqual(['30 Days', '2-5 years'])
  })

  it('reads an edge value into the higher bin, not both', async () => {
    form(`<label for="yx">Years of experience</label>
      <select id="yx"><option value="">Choose</option><option>3-5</option><option>5-7</option><option>7+</option></select>`)
    await A.fillForm({ ...PROFILE, yearsExperience: '5' }, document)
    expect($<HTMLSelectElement>('#yx').value).toBe('5-7')
  })

  it('reads months and "Immediate" on an Indian notice-period list', async () => {
    form(`<label for="np">Notice period</label>
      <select id="np"><option value="">Select</option><option>Immediate joiner</option><option>1 Month</option><option>2 Months</option><option>3 Months</option></select>`)
    await A.fillForm({ ...PROFILE, noticePeriod: '60 days' }, document)
    expect($<HTMLSelectElement>('#np').value).toBe('2 Months')
    form(`<label for="np">Notice period</label>
      <select id="np"><option value="">Select</option><option>Immediate joiner</option><option>1 Month</option></select>`)
    await A.fillForm({ ...PROFILE, noticePeriod: 'Immediate' }, document)
    expect($<HTMLSelectElement>('#np').value).toBe('Immediate joiner')
  })

  it('leaves an answer the candidate already chose', async () => {
    form(`<label for="c">City</label>
      <select id="c"><option value="">Select</option><option>Mumbai</option><option>Bengaluru</option></select>`)
    $<HTMLSelectElement>('#c').value = 'Mumbai'
    await A.fillForm(PROFILE, document)
    expect($<HTMLSelectElement>('#c').value).toBe('Mumbai')
  })

  it('a city with several near matches takes the closest one rather than stalling on it', async () => {
    form(`<label for="c">City</label>
      <select id="c"><option value="">Select</option><option>Bengaluru Urban</option><option>Bengaluru Rural</option></select>`)
    await A.fillForm(PROFILE, document)
    expect($<HTMLSelectElement>('#c').value).toMatch(/^Bengaluru/)
  })

  it('still refuses a demographic dropdown', async () => {
    form(`<label for="g">Gender</label><select id="g"><option value="">Select</option><option>Female</option><option>Male</option></select>`)
    await A.fillForm(PROFILE, document)
    expect($<HTMLSelectElement>('#g').value).toBe('')
  })
})

describe('yes/no radios and tick-boxes', () => {
  const authRadios = `
    <fieldset><legend>Are you legally authorised to work in India?</legend>
      <label><input type="radio" name="auth" value="1"> Yes</label>
      <label><input type="radio" name="auth" value="0"> No</label></fieldset>`

  it('answers from the candidate\'s own stored yes/no', async () => {
    form(authRadios)
    const res = await A.fillForm({ ...PROFILE, authorisedToWork: 'yes' }, document)
    expect($('input[value="1"]').checked).toBe(true)
    expect($('input[value="0"]').checked).toBe(false)
    expect(res.filled).toContainEqual({ key: 'authorisedToWork', value: 'Yes', how: 'chose' })
  })

  it('leaves it, with the reason, when they stored no answer', async () => {
    form(authRadios)
    const res = await A.fillForm({ ...PROFILE, workAuth: 'Indian citizen' }, document)
    expect($('input[value="1"]').checked).toBe(false)
    expect(res.refused.map((r) => r.reason).join()).toMatch(/add your answer/)
  })

  it('never answers a demographic radio group', async () => {
    form(`<fieldset><legend>Gender</legend>
      <label><input type="radio" name="g" value="f"> Female</label><label><input type="radio" name="g" value="m"> Male</label></fieldset>`)
    await A.fillForm(PROFILE, document)
    expect([...document.querySelectorAll('input')].some((i) => (i as HTMLInputElement).checked)).toBe(false)
  })

  it('never ticks a consent box', async () => {
    form(`<label><input type="checkbox" name="consent"> I agree to the privacy policy</label>`)
    const res = await A.fillForm(PROFILE, document)
    expect($('input').checked).toBe(false)
    expect(res.refused.map((r) => r.reason).join()).toMatch(/consent/)
  })

  it('ticks a single sponsorship box only for yes', async () => {
    const box = `<label><input type="checkbox" name="sponsor"> I will require visa sponsorship</label>`
    form(box)
    await A.fillForm({ ...PROFILE, needsSponsorship: 'no' }, document)
    expect($('input').checked).toBe(false)
    form(box)
    await A.fillForm({ ...PROFILE, needsSponsorship: 'yes' }, document)
    expect($('input').checked).toBe(true)
  })

  it('ticks each preferred location the candidate named, and no other', async () => {
    form(`<fieldset><legend>Preferred locations</legend>
      <label><input type="checkbox" name="loc" value="blr"> Bengaluru</label>
      <label><input type="checkbox" name="loc" value="pun"> Pune</label>
      <label><input type="checkbox" name="loc" value="del"> Delhi NCR</label></fieldset>`)
    await A.fillForm({ ...PROFILE, preferredLocations: 'Bengaluru, Pune' }, document)
    const ticked = [...document.querySelectorAll('input')].filter((i) => (i as HTMLInputElement).checked).map((i) => (i as HTMLInputElement).value)
    expect(ticked).toEqual(['blr', 'pun'])
  })
})

describe('salary, from their own figure', () => {
  const P = { ...PROFILE, expectedCtcLakhs: '18', currentCtcLakhs: '12.5' }

  it('writes "18 LPA" into a text box with no unit', async () => {
    form(`<label for="e">Expected CTC</label><input id="e">`)
    await A.fillForm(P, document)
    expect($('#e').value).toBe('18 LPA')
  })

  it('writes the bare lakhs figure where the box says lakhs', async () => {
    form(`<label for="e">Expected CTC (in Lakhs)</label><input id="e" type="number">
          <label for="c">Current CTC (LPA)</label><input id="c">`)
    await A.fillForm(P, document)
    expect($('#e').value).toBe('18')
    expect($('#c').value).toBe('12.5')
  })

  it('converts to rupees only where the box says rupees per annum', async () => {
    form(`<label for="e">Expected salary (INR per annum)</label><input id="e" type="number">`)
    await A.fillForm(P, document)
    expect($('#e').value).toBe('1800000')
  })

  it('leaves a bare number box, which could mean lakhs or rupees', async () => {
    form(`<label for="e">Expected salary</label><input id="e" type="number">`)
    const res = await A.fillForm(P, document)
    expect($('#e').value).toBe('')
    expect(res.refused.map((r) => r.reason).join()).toMatch(/lakhs from rupees/)
  })

  it('leaves a box in another currency', async () => {
    form(`<label for="e">Expected salary (USD)</label><input id="e">`)
    await A.fillForm(P, document)
    expect($('#e').value).toBe('')
  })

  it('leaves salary alone, with the reason, when they stored no figure', async () => {
    form(`<label for="e">Expected CTC</label><input id="e">`)
    const res = await A.fillForm(PROFILE, document)
    expect($('#e').value).toBe('')
    expect(res.refused.map((r) => r.reason).join()).toMatch(/never guess/)
  })

  it('picks a CTC range from a dropdown written in rupees', async () => {
    form(`<label for="e">Expected CTC</label><select id="e"><option value="">Select</option>
      <option>₹5,00,000 - ₹10,00,000</option><option>₹10,00,000 - ₹20,00,000</option><option>₹20,00,000+</option></select>`)
    await A.fillForm(P, document)
    expect($<HTMLSelectElement>('#e').value).toBe('₹10,00,000 - ₹20,00,000')
  })
})

describe('résumé upload', () => {
  const FILE = { name: 'Priya-Iyer.pdf', type: 'application/pdf', base64: btoa('%PDF-1.4 test') }

  it('attaches the stored résumé to a résumé upload', async () => {
    form(`<label for="r">Resume/CV</label><input id="r" type="file" accept=".pdf,.doc,.docx">`)
    const res = await A.fillForm(PROFILE, document, { resumeFile: FILE })
    expect($('#r').files?.[0]?.name).toBe('Priya-Iyer.pdf')
    expect(res.filled).toContainEqual({ key: 'resume', value: 'Priya-Iyer.pdf', how: 'attached' })
  })

  it('never attaches it to a cover-letter upload', async () => {
    form(`<label for="c">Cover letter</label><input id="c" type="file">`)
    await A.fillForm(PROFILE, document, { resumeFile: FILE })
    expect($('#c').files?.length ?? 0).toBe(0)
  })

  it('respects an upload that does not accept PDFs', async () => {
    form(`<label for="r">Resume</label><input id="r" type="file" accept=".docx">`)
    const res = await A.fillForm(PROFILE, document, { resumeFile: FILE })
    expect($('#r').files?.length ?? 0).toBe(0)
    expect(res.refused.map((r) => r.reason).join()).toMatch(/file type/)
  })

  it('says so when no résumé file is stored', async () => {
    form(`<label for="r">Resume</label><input id="r" type="file">`)
    const res = await A.fillForm(PROFILE, document)
    expect(res.refused.map((r) => r.reason).join()).toMatch(/add your résumé PDF/)
  })
})

describe('searchable pickers', () => {
  /** A minimal React-Select-shaped picker: typing shows options; clicking one commits it. */
  function picker(options: string[]) {
    form(`<label for="loc">Location</label><input id="loc" role="combobox" aria-controls="lb"><ul id="lb" role="listbox"></ul>`)
    const input = $('#loc')
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase()
      $('#lb').innerHTML = options.filter((o) => q && o.toLowerCase().includes(q))
        .map((o) => `<li role="option">${o}</li>`).join('')
      for (const li of document.querySelectorAll('[role="option"]')) {
        li.addEventListener('click', () => { input.dataset.committed = li.textContent ?? ''; input.value = li.textContent ?? ''; $('#lb').innerHTML = '' })
      }
    })
    return input
  }

  it('types, waits for the list, and clicks the one matching option', async () => {
    const input = picker(['Bengaluru, Karnataka, India', 'Mumbai, Maharashtra, India'])
    const res = await A.fillForm(PROFILE, document, { waitMs: 300 })
    expect(input.dataset.committed).toBe('Bengaluru, Karnataka, India')
    expect(res.filled).toContainEqual({ key: 'city', value: 'Bengaluru, Karnataka, India', how: 'chose' })
  }, 15000)

  it('reads a list made of role-less custom option tags and chooses from it with the keyboard (SmartRecruiters\' City)', async () => {
    form(`<label for="loc">City</label><input id="loc" role="combobox" aria-controls="lb" aria-expanded="false"><div id="lb" role="listbox"></div>`)
    const input = $('#loc')
    let active = -1, shown: string[] = []
    input.addEventListener('input', () => {
      shown = /beng/i.test(input.value) ? ['Bengaluru, Karnataka, India', 'Bengbu, Anhui, China'] : []
      $('#lb').innerHTML = shown.map((o) => `<spl-select-option>${o}</spl-select-option>`).join('') + (shown.length ? '<spl-select-option>Cannot find your city? Click here to fill in manually</spl-select-option>' : '')
      active = -1
    })
    input.addEventListener('keydown', (e) => {
      const k = (e as KeyboardEvent).key
      if (k === 'ArrowDown') active++
      else if (k === 'Enter' && active >= 0) { input.dataset.committed = shown[active]; input.value = shown[active]; $('#lb').innerHTML = ''; input.setAttribute('aria-expanded', 'false') }
    })
    const res = await A.fillForm(PROFILE, document, { waitMs: 300 })
    expect(input.dataset.committed).toBe('Bengaluru, Karnataka, India')
    expect(res.filled).toContainEqual({ key: 'city', value: 'Bengaluru, Karnataka, India', how: 'chose' })
  }, 15000)

  it('clears its typing when nothing in the list matches', async () => {
    const input = picker(['Mumbai, Maharashtra, India'])
    const res = await A.fillForm(PROFILE, document, { waitMs: 200 })
    expect(input.value).toBe('')
    expect(input.dataset.committed).toBeUndefined()
    expect(res.refused.map((r) => r.reason).join()).toMatch(/dropdown/)
  }, 20000)
})

describe('it never submits', () => {
  it('fills a whole form without clicking submit or firing submit', async () => {
    form(`<label for="n">Full name</label><input id="n">
      <fieldset><legend>Are you legally authorised to work in India?</legend>
        <label><input type="radio" name="a" value="y"> Yes</label><label><input type="radio" name="a" value="n"> No</label></fieldset>
      <button type="submit" id="go">Submit application</button>`)
    let clicked = 0, submitted = 0
    $('#go').addEventListener('click', () => { clicked++ })
    document.querySelector('form')!.addEventListener('submit', (e) => { submitted++; e.preventDefault() })
    await A.fillForm({ ...PROFILE, authorisedToWork: 'yes' }, document)
    expect($('#n').value).toBe('Priya Iyer')
    expect([clicked, submitted]).toEqual([0, 0])
  })
})
