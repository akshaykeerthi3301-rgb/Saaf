import { patchedExtension, launch } from './lib.mjs'
import { serve } from './mockjob.mjs'
const srv = serve(4100)
const { context, sw } = await launch(patchedExtension())
const log = (...a) => console.log(...a)
const login = await context.newPage()
await login.goto('http://localhost:3000/api/dev-signin'); await login.waitForTimeout(6000)
const shadow = (page) => page.evaluate(() => document.querySelector('#saaf-overlay-host')?.shadowRoot ? true : false)
const t = (page, sel) => page.evaluate((sel) => (document.querySelector('#saaf-overlay-host').shadowRoot.querySelector(sel)?.innerText ?? '').replace(/\s+/g, ' ').trim(), sel)
const click = (page, sel) => page.evaluate((sel) => document.querySelector('#saaf-overlay-host').shadowRoot.querySelector(sel).click(), sel)
const submittedHits = []
await context.route('**/WRONG-submitted*', (r) => { submittedHits.push(r.request().url()); r.fulfill({ status: 200, body: 'WRONG' }) })

// ---- A: an easy form → fills, submits, the thank-you page confirms
const a = await context.newPage()
await a.goto('http://localhost:4100/ez/job'); await a.waitForSelector('#saaf-overlay-host', { state: 'attached' }); await a.waitForTimeout(5000)
log('A  Apply button enabled:', await a.evaluate(() => !document.querySelector('#saaf-overlay-host').shadowRoot.getElementById('apply').disabled))
await click(a, '#apply'); await a.waitForTimeout(400)
log('A  confirmation text shown:', (await t(a, '#applybox')).slice(0, 90))
await click(a, '#applyyes')
await a.waitForURL('**/thanks*', { timeout: 30000 }).catch(() => {})
await a.waitForTimeout(6000)
log('A  landed on:', new URL(a.url()).pathname)
log('A  panel says:', (await t(a, '#report')).slice(0, 160))
const logRows = await sw.evaluate(async () => (await chrome.storage.local.get('autoApplyLog')).autoApplyLog?.slice(0, 1).map((l) => `${l.status}: ${l.reason}`))
log('A  worker log:', JSON.stringify(logRows))
log('A  tab still open (not closed on you):', !a.isClosed())

// ---- B: a required question it cannot answer → must stop and submit nothing
const b = await context.newPage()
await b.goto('http://localhost:4100/hard/job'); await b.waitForSelector('#saaf-overlay-host', { state: 'attached' }); await b.waitForTimeout(5000)
await click(b, '#apply'); await b.waitForTimeout(300); await click(b, '#applyyes'); await b.waitForTimeout(7000)
log('B  stayed on:', new URL(b.url()).pathname, '| submitted anything:', submittedHits.length > 0)
log('B  panel says:', (await t(b, '#report')).slice(0, 220))

// ---- (C, the account wall, moved to account.mjs)
const c = await context.newPage()
// (the account wall — create account / sign in — has its own scenario: account.mjs)
await context.close(); srv.close()
