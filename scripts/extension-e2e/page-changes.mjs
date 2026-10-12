// The panel must follow the page as it changes WITHOUT a reload: a different job, an application that no longer needs an account,
// and a page that only becomes an application later. (The founder's report: it stayed stuck on "account creation".)
import { patchedExtension, launch } from './lib.mjs'
import { serve } from './mockjob.mjs'
const srv = serve(4100)
const { context, sw } = await launch(patchedExtension())
const log = (...a) => console.log(...a)
let fails = 0
const check = (label, ok, extra = '') => { log(ok ? 'PASS' : 'FAIL', label, extra); if (!ok) fails++ }
const login = await context.newPage(); await login.goto('http://localhost:3000/api/dev-signin'); await login.waitForTimeout(6000)
await sw.evaluate(() => chrome.storage.local.set({ accountPassword: 'Test-Pass-1234!', jxSettings: { pageTurn: 'manual', view: 'expanded' } })) // a saved password: the "account creation" wording is in play
const T = (p, sel) => p.evaluate((sel) => (document.querySelector('#saaf-overlay-host')?.shadowRoot?.querySelector(sel)?.innerText ?? '').replace(/\s+/g, ' ').trim(), sel)
const has = (p) => p.locator('#saaf-overlay-host').count().then((n) => n > 0)
const until = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 250)) } return false }

// ---- 1: an account page, then a different job that needs no account — same tab, no reload
const a = await context.newPage(); await a.goto('http://localhost:4100/nav/start'); await a.waitForSelector('#saaf-overlay-host', { state: 'attached', timeout: 20000 }); await a.waitForTimeout(4500)
check('on the account page: the sign-up box and "Account creation & Autofill"', /create an account/.test(await T(a, '#wall')) && /Account creation & Autofill/.test(await T(a, '#go')), (await T(a, '#go')))
await a.evaluate(() => document.getElementById('swap').click())
check('the new page: the account box is GONE within 3 seconds', await until(async () => (await T(a, '#wall')) === '', 3500), JSON.stringify(await T(a, '#wall')).slice(0, 60))
check('the button is plain "Autofill" (this page needs no account)', await until(async () => /^⚡ Autofill$/.test(await T(a, '#go')), 3000), await T(a, '#go'))
check('it recognises the application form', await until(async () => /Autofill supported/.test(await T(a, '#support')), 3000), await T(a, '#support'))
check('it is now about the NEW job (Data Analyst), not the old one', await until(async () => /Data Analyst/.test(await T(a, '#match')), 9000), (await T(a, '#match')).slice(0, 80))
check('the page address change did not leave two panels', (await a.locator('#saaf-overlay-host').count()) === 1)

// ---- 2: Autofill works on the new page (this was "stuck")
await a.evaluate(() => document.querySelector('#saaf-overlay-host').shadowRoot.getElementById('go').click()); await a.waitForTimeout(9000)
check('Autofill fills the new application', !!(await a.evaluate(() => document.getElementById('fn').value)) && !!(await a.evaluate(() => document.getElementById('em').value)))

// ---- 2b: the content changes but the ADDRESS does not (Workday's steps) — the account box must still go away
const a2 = await context.newPage(); await a2.goto('http://localhost:4100/nav/same'); await a2.waitForSelector('#saaf-overlay-host', { state: 'attached', timeout: 20000 }); await a2.waitForTimeout(4500)
check('(same address) starts on the account page', /create an account/.test(await T(a2, '#wall')))
await a2.evaluate(() => document.getElementById('swap').click())
check('(same address) the account box goes away and the button is plain Autofill', await until(async () => (await T(a2, '#wall')) === '' && /^⚡ Autofill$/.test(await T(a2, '#go')), 4500), `${JSON.stringify(await T(a2, '#wall')).slice(0, 40)} | ${await T(a2, '#go')}`)

// ---- 3: a page with no panel becomes an application later
const b = await context.newPage(); await b.goto('http://localhost:4100/nav/blank'); await b.waitForTimeout(4000)
check('a plain page: no panel', !(await has(b)))
await b.evaluate(() => document.getElementById('swap').click())
check('it becomes an application: the panel appears with no reload', await until(() => has(b), 8000))
await b.waitForTimeout(3000)
check('…and Autofill is enabled', await b.evaluate(() => { const bt = document.querySelector('#saaf-overlay-host')?.shadowRoot?.getElementById('go'); return !!bt && !bt.disabled }))

// ---- 4: the toolbar icon still toggles the panel after a rebuild
const c = await context.newPage(); await c.goto('http://localhost:4100/nav/start'); await c.waitForSelector('#saaf-overlay-host', { state: 'attached' }); await c.waitForTimeout(4500)
await c.evaluate(() => document.getElementById('swap').click()); await c.waitForTimeout(4000)
const tab = await sw.evaluate(async () => { const [x] = await chrome.tabs.query({ url: 'http://localhost/*' }); return x })
const before = await c.evaluate(() => document.querySelector('#saaf-overlay-host').shadowRoot.getElementById('panel').hidden)
await sw.evaluate(async () => { const tabs = await chrome.tabs.query({ url: 'http://localhost:4100/*' }); for (const t of tabs) if (/nav\/apply/.test(t.url)) await chrome.tabs.sendMessage(t.id, { type: 'jx:toggle' }) })
await c.waitForTimeout(500)
const after = await c.evaluate(() => document.querySelector('#saaf-overlay-host').shadowRoot.getElementById('panel').hidden)
check('the toolbar icon toggles the REBUILT panel exactly once', before === false && after === true, `${before} → ${after}`)

log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
await context.close(); srv.close()
