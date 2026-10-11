// DRY RUN on the real Workday Create Account page: finds what the one-click step would use. Types and presses NOTHING.
import { readFileSync } from 'node:fs'
import { patchedExtension, launch } from './lib.mjs'
const { context } = await launch(patchedExtension())
const login = await context.newPage()
await login.goto('http://localhost:3000/api/dev-signin'); await login.waitForTimeout(6000)
const w = await context.newPage()
await w.goto('https://alteryx.wd108.myworkdayjobs.com/alteryxcareers/job/Bangalore-India/Customer-Success-Manager_R12112', { waitUntil: 'domcontentloaded' })
await w.waitForTimeout(12000)
await w.evaluate(() => document.querySelector('#saaf-overlay-host').shadowRoot.getElementById('go').click())
for (let i = 0; i < 8; i++) { await w.waitForTimeout(3000); if (await w.locator('input[type=password]').count()) break }
console.log('url:', w.url().split('?')[0].slice(-70), '| password boxes on page:', await w.locator('input[type=password]').count())
// Run the SAME helper the extension uses, in the page, only to look.
await w.evaluate(`(() => { window.SaafAutofill = { setNativeValue() {} }; ${readFileSync(new URL('../../extension/account.js', import.meta.url), 'utf8')} })()`)
const probe = await w.evaluate(() => {
  const K = window.SaafAccount, d = document
  const desc = (el) => el ? `${el.tagName.toLowerCase()}${el.type ? '[' + el.type + ']' : ''} role=${el.getAttribute('role') || '-'} aria=${(el.getAttribute('aria-label') || '').slice(0, 40)} text=${(el.innerText || el.value || '').trim().slice(0, 40)} auto=${el.getAttribute('data-automation-id') || '-'}` : 'NONE FOUND'
  return {
    kind: K.kind(d),
    emailBox: desc(K.emailBox(d)),
    passwordBoxes: K.passwordBoxes(d).map(desc),
    agreement: K.agreementBoxes(d).map(desc),
    button: desc(K.submitButton(d, 'signup')),
    allButtons: [...d.querySelectorAll('button,[role=button],input[type=submit]')].filter((b) => b.offsetParent).map(desc).slice(0, 8),
  }
})
console.log(JSON.stringify(probe, null, 1))
await context.close()
