import { patchedExtension, launch } from './lib.mjs'
import { serve } from './mockjob.mjs'
const srv = serve(4100)
const { context, sw } = await launch(patchedExtension())
const login = await context.newPage()
await login.goto('http://localhost:3000/api/dev-signin'); await login.waitForTimeout(6000)
const job = await context.newPage()
await job.goto('http://localhost:4100/job'); await job.waitForSelector('#saaf-overlay-host', { state: 'attached', timeout: 15000 }); await job.waitForTimeout(2500)
const tab = () => sw.evaluate(async () => { const [t] = await chrome.tabs.query({ url: ['http://localhost:4100/*', '*://example.com/*', '*://www.example.com/*'] }); return t })
const popup = async (id) => sw.evaluate((id) => chrome.action.getPopup({ tabId: id }), id)
const panelOpen = () => job.evaluate(() => !document.querySelector('#saaf-overlay-host').shadowRoot.getElementById('panel').hidden)
const t1 = await tab()
console.log('supported page  → popup setting:', JSON.stringify(await popup(t1.id)), '(empty = the icon toggles the panel, no drop-down)')
console.log('panel open at start:', await panelOpen())
await sw.evaluate((t) => globalThis.__jxToggle(t), t1); await job.waitForTimeout(500)
console.log('after icon click #1:', (await panelOpen()) ? 'open' : 'collapsed', '| page margin:', await job.evaluate(() => document.documentElement.style.marginRight || '(none)'))
await sw.evaluate((t) => globalThis.__jxToggle(t), t1); await job.waitForTimeout(500)
console.log('after icon click #2:', (await panelOpen()) ? 'open' : 'collapsed', '| page margin:', await job.evaluate(() => document.documentElement.style.marginRight || '(none)'))
// gear → settings page opens
const before = context.pages().length
await job.evaluate(() => document.querySelector('#saaf-overlay-host').shadowRoot.getElementById('gear').click()); await job.waitForTimeout(1500)
const opts = context.pages().find((p) => p.url().includes('options.html'))
console.log('gear opened the settings page:', !!opts, opts ? '| title: ' + (await opts.title()) : '')
// a page the panel does not run on gets the ordinary popup back
await job.goto('https://example.com/', { waitUntil: 'domcontentloaded' }); await job.waitForTimeout(1500)
const t2 = t1 // same tab, now on a site the panel does not run on
console.log('unsupported page → popup setting:', JSON.stringify(await popup(t2.id)))
await context.close(); srv.close()
