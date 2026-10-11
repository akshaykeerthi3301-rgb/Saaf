// The account wall, end to end: the person saves ONE password once; after that it is one click. Test password only.
import { patchedExtension, launch } from './lib.mjs'
import { serve } from './mockjob.mjs'
const TEST_PW = 'E2e-Test-Pass-9876!'
const srv = serve(4100)
const { context, sw } = await launch(patchedExtension())
const log = (...a) => console.log(...a)
let fails = 0
const check = (label, ok, extra = '') => { log(ok ? 'PASS' : 'FAIL', label, extra); if (!ok) fails++ }
// Nothing may carry the password off the machine: watch every request the browser makes.
const leaked = []
context.on('request', (r) => { if ((r.postData() || '').includes(TEST_PW) || r.url().includes(encodeURIComponent(TEST_PW))) leaked.push(r.url()) })

const login = await context.newPage()
await login.goto('http://localhost:3000/api/dev-signin'); await login.waitForTimeout(6000)
const wall = (p, sel) => p.evaluate((sel) => (document.querySelector('#saaf-overlay-host')?.shadowRoot?.querySelector(sel)?.innerText ?? '').replace(/\s+/g, ' ').trim(), sel)
const click = (p, sel) => p.evaluate((sel) => document.querySelector('#saaf-overlay-host').shadowRoot.querySelector(sel).click(), sel)
const open = async (path) => { const p = await context.newPage(); await p.goto('http://localhost:4100' + path); await p.waitForSelector('#saaf-overlay-host', { state: 'attached', timeout: 20000 }); await p.waitForTimeout(4500); return p }
const vals = (p) => p.evaluate(() => ({ e: se?.value, p1: sp?.value, p2: sc?.value, agree: window.agree?.checked ?? null, outline: window.agree?.style.outline || '' }))

// ---- 1: the first time — no password saved yet, so the panel asks for one
let a = await open('/signup')
log('1  panel asks :', (await wall(a, '#wall')).slice(0, 90))
check('asks for a password the first time', /Set one password/.test(await wall(a, '#wall')))
await a.evaluate((pw) => { const i = document.querySelector('#saaf-overlay-host').shadowRoot.querySelector('#wallpw'); i.value = pw }, 'weak')
await click(a, '#wallgo'); await a.waitForTimeout(600)
check('refuses a weak password, says why', /10 characters/.test(await wall(a, '#wallnote')), await wall(a, '#wallnote'))
check('weak password was not saved', !(await sw.evaluate(async () => (await chrome.storage.local.get('accountPassword')).accountPassword)))
await a.evaluate((pw) => { document.querySelector('#saaf-overlay-host').shadowRoot.querySelector('#wallpw').value = pw }, TEST_PW)
await click(a, '#wallgo'); await a.waitForTimeout(1800)
let v = await vals(a)
log('1  after click:', JSON.stringify({ ...v, p1: v.p1 ? '(filled)' : '', p2: v.p2 ? '(filled)' : '' }), '| url', new URL(a.url()).pathname)
check('email + password + confirm filled', !!v.e && v.p1 === TEST_PW && v.p2 === TEST_PW)
check('the agreement box was NOT ticked for the person', v.agree === false)
check('…it is outlined and nothing was pressed', v.outline !== '' && new URL(a.url()).pathname === '/signup')
check('the panel says what is left', /Tick the site/.test(await wall(a, '#wallnote')), await wall(a, '#wallnote'))
check('saved in extension storage', (await sw.evaluate(async () => (await chrome.storage.local.get('accountPassword')).accountPassword)) === TEST_PW)
await a.check('#agree'); await click(a, '#wallgo'); await a.waitForURL('**/thanks', { timeout: 10000 }).catch(() => {})
check('after the person ticks it, the same button presses Create Account', new URL(a.url()).pathname === '/thanks')

// ---- 2: next site / next time — no question, one click
const b = await open('/signup-plain')
check('a returning person is not asked again', /Create my account/.test(await wall(b, '#wall')) && !/Set one password/.test(await wall(b, '#wall')), (await wall(b, '#wall')).slice(0, 80))
await click(b, '#wallgo'); await b.waitForURL('**/thanks', { timeout: 10000 }).catch(() => {})
check('ONE click: filled and Create Account pressed', new URL(b.url()).pathname === '/thanks')

// ---- 3: signing in — fills both, presses Sign in, never the Google button
const c = await open('/login')
await click(c, '#wallgo'); await c.waitForURL('**/thanks', { timeout: 10000 }).catch(() => {})
check('sign-in: one click lands on the next page', new URL(c.url()).pathname === '/thanks')

// ---- 4: Remove really removes it
const d = await open('/signup')
await click(d, '#wallremove'); await d.waitForTimeout(1200)
check('Remove deletes the saved password', !(await sw.evaluate(async () => (await chrome.storage.local.get('accountPassword')).accountPassword)) && /Set one password/.test(await wall(d, '#wall')))

check('the password never left the browser in any request', leaked.length === 0, JSON.stringify(leaked))
log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
await context.close(); srv.close()
