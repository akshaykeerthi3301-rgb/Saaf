import { patchedExtension, launch } from './lib.mjs'
import { serve } from './mockjob.mjs'
const srv = serve(4100)
const { context, sw } = await launch(patchedExtension())
const log = (...a) => console.log(...a)
const login = await context.newPage()
await login.goto('http://localhost:3000/api/dev-signin'); await login.waitForTimeout(6000)
const t = (page, sel) => page.evaluate((sel) => (document.querySelector('#saaf-overlay-host')?.shadowRoot?.querySelector(sel)?.innerText ?? '').replace(/\s+/g, ' ').trim(), sel)
const click = (page, sel) => page.evaluate((sel) => document.querySelector('#saaf-overlay-host').shadowRoot.querySelector(sel).click(), sel)
const enabled = (page, sel) => page.evaluate((sel) => !document.querySelector('#saaf-overlay-host').shadowRoot.querySelector(sel).disabled, sel)
const values = (page) => page.evaluate(() => ({ name: document.querySelector('[name=name]')?.value, email: document.querySelector('[name=email]')?.value, file: document.querySelector('input[type=file]')?.files[0]?.name ?? null }))
const ready = async (p) => { await p.waitForSelector('#saaf-overlay-host', { state: 'attached', timeout: 20000 }); await p.waitForTimeout(4500) }

// ---- 1: a posting page with NO form; Apply is a link to the form page (same tab)
const a = await context.newPage()
await a.goto('http://localhost:4100/lever/job'); await ready(a)
log('1  support line  :', await t(a, '#support'))
log('1  Autofill button enabled with no form on the page:', await enabled(a, '#go'))
await click(a, '#go')
await a.waitForURL('**/lever/job/apply', { timeout: 20000 })
await a.waitForSelector('#saaf-overlay-host', { state: 'attached' }); await a.waitForTimeout(9000)
log('1  moved to        :', new URL(a.url()).pathname, '| filled by itself:', JSON.stringify(await values(a)))
log('1  asks to submit  :', (await t(a, '#submitbox')).slice(0, 70))
await click(a, '#submitnow'); await a.waitForURL('**/thanks*', { timeout: 30000 }); await a.waitForTimeout(6000)
log('1  after Submit    :', (await t(a, '#report')).slice(0, 70))

// ---- 2: Apply opens a NEW TAB
const b = await context.newPage()
await b.goto('http://localhost:4100/new/job'); await ready(b)
const popup = context.waitForEvent('page', { timeout: 20000 })
await click(b, '#go')
const nb = await popup
await nb.waitForTimeout(11000)
log('2  new tab opened  :', new URL(nb.url()).pathname, '| filled by itself:', JSON.stringify(await values(nb)))
log('2  asks to submit  :', (await t(nb, '#submitbox')).slice(0, 40))

// ---- 3: Apply reveals the form on the SAME page
const c = await context.newPage()
await c.goto('http://localhost:4100/spa/job'); await ready(c)
await click(c, '#go'); await c.waitForTimeout(9000)
log('3  same page filled:', JSON.stringify(await values(c)), '| asks to submit:', (await t(c, '#submitbox')).slice(0, 40))

// ---- 4: a site the built-in list does not cover: nothing shows until the icon is pressed, then it works
const d = await context.newPage()
await d.goto('http://[::1]:4100/lever/job'); await d.waitForTimeout(3500)
log('4  panel before the icon:', (await d.locator('#saaf-overlay-host').count()) ? 'YES' : 'no (as expected)')
const tab = await sw.evaluate(async () => { const [x] = await chrome.tabs.query({ url: 'http://[::1]/*' }); return x })
await sw.evaluate((x) => globalThis.__jxToggle(x), tab); await d.waitForSelector('#saaf-overlay-host', { state: 'attached', timeout: 15000 }); await d.waitForTimeout(4500)
log('4  panel after the icon :', (await t(d, '#support')).slice(0, 70), '| Autofill enabled:', await enabled(d, '#go'))
await click(d, '#go'); await d.waitForURL('**/lever/job/apply', { timeout: 20000 }); await d.waitForTimeout(11000)
log('4  carried on to page 2:', JSON.stringify(await values(d)))

// ---- 5: another job extension's panel on the right → ours docks on the LEFT
const e = await context.newPage()
await e.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const x = document.createElement('plasmo-csui'); x.id = 'jobright-helper-plugin'; document.documentElement.appendChild(x) }) })
await e.goto('http://localhost:4100/lever/job'); await ready(e); await e.waitForTimeout(2500)
log('5  side with another extension present:', await e.evaluate(() => (document.querySelector('#saaf-overlay-host').shadowRoot.getElementById('panel').classList.contains('left') ? 'LEFT' : 'right') + ' | page margins: left ' + (document.documentElement.style.marginLeft || '-') + ' / right ' + (document.documentElement.style.marginRight || '-')))
await context.close(); srv.close()
