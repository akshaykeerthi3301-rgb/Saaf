// A form built from web components (SmartRecruiters): the extension must SEE the boxes, fill them so the page's own components hear
// it, leave the picker internals and the site's own résumé reader alone, and never touch the free-text question.
import { patchedExtension, launch } from './lib.mjs'
import { serve } from './mockjob.mjs'
const srv = serve(4100)
const { context } = await launch(patchedExtension())
const log = (...a) => console.log(...a)
let fails = 0
const check = (label, ok, extra = '') => { log(ok ? 'PASS' : 'FAIL', label, extra); if (!ok) fails++ }
const login = await context.newPage(); await login.goto('http://localhost:3000/api/dev-signin'); await login.waitForTimeout(6000)
const T = (p, sel) => p.evaluate((sel) => (document.querySelector('#saaf-overlay-host')?.shadowRoot?.querySelector(sel)?.innerText ?? '').replace(/\s+/g, ' ').trim(), sel)
const p = await context.newPage(); await p.goto('http://localhost:4100/sr/apply')
await p.waitForSelector('#saaf-overlay-host', { state: 'attached', timeout: 20000 }).catch(() => {})
await p.waitForTimeout(4500)
check('the page has NO ordinary form fields (the situation that broke it)', (await p.evaluate(() => document.querySelectorAll('input,textarea,select').length)) === 0)
check('the panel appears without the toolbar icon (a form is recognised)', (await p.locator('#saaf-overlay-host').count()) === 1)
check('the support line says Autofill is supported, and the button is enabled', /Autofill supported/.test(await T(p, '#support')) && await p.evaluate(() => !document.querySelector('#saaf-overlay-host').shadowRoot.getElementById('go').disabled), await T(p, '#support'))
await p.evaluate(() => document.querySelector('#saaf-overlay-host').shadowRoot.getElementById('go').click()); await p.waitForTimeout(9000)
const st = await p.evaluate(() => window.__st)
log('page-side state:', JSON.stringify(st))
check('first name reached the PAGE (its component heard it)', st['first-name-input'] === 'Akshay', st['first-name-input'])
check('last name reached the page', !!st['last-name-input'])
check('email and confirm-email both reached the page', !!st['email-input'] && st['email-input'] === st['confirm-email-input'], `${st['email-input']} / ${st['confirm-email-input']}`)
check('City (a type-ahead inside a component): a suggestion was CHOSEN, not just typed', /Bengaluru/.test(st.city || ''), st.city)
check('the phone went into the phone box — NOT the hidden country-search box', await p.evaluate(() => {
  const walk = (r, out) => { r.querySelectorAll('input').forEach((i) => out.push(i)); r.querySelectorAll('*').forEach((e) => e.shadowRoot && walk(e.shadowRoot, out)); return out }
  const inputs = walk(document, [])
  const search = inputs.find((i) => i.placeholder === 'Search countries'); const tel = inputs.find((i) => i.type === 'tel')
  return search.value === '' && (tel.value === '' || /\d/.test(tel.value))
}))
check('the site\'s own résumé reader (Easy Apply) was NOT fed a file', st['file:apply-with-resume-container'] === undefined)
check('the required Resume upload received the résumé', /\.docx$/i.test(st['file:resume-upload'] || ''), st['file:resume-upload'])
check('the free-text question was left for the person', st.interest === undefined || st.interest === '')
const rep = await T(p, '#report')
log('report:', rep.slice(0, 200))
check('the dashboard counts the fields', /required fields/.test(await T(p, '#dash')), (await T(p, '#dash')).slice(0, 80))
log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
await context.close(); srv.close()
