import { patchedExtension, launch } from './lib.mjs'
const { context } = await launch(patchedExtension())
const log = (...a) => console.log(...a)
const login = await context.newPage()
await login.goto('http://localhost:3000/api/dev-signin'); await login.waitForTimeout(6000)
const t = (page, sel) => page.evaluate((sel) => (document.querySelector('#saaf-overlay-host')?.shadowRoot?.querySelector(sel)?.innerText ?? '').replace(/\s+/g, ' ').trim(), sel)
const w = await context.newPage()
await w.goto('https://alteryx.wd108.myworkdayjobs.com/alteryxcareers/job/Bangalore-India/Customer-Success-Manager_R12112', { waitUntil: 'domcontentloaded' })
await w.waitForTimeout(12000)
log('url:', w.url().split('?')[0])
log('panel host:', (await w.locator('#saaf-overlay-host').count()) ? 'YES' : 'NO')
log('support:', await t(w, '#support'))
log('go enabled:', await w.evaluate(() => { const b = document.querySelector('#saaf-overlay-host')?.shadowRoot?.getElementById('go'); return b ? !b.disabled : null }))
log('buttons on page:', JSON.stringify(await w.evaluate(() => [...document.querySelectorAll('a,button')].filter((e) => e.offsetParent).map((e) => (e.innerText || '').trim()).filter((x) => x && x.length < 40).slice(0, 25))))
await w.screenshot({ path: 'workday-1.png' })
// press Autofill: it should press Apply, take "Apply Manually", and arrive at Workday's sign-in / create-account step
await w.evaluate(() => document.querySelector('#saaf-overlay-host').shadowRoot.getElementById('go').click())
for (let i = 0; i < 8; i++) {
  await w.waitForTimeout(3000)
  const headings = await w.evaluate(() => [...document.querySelectorAll('h1,h2,h3,[data-automation-id*="pageHeader"],[role="dialog"] h2')].map((h) => h.innerText.trim()).filter(Boolean).slice(0, 4))
  log('t+' + (i + 1) * 3 + 's  url:', w.url().split('?')[0].slice(-60), '| headings:', JSON.stringify(headings), '| wall:', (await t(w, '#wall')).slice(0, 60), '| report:', (await t(w, '#report')).slice(0, 80))
}
await w.screenshot({ path: 'workday-2.png' })
await context.close()
