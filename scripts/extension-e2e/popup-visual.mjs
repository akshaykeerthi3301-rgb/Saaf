// LAYOUT, not behaviour: every pop-up must sit inside the screen, centred, with the page dimmed behind it — with the panel on the
// right AND on the left (the left is what you get when Jobright's panel is also on the page), at a laptop and a small size.
import { patchedExtension, launch } from './lib.mjs'
import { serve } from './mockjob.mjs'
const srv = serve(4100)
const { context } = await launch(patchedExtension())
const log = (...a) => console.log(...a)
let fails = 0
const check = (label, ok, extra = '') => { log(ok ? 'PASS' : 'FAIL', label, extra); if (!ok) fails++ }
const login = await context.newPage(); await login.goto('http://localhost:3000/api/dev-signin'); await login.waitForTimeout(6000)
const R = (p, fn, arg) => p.evaluate(({ fn, arg }) => new Function('r', 'a', fn)(document.querySelector('#saaf-overlay-host').shadowRoot, arg), { fn, arg })
const box = (p, sel) => R(p, 'const e = a ? r.querySelector(a) : null; const x = e.getBoundingClientRect(); return [Math.round(x.left), Math.round(x.top), Math.round(x.right), Math.round(x.bottom)]', sel)

async function run(label, dockLeft, size) {
  const p = await context.newPage()
  await p.setViewportSize(size)
  if (dockLeft) await p.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const x = document.createElement('plasmo-csui'); x.id = 'jobright-helper-plugin'; document.documentElement.appendChild(x) }) })
  await p.goto('http://localhost:4100/cover/job'); await p.waitForSelector('#saaf-overlay-host', { state: 'attached', timeout: 20000 }); await p.waitForTimeout(dockLeft ? 7000 : 4500)
  const left = await R(p, 'return r.getElementById("panel").classList.contains("left")')
  check(`${label}: panel is on the ${dockLeft ? 'left' : 'right'}`, left === dockLeft)
  const [W, H] = [size.width, size.height]
  const inside = async (what, cardSel) => {
    const o = await box(p, '#afm'); const c = await box(p, cardSel)
    const ok = o[0] === 0 && o[1] === 0 && o[2] === W && o[3] === H && c[0] >= 0 && c[1] >= 0 && c[2] <= W && c[3] <= H && Math.abs((c[0] + c[2]) / 2 - W / 2) <= 2
    check(`${label}: ${what} fills the screen, card inside and centred`, ok, `overlay ${o} card ${c} screen ${W}x${H}`)
  }
  const shot = async (name) => p.screenshot({ path: `shots/${label.replace(/\W+/g, '-')}-${name}.png` })
  // Your Autofill information — every tab
  await R(p, 'r.querySelector("#info").click()'); await p.waitForTimeout(600)
  for (const k of ['personal', 'education', 'work', 'skill', 'equal', 'pref', 'signup']) {
    await R(p, 'r.querySelector(".afm-nav button[data-k=" + a + "]").click()', k); await p.waitForTimeout(1800)
    if (k === 'personal' || k === 'education' || k === 'signup') { await inside(`pop-up › ${k}`, '.afm-card'); await shot(k) }
  }
  await R(p, 'r.querySelector(".afm-x").click()')
  // Résumé picker
  await R(p, 'r.querySelector("#rrow").click()'); await p.waitForTimeout(2500); await inside('résumé picker', '.afm-card'); await shot('picker'); await R(p, 'r.querySelector(".afm-x").click()')
  // Cover letter (a saved one, so no model call)
  await p.evaluate(() => 0)
  await R(p, 'r.querySelector("#cover").click()'); await p.waitForTimeout(1500); await inside('cover letter', '.afm-card'); await shot('cover')
  await R(p, 'r.querySelector(".afm-x").click()')
  // Settings
  await R(p, 'r.querySelector("#gear").click()'); await p.waitForTimeout(500)
  const s = await box(p, '#sv'); const pn = await box(p, '#panel')
  check(`${label}: settings cover exactly the panel`, Math.abs(s[0] - pn[0]) <= 2 && Math.abs(s[2] - pn[2]) <= 2 && s[1] === pn[1] && s[3] === pn[3], `settings ${s} panel ${pn}`)
  await shot('settings')
  await p.close()
}

for (const size of [{ width: 1280, height: 800 }, { width: 1000, height: 640 }]) {
  await run(`right ${size.width}x${size.height}`, false, size)
  await run(`left ${size.width}x${size.height}`, true, size)
}
log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
await context.close(); srv.close()
