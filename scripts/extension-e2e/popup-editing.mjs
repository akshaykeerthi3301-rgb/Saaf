// The editable pop-up and the cover letter, in real Chromium. Saves to the profile are STUBBED in the service worker (the
// request is recorded and answered ok), so the founder's real profile is never written; reads are real.
import { patchedExtension, launch } from './lib.mjs'
import { serve } from './mockjob.mjs'
const srv = serve(4100)
const { context, sw } = await launch(patchedExtension())
const log = (...a) => console.log(...a)
let fails = 0
const check = (label, ok, extra = '') => { log(ok ? 'PASS' : 'FAIL', label, extra); if (!ok) fails++ }
const login = await context.newPage()
await login.goto('http://localhost:3000/api/dev-signin'); await login.waitForTimeout(6000)
const SR = (p, fn, arg) => p.evaluate(({ fn, arg }) => new Function('r', 'a', fn)(document.querySelector('#saaf-overlay-host').shadowRoot, arg), { fn, arg })
const text = (p, sel) => SR(p, 'return (r.querySelector(a)?.innerText ?? "").replace(/\\s+/g," ").trim()', sel)
const click = (p, sel) => SR(p, 'r.querySelector(a).click()', sel)
const open = async (path) => { const p = await context.newPage(); await p.goto('http://localhost:4100' + path); await p.waitForSelector('#saaf-overlay-host', { state: 'attached', timeout: 20000 }); await p.waitForTimeout(4500); return p }
const store = (k) => sw.evaluate(async (k) => (await chrome.storage.local.get(k))[k] ?? null, k)
const setVal = (p, sel, v) => SR(p, 'const i=r.querySelector(a.sel); i.value=a.v; i.dispatchEvent(new Event("input",{bubbles:true})); i.dispatchEvent(new Event("change",{bubbles:true}))', { sel, v })
const tab = async (p, k) => { await SR(p, 'r.querySelector(".afm-nav button[data-k=" + a + "]").click()', k); await p.waitForTimeout(2500) }
const updateEnabled = (p) => SR(p, 'return !r.querySelector(".afm-update").disabled')

// Record every profile save, answer ok, touch nothing.
await sw.evaluate(() => {
  globalThis.__writes = []; const orig = globalThis.fetch
  globalThis.fetch = (u, o) => /\/api\/extension\/profile$/.test(String(u))
    ? (globalThis.__writes.push(JSON.parse(o.body)), Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })))
    : orig(u, o)
})
const writes = () => sw.evaluate(() => globalThis.__writes)

// ---------------- editing
const a = await open('/ez/job')
await click(a, '#info'); await a.waitForTimeout(500)
await tab(a, 'personal')
const pv = await SR(a, 'return Object.fromEntries([...r.querySelectorAll("#ed-form [data-k]")].map(i=>[i.dataset.k,i.value]))')
check('Personal loads your real details and is not saveable until you change something', pv.firstName === 'Akshay' && !(await updateEnabled(a)), JSON.stringify({ firstName: pv.firstName, city: pv.city }))
await setVal(a, '[data-k=address1]', '12 MG Road'); await a.waitForTimeout(200)
check('changing a field enables Update', await updateEnabled(a))
await click(a, '.afm-update'); await a.waitForTimeout(2500)
let w = await writes()
check('Update sends the whole Personal form through the profile gate', w.length === 1 && w[0].op === 'personal' && w[0].input.address1 === '12 MG Road' && w[0].input.firstName === 'Akshay', JSON.stringify(w[0]?.op))
check('and says Saved', /Saved\./.test(await text(a, '#ed-msg')), await text(a, '#ed-msg'))

await tab(a, 'education')
const cards = await SR(a, 'return r.querySelectorAll("[data-row]").length')
check('Education shows your corrected entries as editable cards', cards === 2 && /IIM Sambalpur/.test(await SR(a, 'return [...r.querySelectorAll("[data-k=institution]")].map(i=>i.value).join()')))
await setVal(a, '[data-row="0"] [data-k=gpa]', '8.4')
await SR(a, 'r.querySelector("[data-del=\\"1\\"]").click()')
await SR(a, 'r.querySelector("#ed-add").click()')
await setVal(a, '[data-row="0"] [data-k=institution]', 'E2E School'); await setVal(a, '[data-row="0"] [data-k=major]', 'Testing'); await setVal(a, '[data-row="0"] [data-k=qualification]', 'MBA, Testing')
await click(a, '.afm-update'); await a.waitForTimeout(3000)
w = (await writes()).slice(1)
check('Education: update first, remove next, add last', w.map((x) => `${x.op}:${x.input.index ?? '-'}`).join() === 'entry:0,deleteEntry:1,entry:-', w.map((x) => `${x.op}:${x.input.index ?? '-'}`).join())
check('the GPA and the new school went through', w[0].input.gpa === '8.4' && w[2].input.institution === 'E2E School' && w[2].input.kind === 'education')

await tab(a, 'work')
check('Work Experience shows editable cards with Job Type', (await SR(a, 'return r.querySelectorAll("[data-row]").length')) >= 1 && (await SR(a, 'return !!r.querySelector("select[data-k=employmentType]")')))

await tab(a, 'skill')
await SR(a, 'const i=r.querySelector("#sk-add"); i.value="E2E Skill"; i.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}))'); await a.waitForTimeout(300)
await click(a, '.afm-update'); await a.waitForTimeout(2500)
w = await writes()
check('Skills: a new skill is saved with the list', w.at(-1).op === 'skills' && w.at(-1).input.skills.includes('E2E Skill'))

await tab(a, 'equal')
const nq = await SR(a, 'return r.querySelectorAll(".afm-card2").length')
check('Equal Employment shows every question as tap-to-pick', nq >= 13, String(nq))
await SR(a, 'r.querySelector("[data-q=\\"s:pronouns\\"] button[data-clear]").click()'); await a.waitForTimeout(200)
const before = (await writes()).length
await click(a, '.afm-update'); await a.waitForTimeout(2500)
const after = await writes()
const gotSelf = after.slice(before).some((x) => x.op === 'selfId')
check('Update either saves, or names the starred questions still unanswered — never silently', gotSelf || /Please answer/.test(await text(a, '#ed-msg')), gotSelf ? 'saved' : await text(a, '#ed-msg'))

await tab(a, 'pref')
await setVal(a, '[data-k=expectedCtcLakhs]', '18'); await setVal(a, '[data-k=anythingElse]', 'Open to evening shifts.'); await a.waitForTimeout(200)
await click(a, '.afm-update'); await a.waitForTimeout(2500)
w = await writes()
check('"Anything else we should know?" is saved, and the pay figure is kept for autofill', w.at(-1).op === 'extras' && w.at(-1).input.anythingElse === 'Open to evening shifts.' && (await store('profile'))?.expectedCtcLakhs === '18')

// ---------------- cover letter
const b = await open('/cover/job')
check('the panel has a Cover letter row', /Cover letter/.test(await text(b, '#coverrow')) && /Generate cover letter/.test(await text(b, '#cover')))
await click(b, '#cover')
for (let i = 0; i < 30; i++) { await b.waitForTimeout(2000); if ((await SR(b, 'return r.querySelector("#cl-text").value.length')) > 80) break }
const draft = await SR(b, 'return r.querySelector("#cl-text").value')
log('draft starts:', JSON.stringify(draft.slice(0, 90)), '| note:', await text(b, '#cl-note'))
check('a letter is written from the posting and shown for editing', draft.length > 150 && !(await SR(b, 'return r.querySelector("#cl-text").disabled')))
const hasBlank = /\[[^\]\n]{1,40}\]/.test(draft)
check('a letter with a [blank] left in it cannot be used yet — and the panel names the blank', !hasBlank || (await SR(b, 'return r.querySelector("#cl-use").disabled') && /Fill in \[/.test(await text(b, '#cl-note'))), hasBlank ? await text(b, '#cl-note') : 'no blanks in this draft')
check('known blanks (role, company, name) were filled in for me', !/\[(Role|Company|Your Name|Hiring Manager)\]/.test(draft), draft.slice(0, 80).replace(/\n/g, ' '))
await SR(b, 'const t=r.querySelector("#cl-text"); t.value = t.value.replace(/\\[[^\\]\\n]{1,40}\\]/g, "my pricing project") + "\\nE2E-EDIT"; t.dispatchEvent(new Event("input",{bubbles:true}))')
check('once edited, "Use this letter" is offered', await SR(b, 'return !r.querySelector("#cl-use").disabled'))
await click(b, '#cl-use'); await b.waitForTimeout(3500)
const cf = await store('coverFor'); const entry = cf && Object.values(cf)[0]
check('the edited letter is kept for this page, with a Word file', !!entry && /E2E-EDIT/.test(entry.text) && /\.docx$/.test(entry.file?.name ?? '') && (entry.file?.base64?.length ?? 0) > 500, entry?.file?.name)
check('the row now says Ready', /Ready/.test(await text(b, '#cname')) && /Edit cover letter/.test(await text(b, '#cover')))
await click(b, '#go'); await b.waitForTimeout(10000)
const filled = await b.evaluate(() => ({ text: document.getElementById('cl').value, file: document.getElementById('clf').files[0]?.name ?? null, resume: document.querySelector('input[name=resume]')?.files[0]?.name ?? null }))
check('Autofill types the letter into the cover-letter box', /E2E-EDIT/.test(filled.text))
check('…attaches the letter file to the cover-letter upload', /Cover-Letter.*\.docx$/.test(filled.file ?? ''), String(filled.file))
check('…and the résumé to the résumé upload, not the other way round', !!filled.resume && !/Cover/.test(filled.resume), String(filled.resume))
await click(b, '#cover'); await b.waitForTimeout(800)
await click(b, '#cl-rm'); await b.waitForTimeout(500)
check('Remove forgets the letter', (await store('coverFor')) && Object.keys(await store('coverFor')).length === 0)

log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
await context.close(); srv.close()
