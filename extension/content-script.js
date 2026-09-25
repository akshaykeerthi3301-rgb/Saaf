/**
 * Saaf extension — reads the posting on screen and renders the score.
 *
 * ⚠️ IT TOUCHES THE NETWORK NEVER, AND THE PAGE'S DATA ONLY. It reads the
 * active document (extractor.js), hands the text to the service worker, and
 * draws the result. The only writes to the page are the form fills the
 * candidate asks for (autofill.js). No submitting, no navigating.
 *
 * ⚠️ THE OVERLAY LIVES IN A SHADOW ROOT, AND THAT IS NOT OPTIONAL. It renders
 * on sites with arbitrary CSS; style bleeding in either direction is both the
 * commonest cause of a broken-looking overlay and the commonest cause of a
 * store review rejection. `:host { all: initial }` resets anything inherited.
 *
 * ⚠️ EVERY STRING FROM THE PAGE OR THE SERVER IS ESCAPED BEFORE innerHTML. The
 * quote shown under the score is text read out of the host page; written raw,
 * a posting containing markup would render it inside our card, on their page.
 */
const SITE = 'https://saaf-ten.vercel.app'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** Same page, ignoring query and hash — how the tracker and this card agree a job is "this one". */
const pageKey = (u) => { try { const x = new URL(u); return x.origin + x.pathname.replace(/\/+$/, '') } catch { return u } }

const STAGE_LABEL = { saved: 'Saved', applying: 'Applying', applied: 'Applied', interviewing: 'Interviewing', offer: 'Offer', rejected: 'Rejected', closed: 'Archived' }

/**
 * The palette is copied from the app's `.dark` block in src/app/globals.css
 * (2026-09-25). An extension cannot load the app's stylesheet, so these are the
 * one place those tokens are restated — change them together. Score bands
 * follow src/lib/score-bands.ts: green from 75 (HIGH_PRECISION_MIN), amber from
 * 60, red below.
 */
const STYLE = `
  :host { all: initial }
  .card { --bg: oklch(0.21 0.006 285.885 / 0.86); --fg: oklch(0.985 0 0); --muted: oklch(0.705 0.015 286.067);
    --line: oklch(1 0 0 / 10%); --chip: oklch(0.274 0.006 286.033); --brand: oklch(0.585 0.233 277.117);
    --brand-2: oklch(0.558 0.288 302.321); --accent: oklch(0.673 0.182 276.935);
    --high: oklch(0.765 0.177 163.223); --mid: oklch(0.828 0.189 84.429); --low: oklch(0.704 0.191 22.216);
    width: 320px; box-sizing: border-box; font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: var(--fg); background: var(--bg); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px;
    box-shadow: 0 12px 40px oklch(0 0 0 / 45%), 0 0 0 1px oklch(0.585 0.233 277.117 / 18%) }
  .top { display: flex; align-items: center; justify-content: space-between; gap: 8px }
  .brand { font-weight: 700; letter-spacing: .01em; background: linear-gradient(135deg, var(--accent), var(--brand-2));
    -webkit-background-clip: text; background-clip: text; color: transparent }
  .badge { font-size: 10px; padding: 2px 8px; border-radius: 999px; background: var(--chip); color: var(--muted) }
  .x { all: unset; cursor: pointer; color: var(--muted); font-size: 14px; line-height: 1; padding: 2px 4px }
  .head { display: flex; gap: 12px; align-items: center; margin-top: 10px }
  .ring { width: 58px; height: 58px; flex: none; position: relative }
  .ring svg { transform: rotate(-90deg) }
  .ring b { position: absolute; inset: 0; display: grid; place-items: center; font-size: 17px; font-variant-numeric: tabular-nums }
  .job { min-width: 0 }
  .job .t { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
  .muted { color: var(--muted); font-size: 11px }
  .status { margin-top: 8px; font-size: 11px; color: var(--accent) }
  .comp { display: flex; justify-content: space-between; gap: 8px; margin-top: 4px; font-size: 11px; color: var(--muted) }
  .comp span:last-child { color: var(--fg); font-variant-numeric: tabular-nums }
  .kw { margin-top: 10px; font-size: 10px; line-height: 1.8 }
  .kw b { font-weight: 600; margin-right: 2px }
  .tag { display: inline-block; padding: 1px 7px; margin: 1px 3px 1px 0; border-radius: 6px; background: var(--chip); color: var(--fg) }
  .tag.have { box-shadow: inset 0 0 0 1px oklch(0.765 0.177 163.223 / 45%) }
  .tag.miss { box-shadow: inset 0 0 0 1px oklch(0.828 0.189 84.429 / 55%) }
  .q { margin-top: 10px; padding: 7px 9px; background: var(--chip); border-radius: 8px; font-size: 11px; color: var(--muted); max-height: 82px; overflow: auto }
  .actions { display: flex; gap: 8px; margin-top: 12px }
  .primary { all: unset; cursor: pointer; flex: 1; text-align: center; padding: 8px 10px; border-radius: 10px; font-weight: 600; font-size: 12px;
    color: #fff; background: linear-gradient(135deg, var(--brand), var(--brand-2)); box-shadow: 0 0 18px oklch(0.585 0.233 277.117 / 40%) }
  .primary:hover { box-shadow: 0 0 26px oklch(0.585 0.233 277.117 / 60%) }
  .ghost { all: unset; cursor: pointer; padding: 8px 10px; border-radius: 10px; font-size: 12px; color: var(--fg); background: var(--chip) }
  .primary[disabled], .ghost[disabled] { opacity: .55; cursor: default; box-shadow: none }
  .report { margin-top: 10px; padding-top: 9px; border-top: 1px solid var(--line); font-size: 11px }
  .report ul { margin: 4px 0 0; padding-left: 16px; color: var(--muted) }
  .report li { margin: 2px 0 }
  .report .ok { color: var(--fg) }
  a { color: var(--accent); text-decoration: none }
`

function mount() {
  const host = document.createElement('div')
  host.id = 'saaf-overlay-host'
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647'
  document.documentElement.appendChild(host)
  const root = host.attachShadow({ mode: 'open' })
  root.innerHTML = `<style>${STYLE}</style>
    <div class="card">
      <div class="top"><span class="brand">Saaf</span><span id="ats"></span><button class="x" id="close" aria-label="Close">×</button></div>
      <div id="body"><div class="muted" style="margin-top:8px">Scoring this posting…</div></div>
      <div id="status"></div>
      <div id="fill"></div>
    </div>`
  root.getElementById('close').addEventListener('click', () => host.remove())
  return root
}

function ring(score) {
  const color = score >= 75 ? 'var(--high)' : score >= 60 ? 'var(--mid)' : 'var(--low)'
  const r = 25, c = 2 * Math.PI * r, dash = (Math.max(0, Math.min(100, score)) / 100) * c
  return `<div class="ring"><svg width="58" height="58" viewBox="0 0 58 58">
    <circle cx="29" cy="29" r="${r}" fill="none" stroke="var(--chip)" stroke-width="5"/>
    <circle cx="29" cy="29" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"
      stroke-dasharray="${dash} ${c}"/></svg><b>${esc(score)}</b></div>`
}

function render(root, job, data) {
  const body = root.getElementById('body')
  if (job.atsPlatform) root.getElementById('ats').innerHTML = `<span class="badge">${esc(job.atsPlatform)}</span>`
  if (!data?.ok) {
    body.innerHTML = `<div style="margin-top:8px">${esc(data?.error ?? 'Could not score this posting.')}</div>`
    return
  }
  // ⚠️ NO COMPONENT COUNT IN THIS COPY. This path omits work mode, so it is
  // five components and not seven, and a stated number goes stale the next time
  // the scorer changes shape.
  const comps = (data.components ?? [])
    .map((c) => `<div class="comp"><span>${esc(c.label)}</span><span>${esc(c.points)}/${esc(c.max)}</span></div>`)
    .join('')
  const quote = (data.requirements ?? []).find((r) => r.sourceQuote)?.sourceQuote

  /**
   * Missing keywords. Ours come from a vocabulary mined out of our own index,
   * so a term is listed only because at least twelve distinct employers name
   * it. That is what stops it saying your résumé is missing "synergy".
   */
  const tags = (list, cls) => list.slice(0, 8).map((t) => `<span class="tag ${cls}">${esc(t)}</span>`).join('')
  const kw = []
  if (data.matched?.length) kw.push(`<div><b>You have</b> ${tags(data.matched, 'have')}</div>`)
  if (data.missing?.length) kw.push(`<div><b>Not on your résumé</b> ${tags(data.missing, 'miss')}</div>`)

  body.innerHTML = `
    <div class="head">${ring(data.total)}
      <div class="job"><div class="t">${esc(job.title || 'This posting')}</div>
        <div class="muted">${esc([job.company, job.location].filter(Boolean).join(' · ') || 'out of 100')}</div></div></div>
    ${comps}
    ${kw.length ? `<div class="kw">${kw.join('')}</div>` : ''}
    ${quote ? `<div class="q">Read from the posting: “${esc(quote.slice(0, 180))}”</div>` : ''}`
}

/**
 * Tracker state for this page, from what the web app last synced. Re-renders
 * on every storage change, so moving the card in Saaf shows here at once.
 */
async function renderStatus(root, job) {
  const { tracked = [], pendingTrack = [] } = await chrome.storage.local.get(['tracked', 'pendingTrack'])
  const key = pageKey(job.pageUrl)
  const onBoard = tracked.find((t) => pageKey(t.url) === key)
  const queued = pendingTrack.find((t) => pageKey(t.url) === key)
  const el = root.getElementById('status')
  if (onBoard) el.innerHTML = `<div class="status">On your Saaf tracker · ${esc(STAGE_LABEL[onBoard.status] ?? onBoard.status)}</div>`
  else if (queued) el.innerHTML = `<div class="status">Goes on your tracker as ${esc(STAGE_LABEL[queued.status])} next time Saaf is open · <a href="${SITE}/applications" target="_blank" rel="noopener">Open Saaf</a></div>`
  else el.innerHTML = ''
}

const queue = (job, status) => chrome.runtime.sendMessage({
  type: 'saaf:queue',
  item: { url: job.pageUrl, title: job.title || 'Untitled role', company: job.company || new URL(job.pageUrl).hostname, ats: job.atsPlatform, status },
})

/**
 * The autofill control.
 *
 * ⚠️ IT IS A BUTTON, AND IT IS NEVER AUTOMATIC. Filling a stranger's form on
 * page load is both surprising and the shape of the auto-apply behaviour this
 * product refuses. The candidate asks; we fill; they read it and press Submit
 * themselves. Nothing here submits or navigates.
 *
 * ⚠️ THE REFUSALS AND THE PICKS ARE RENDERED, NOT SWALLOWED. A filler that
 * silently leaves gaps looks broken; one that silently picks a dropdown option
 * is worse. Every choice made is listed for the candidate to check.
 */
function mountActions(root, job) {
  const doc = document
  const wrap = root.getElementById('fill')
  /**
   * ⚠️ THE FORM OFTEN ARRIVES AFTER THE CARD. Greenhouse renders the
   * application below the description, Lever puts it on a separate /apply URL,
   * and several ATS front ends mount it client-side a beat later. So the fill
   * button appears when a form does, and the observer stops after 15 s — one
   * left running for the life of the tab is a cost every page pays forever.
   */
  const FORM_SELECTOR = 'input[type="email"], input[type="tel"], input[type="file"], form input[type="text"], form select'
  wrap.innerHTML = `<div class="actions"><button class="ghost" id="save">Save to tracker</button></div>`
  root.getElementById('save').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true
    await queue(job, 'saved')
  })

  const addFill = () => {
    if (root.getElementById('go')) return
    const btn = doc.createElement('button')
    btn.className = 'primary'
    btn.id = 'go'
    btn.textContent = '⚡ Fill this application'
    wrap.querySelector('.actions').prepend(btn)
    btn.addEventListener('click', async () => {
      btn.disabled = true
      btn.textContent = 'Filling…'
      const { profile, resumeFile } = await chrome.storage.local.get(['profile', 'resumeFile'])
      if (!profile || !profile.fullName) {
        wrap.insertAdjacentHTML('beforeend', '<div class="report">Add your details in the Saaf extension first — or open Saaf once while signed in and they sync.</div>')
        btn.textContent = '⚡ Fill this application'
        btn.disabled = false
        return
      }
      const res = await globalThis.SaafAutofill.fillForm(profile, doc, { resumeFile })
      const how = { typed: 'Typed', chose: 'Chose', ticked: 'Ticked', attached: 'Attached' }
      const picks = res.filled.map((f) => `<li class="ok">${how[f.how] ?? 'Filled'}: ${esc(f.value)}</li>`).join('')
      const left = res.refused.map((r) => `<li>${esc(r.reason)}</li>`).join('')
      root.querySelector('.report')?.remove()
      wrap.insertAdjacentHTML('beforeend', `<div class="report">
        <b>Filled ${res.filled.length} field${res.filled.length === 1 ? '' : 's'}.</b> Check them before you submit — we never do.
        ${picks ? `<ul>${picks}</ul>` : ''}
        ${left ? `<div class="muted" style="margin-top:6px">Left for you:</div><ul>${left}</ul>` : ''}</div>`)
      btn.textContent = 'Fill again'
      btn.disabled = false
      // Filling a form is the candidate applying, so the role goes on the
      // tracker as Applying. It never reaches Applied from here: we cannot see
      // whether they pressed Submit, and saying they did would be a guess.
      if (res.filled.length) await queue(job, 'applying')
    })
  }

  if (doc.querySelector(FORM_SELECTOR)) { addFill(); return }
  const obs = new MutationObserver(() => {
    if (doc.querySelector(FORM_SELECTOR)) { obs.disconnect(); addFill() }
  })
  obs.observe(doc.body, { childList: true, subtree: true })
  setTimeout(() => obs.disconnect(), 15000)
}

/**
 * "Apply for me" on this tab, when the service worker assigned it one
 * (autoapply.js holds the rules). Phases: 'fill' → (click Submit) →
 * 'await-confirm' on whatever page loads next.
 */
async function autoApplyIfAssigned() {
  const state = await chrome.runtime.sendMessage({ type: 'saaf:autoapply-state' }).catch(() => null)
  if (!state) return false
  const report = (status, reason) => chrome.runtime.sendMessage({ type: 'saaf:autoapply-result', status, reason })
  const A = globalThis.SaafAutoApply

  if (state.phase === 'await-confirm') {
    for (let i = 0; i < 20; i++) {
      if (A.confirmationSeen(document)) { await report('submitted', 'The employer’s page confirmed it'); return true }
      await new Promise((r) => setTimeout(r, 500))
    }
    await report('unconfirmed', 'Submitted, but the next page showed no confirmation — check this tab')
    return true
  }

  const { profile, resumeFile } = await chrome.storage.local.get(['profile', 'resumeFile'])
  if (!profile?.fullName) { await report('needs-you', 'Add your details in the Saaf extension first'); return true }
  const beforeSubmit = () => chrome.runtime.sendMessage({ type: 'saaf:autoapply-phase', phase: 'await-confirm' })
  let r = await A.run(document, profile, { resumeFile, beforeSubmit })
  if (r.status === 'open-form') {
    // Same-page forms appear a beat after the Apply button; a navigating one reloads this script.
    await new Promise((res) => setTimeout(res, 3000))
    r = await A.run(document, profile, { resumeFile, beforeSubmit })
    if (r.status === 'open-form') r = { status: 'needs-you', reason: 'Could not reach the application form' }
  }
  await report(r.status, r.reason)
  return true
}

;(async function run() {
  if (await autoApplyIfAssigned()) return
  const job = globalThis.SaafExtract.extractJob(document, location)
  if (job.description.length < globalThis.SaafExtract.MIN_JD_CHARS) return
  const root = mount()
  mountActions(root, job)
  renderStatus(root, job)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.tracked || changes.pendingTrack)) renderStatus(root, job)
  })
  chrome.runtime.sendMessage(
    { type: 'saaf:score', jdText: job.description, jdTitle: job.title, jdLocation: job.location },
    (data) => render(root, job, data),
  )
})()
