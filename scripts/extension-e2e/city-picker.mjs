// The City type-ahead — the box that got stuck on SmartRecruiters. Whatever the picker does (slow, ignores clicks, never answers,
// throws), the right place is chosen when it can be, and when it cannot the field is skipped and the REST of the form still fills.
import { patchedExtension, launch } from './lib.mjs'
import { serve } from './mockjob.mjs'
const srv = serve(4100)
const { context, sw } = await launch(patchedExtension())
const log = (...a) => console.log(...a)
let fails = 0
const check = (label, ok, extra = '') => { log(ok ? 'PASS' : 'FAIL', label, extra); if (!ok) fails++ }
const login = await context.newPage(); await login.goto('http://localhost:3000/api/dev-signin'); await login.waitForTimeout(6000)
const T = (p, sel) => p.evaluate((sel) => (document.querySelector('#saaf-overlay-host')?.shadowRoot?.querySelector(sel)?.innerText ?? '').replace(/\s+/g, ' ').trim(), sel)

async function run(mode, setup) {
  if (setup) await sw.evaluate(setup)
  const p = await context.newPage(); await p.goto('http://localhost:4100/sr/city?mode=' + mode)
  await p.waitForSelector('#saaf-overlay-host', { state: 'attached', timeout: 20000 }); await p.waitForTimeout(4500)
  const t0 = Date.now()
  await p.evaluate(() => document.querySelector('#saaf-overlay-host').shadowRoot.getElementById('go').click())
  // finished = the button is back to a normal label (never stuck on "Autofilling…")
  let done = false
  for (let i = 0; i < 70 && !done; i++) { await p.waitForTimeout(500); done = /Autofill again|^⚡ Autofill$|Account creation/.test(await T(p, '#go')) }
  const secs = Math.round((Date.now() - t0) / 100) / 10
  const st = await p.evaluate(() => window.__st)
  return { p, st, secs, done, go: await T(p, '#go'), report: await T(p, '#report') }
}

let r = await run('normal')
check('normal: "Bengaluru" → "Bengaluru, Karnataka, India" (not "Bengaluru Rural")', r.st.city === 'Bengaluru, Karnataka, India', JSON.stringify(r.st.city))
check('normal: the fields AFTER the city were filled too', r.st.company === 'ICICI Bank' && !!r.st.email, `${r.st.company} / ${r.st.email}`)
check('normal: the panel finished', r.done, `${r.secs}s · ${r.go}`)

r = await run('slow')
check('slow server (1.6 s): still chosen', r.st.city === 'Bengaluru, Karnataka, India', JSON.stringify(r.st.city))
check('slow: rest of the form filled', !!r.st.email)

r = await run('keyboard')
check('widget ignores clicks: chosen with the keyboard instead', r.st.city === 'Bengaluru, Karnataka, India', JSON.stringify(r.st.city))

r = await run('normal', () => chrome.storage.local.get('profile').then(({ profile }) => chrome.storage.local.set({ profile: { ...profile, city: 'Bangalore' } })))
check('"Bangalore" in the profile → "Bengaluru, Karnataka, India" in the list', r.st.city === 'Bengaluru, Karnataka, India', JSON.stringify(r.st.city))

r = await run('never', () => chrome.storage.local.get('profile').then(({ profile }) => chrome.storage.local.set({ profile: { ...profile, city: 'Bengaluru' } })))
check('no list ever appears: the city is SKIPPED and cleared — not left half-typed', !r.st.city && (r.st.typed === '' || r.st.typed === undefined || r.st.typed === null || r.st.typed === ''), JSON.stringify({ city: r.st.city, typed: r.st.typed }))
check('…and the rest of the form still fills', r.st.company === 'ICICI Bank' && !!r.st.email)
check('…within a bounded time, and the panel recovers', r.done && r.secs < 25, `${r.secs}s · ${r.go}`)
check('…and says it left something for the person', /left for you|did not match/i.test(r.report), r.report.slice(0, 120))

r = await run('throws')
check('a widget that THROWS: skipped, never fatal — the rest fills', r.st.company === 'ICICI Bank' && !!r.st.email, `${r.st.company} / ${r.st.email}`)
check('…and the panel recovers (no stuck "Autofilling…")', r.done, `${r.secs}s · ${r.go}`)

log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
await context.close(); srv.close()
