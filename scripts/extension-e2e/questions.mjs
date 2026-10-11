// "Questions for you": the extension asks what it cannot answer, writes the answer into the form, remembers it, and uses it next time.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { patchedExtension, launch } from './lib.mjs'
import { serve } from './mockjob.mjs'
const require = createRequire(new URL('../../package.json', import.meta.url))
const { createClient } = require('@supabase/supabase-js')
const env = Object.fromEntries(readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const bank = async () => {
  const { data } = await db.from('profiles').select('id, answer_bank').not('answer_bank', 'is', null)
  return (data ?? []).flatMap((p) => (p.answer_bank ?? []).filter((e) => /e2e[- ]test/.test(e.q)).map((e) => ({ id: p.id, ...e })))
}
const clean = async () => {
  const { data } = await db.from('profiles').select('id, answer_bank').not('answer_bank', 'is', null)
  for (const p of data ?? []) { const keep = (p.answer_bank ?? []).filter((e) => !/e2e[- ]test/.test(e.q)); if (keep.length !== p.answer_bank.length) await db.from('profiles').update({ answer_bank: keep }).eq('id', p.id) }
}
await clean()
const srv = serve(4100)
const { context } = await launch(patchedExtension())
const log = (...a) => console.log(...a)
const login = await context.newPage()
await login.goto('http://localhost:3000/api/dev-signin'); await login.waitForTimeout(6000)
const sh = (page, fn, arg) => page.evaluate(fn, arg)
const ask = (page) => sh(page, () => [...document.querySelector('#saaf-overlay-host').shadowRoot.querySelectorAll('#ask .qt')].map((n) => n.textContent.trim()))
const click = (page, sel) => sh(page, (sel) => document.querySelector('#saaf-overlay-host').shadowRoot.querySelector(sel).click(), sel)
const form = (page) => sh(page, () => ({ name: document.querySelector('[name=name]').value, why: document.querySelector('#why').value, spons: document.querySelector('[name=spons]:checked')?.value ?? null, hear: document.querySelector('#hear').value, gender: document.querySelector('[name=g]:checked')?.value ?? null }))
let fails = 0
const check = (label, ok, extra = '') => { log(ok ? 'PASS' : 'FAIL', label, extra); if (!ok) fails++ }

// ---- 1: first form. Autofill; the three questions are asked; gender is not.
const a = await context.newPage()
await a.goto('http://localhost:4100/ask/job'); await a.waitForSelector('#saaf-overlay-host', { state: 'attached', timeout: 20000 }); await a.waitForTimeout(4500)
await click(a, '#go'); await a.waitForTimeout(9000)
const q1 = await ask(a)
log('1 asked:', JSON.stringify(q1))
check('asks the 3 questions', q1.length === 3 && q1.some((q) => /why do you want/i.test(q)) && q1.some((q) => /sponsorship/i.test(q)) && q1.some((q) => /hear about/i.test(q)))
check('never asks gender', !q1.some((q) => /gender/i.test(q)))
check('name filled by itself, the rest still empty', (await form(a)).name !== '' && (await form(a)).why === '')

// answer: type the text, pick "No", pick "Referral"
await sh(a, () => { const r = document.querySelector('#saaf-overlay-host').shadowRoot; const i = r.querySelector('input[data-q]'); i.value = 'Because I like the product (e2e-test)'; })
await click(a, '[data-save]'); await a.waitForTimeout(1500)
await click(a, '[data-pick][data-n="1"]'); await a.waitForTimeout(1500)       // sponsorship → "No"
await click(a, '[data-pick][data-n="1"]'); await a.waitForTimeout(1500)       // dropdown → "Referral"
const f1 = await form(a)
log('1 form after answers:', JSON.stringify(f1))
check('text answer is in the form', /Because I like/.test(f1.why))
check('sponsorship set to No', f1.spons === 'n')
check('dropdown set to Referral', f1.hear === 'Referral')
check('list is empty now', (await ask(a)).length === 0)

// ---- 2: kept in the person's answer bank
await a.waitForTimeout(2500)
const saved = await bank()
log('2 saved in database:', JSON.stringify(saved.map((e) => [e.q.slice(0, 40), e.a.slice(0, 20), e.auto])))
check('three answers stored', saved.length === 3)
check('none is marked for Apply-for-me', saved.every((e) => e.auto === false))

// ---- 3: a second form with the same questions is filled from the saved answers
const b = await context.newPage()
await b.goto('http://localhost:4100/ask/job2'); await b.waitForSelector('#saaf-overlay-host', { state: 'attached', timeout: 20000 }); await b.waitForTimeout(4500)
await click(b, '#go'); await b.waitForTimeout(9000)
const f2 = await form(b)
log('3 second form:', JSON.stringify(f2), '| still asks:', JSON.stringify(await ask(b)))
check('sponsorship and dropdown filled from saved answers', f2.spons === 'n' && f2.hear === 'Referral')
check('saved free-text answer used too', /Because I like/.test(f2.why))
check('nothing left to ask', (await ask(b)).length === 0)

await clean()
log('cleanup — test answers left:', (await bank()).length)
log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
await context.close(); srv.close()
