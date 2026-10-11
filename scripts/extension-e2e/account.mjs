// The account wall, end to end, in the shape Jobright has: set the sign-up password ONCE (live rule list), then ONE click —
// "Account creation & Autofill". Test password only.
import { patchedExtension, launch } from './lib.mjs'
import { serve } from './mockjob.mjs'
const TEST_PW = 'E2e-Test-Pass-9876!'
const srv = serve(4100)
const { context, sw } = await launch(patchedExtension())
const log = (...a) => console.log(...a)
let fails = 0
const check = (label, ok, extra = '') => { log(ok ? 'PASS' : 'FAIL', label, extra); if (!ok) fails++ }
const leaked = []
context.on('request', (r) => { if ((r.postData() || '').includes(TEST_PW) || r.url().includes(encodeURIComponent(TEST_PW))) leaked.push(r.url()) })

const login = await context.newPage()
await login.goto('http://localhost:3000/api/dev-signin'); await login.waitForTimeout(6000)
const SR = (p, fn, arg) => p.evaluate(({ fn, arg }) => new Function('r', 'a', fn)(document.querySelector('#saaf-overlay-host').shadowRoot, arg), { fn, arg })
const text = (p, sel) => SR(p, 'return (r.querySelector(a)?.innerText ?? "").replace(/\\s+/g," ").trim()', sel)
const click = (p, sel) => SR(p, 'r.querySelector(a).click()', sel)
const typePw = (p, v) => SR(p, 'const i=r.querySelector("#su-pw"); i.value=a; i.dispatchEvent(new Event("input",{bubbles:true}))', v)
const openSignup = async (p) => { await click(p, '#info'); await p.waitForTimeout(400); await SR(p, 'r.querySelector(".afm-nav button[data-k=signup]").click()'); await p.waitForTimeout(300) }
const stored = () => sw.evaluate(async () => (await chrome.storage.local.get('accountPassword')).accountPassword ?? null)
const open = async (path) => { const p = await context.newPage(); await p.goto('http://localhost:4100' + path); await p.waitForSelector('#saaf-overlay-host', { state: 'attached', timeout: 20000 }); await p.waitForTimeout(4500); return p }
const vals = (p) => p.evaluate(() => ({ e: se?.value, p1: sp?.value, p2: sc?.value, agree: window.agree?.checked ?? null, outline: window.agree?.style.outline || '' }))
const landed = (p) => new URL(p.url()).pathname

// ---- 1: first time — the wall offers to add the password; the pop-up is Jobright's shape, with the live rule list
let a = await open('/signup')
log('1  wall      :', (await text(a, '#wall')).slice(0, 120))
check('no password yet: the wall offers to add one', /Add my sign-up password/.test(await text(a, '#wallgo')))
await click(a, '#wallgo'); await a.waitForTimeout(500)
check('the pop-up "Your Autofill information" opens on Sign-up Information', /Your Autofill information/.test(await text(a, '.afm-head')) && /Sign-up Information/.test(await text(a, '.afm-pane h3')))
check('its section list matches Jobright\'s seven sections', (await SR(a, 'return [...r.querySelectorAll(".afm-nav button")].map(b=>b.textContent).join("|")')) === 'Personal|Education|Work Experience|Skill|Equal Employment|Preference|Sign-up Information')
check('Registration Email is prefilled', /@/.test(await SR(a, 'return r.querySelector("#su-email").value')))
check('five rules shown', (await SR(a, 'return r.querySelectorAll(".afm-rules li").length')) === 5)
check('Update is disabled until there is something valid to save', await SR(a, 'return r.querySelector(".afm-update").disabled'))
await typePw(a, 'abcdefghijkl')
check('rules tick as you type (12 chars + lowercase)', (await SR(a, 'return [...r.querySelectorAll(".afm-rules li")].map(l=>l.classList.contains("ok"))')).join() === 'true,false,true,false,false')
check('a password missing rules says what is missing, and Update stays disabled', /Still needed: uppercase letter, number, special character/.test(await text(a, '#su-msg')) && (await SR(a, 'return r.querySelector(".afm-update").disabled')))
await typePw(a, TEST_PW)
check('a good password enables Update', !(await SR(a, 'return r.querySelector(".afm-update").disabled')))
check('the eye shows the password', await SR(a, 'r.querySelector(".afm-eye").click(); return r.querySelector("#su-pw").type==="text"'))
await click(a, '.afm-update'); await a.waitForTimeout(1200)
check('saved in extension storage', (await stored()) === TEST_PW)
await click(a, '.afm-x'); await a.waitForTimeout(500)
check('the wall now offers ONE click', /Create my account/.test(await text(a, '#wallgo')))
check('the main button reads "Account creation & Autofill"', /Account creation & Autofill/.test(await text(a, '#go')), await text(a, '#go'))

// ---- 2: default — the agreement box is the person's
await click(a, '#wallgo'); await a.waitForTimeout(1800)
let v = await vals(a)
check('email + password + confirm filled', !!v.e && v.p1 === TEST_PW && v.p2 === TEST_PW)
check('agreement box left UNTICKED and outlined; nothing pressed', v.agree === false && v.outline !== '' && landed(a) === '/signup')
check('the panel says what is left', /Tick the site/.test(await text(a, '#wallnote')), await text(a, '#wallnote'))
await a.check('#agree'); await click(a, '#wallgo'); await a.waitForURL('**/thanks', { timeout: 10000 }).catch(() => {})
check('after the person ticks it, the same button presses Create Account', landed(a) === '/thanks')

// ---- 3: the person opts in to "tick the agreement box for me" — truly ONE click, and never the marketing box
const b = await open('/signup')
await openSignup(b); await SR(b, 'r.querySelector("#su-agree").click()'); await b.waitForTimeout(300); await click(b, '.afm-update'); await b.waitForTimeout(800); await click(b, '.afm-x')
check('the opt-in is saved', (await sw.evaluate(async () => (await chrome.storage.local.get('accountAutoAgree')).accountAutoAgree)) === true)
await click(b, '#wallgo'); await b.waitForURL('**/thanks', { timeout: 10000 }).catch(() => {})
const flags = await b.evaluate(() => ({ agreed: localStorage.agreed, promo: localStorage.promo }))
check('ONE click: agreement ticked (by their choice), Create Account pressed', landed(b) === '/thanks' && flags.agreed === 'true', JSON.stringify(flags))
check('the marketing box was NOT ticked', flags.promo === 'false')

// ---- 4: the one big button does it from the page, too
const c = await open('/signup')
await click(c, '#go'); await c.waitForURL('**/thanks', { timeout: 10000 }).catch(() => {})
check('"Account creation & Autofill" alone creates the account', landed(c) === '/thanks')

// ---- 5: after an account is created, the NEXT page (the sign-in page) is carried on automatically — no click
const clearNote = () => sw.evaluate(() => chrome.storage.local.remove(['autofillPending', 'appSession']))
await sw.evaluate(() => chrome.storage.local.set({ autofillPending: { at: Date.now() } }))
const d0 = await context.newPage(); await d0.goto('http://localhost:4100/login'); await d0.waitForURL('**/thanks', { timeout: 30000 }).catch(() => {})
check('the sign-in page that follows is carried on with NO click', landed(d0) === '/thanks')

// ---- 5b: signing in by hand — one click, never the Google button
await clearNote()
const d = await open('/login')
await click(d, '#wallgo'); await d.waitForURL('**/thanks', { timeout: 10000 }).catch(() => {})
check('sign-in: one click lands on the next page', landed(d) === '/thanks')

// ---- 6: Remove
await clearNote()
const e = await open('/signup')
await openSignup(e); await SR(e, 'r.querySelector("#su-remove").click()'); await e.waitForTimeout(800); await click(e, '.afm-x'); await e.waitForTimeout(600)
check('Remove deletes the saved password and the wall asks for one again', (await stored()) === null && /Add my sign-up password/.test(await text(e, '#wallgo')))

check('the password never left the browser in any request', leaked.length === 0, JSON.stringify(leaked))
log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
await context.close(); srv.close()
