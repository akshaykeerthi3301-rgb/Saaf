/**
 * Jobinko extension — the side panel on a job page: match, autofill, save, tailor.
 *
 * ⚠️ THE PANEL ACTS ON THE PERSON'S OWN ACCOUNT, AND ONLY WHEN THEY ASK. It reads the page (extractor.js), asks the
 * service worker to score it and to talk to Jobinko with the person's login, and draws the result. The only writes to
 * the host page are the form fills the person asks for (autofill.js). No submitting, no navigating.
 *
 * ⚠️ THE PANEL LIVES IN A SHADOW ROOT, AND THAT IS NOT OPTIONAL. It renders on sites with arbitrary CSS; style bleeding
 * in either direction is both the commonest cause of a broken-looking panel and of a store-review rejection.
 * `:host { all: initial }` resets anything inherited.
 *
 * ⚠️ EVERY STRING FROM THE PAGE OR THE SERVER IS ESCAPED BEFORE innerHTML. A posting containing markup would otherwise
 * render inside our panel, on their page.
 */
const SITE = 'https://jobinko.in'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** Same page, ignoring query and hash — how the tracker and this panel agree a job is "this one". */
const pageKey = (u) => { try { const x = new URL(u); return x.origin + x.pathname.replace(/\/+$/, '') } catch { return u } }

const STAGE_LABEL = { saved: 'Saved', applying: 'Applying', applied: 'Applied', interviewing: 'Interviewing', offer: 'Offer', rejected: 'Rejected', closed: 'Archived' }

/**
 * The palette is copied from the app's `.dark` block in src/app/globals.css. An extension cannot load the app's
 * stylesheet, so these are the one place those tokens are restated — change them together. Score bands follow
 * src/lib/score-bands.ts: green from 75, amber from 60, red below.
 */
const STYLE = `
  :host { all: initial }
  * { box-sizing: border-box }
  .panel { --bg: oklch(0.205 0.006 285.885); --fg: oklch(0.985 0 0); --muted: oklch(0.705 0.015 286.067);
    --line: oklch(1 0 0 / 10%); --chip: oklch(0.274 0.006 286.033); --brand: oklch(0.585 0.233 277.117);
    --brand-2: oklch(0.558 0.288 302.321); --accent: oklch(0.673 0.182 276.935);
    --high: oklch(0.765 0.177 163.223); --mid: oklch(0.828 0.189 84.429); --low: oklch(0.704 0.191 22.216);
    position: fixed; top: 0; right: 0; height: 100vh; width: 380px; max-width: 94vw; display: flex; flex-direction: column;
    font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--fg); background: var(--bg);
    border-left: 1px solid var(--line); box-shadow: -12px 0 40px oklch(0 0 0 / 40%) }
  .panel[hidden] { display: none }
  .panel.left { right: auto; left: 0; border-left: 0; border-right: 1px solid var(--line); box-shadow: 12px 0 40px oklch(0 0 0 / 40%) }
  header { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--line) }
  .brand { font-weight: 700; font-size: 15px; background: linear-gradient(135deg, var(--accent), var(--brand-2));
    -webkit-background-clip: text; background-clip: text; color: transparent }
  .badge { font-size: 10px; padding: 2px 8px; border-radius: 999px; background: var(--chip); color: var(--muted) }
  .grow { flex: 1 }
  .x { all: unset; cursor: pointer; color: var(--muted); font-size: 18px; line-height: 1; padding: 2px 6px; border-radius: 6px }
  .x:hover { background: var(--chip); color: var(--fg) }
  .scroll { flex: 1; overflow-y: auto; padding: 12px 14px 20px }
  section { margin-bottom: 12px }
  .box { background: var(--chip); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px }
  .muted { color: var(--muted); font-size: 11px }
  .bar { height: 6px; border-radius: 999px; background: var(--chip); overflow: hidden }
  .bar > i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--brand), var(--brand-2)); transition: width .3s }
  .support { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;
    background: oklch(0.765 0.177 163.223 / 14%); color: var(--high) }
  .support.off { background: var(--chip); color: var(--muted); font-weight: 500 }
  .dot { width: 8px; height: 8px; border-radius: 99px; background: currentColor; flex: none }
  .head { display: flex; gap: 12px; align-items: center }
  .ring { width: 58px; height: 58px; flex: none; position: relative }
  .ring svg { transform: rotate(-90deg) }
  .ring b { position: absolute; inset: 0; display: grid; place-items: center; font-size: 17px; font-variant-numeric: tabular-nums }
  .job { min-width: 0 }
  .job .t { font-weight: 600; font-size: 14px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical }
  .chips { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px }
  .chip { background: var(--bg); border: 1px solid var(--line); border-radius: 10px; padding: 6px 8px; text-align: center }
  .chip b { display: block; font-size: 13px; font-variant-numeric: tabular-nums }
  .chip span { font-size: 10px; color: var(--muted) }
  .kw { margin-top: 10px; font-size: 10px; line-height: 1.9 }
  .kw b { font-weight: 600; margin-right: 2px }
  .tag { display: inline-block; padding: 1px 7px; margin: 1px 3px 1px 0; border-radius: 6px; background: var(--bg); color: var(--fg) }
  .tag.have { box-shadow: inset 0 0 0 1px oklch(0.765 0.177 163.223 / 45%) }
  .tag.miss { box-shadow: inset 0 0 0 1px oklch(0.828 0.189 84.429 / 55%) }
  .btn { all: unset; box-sizing: border-box; cursor: pointer; display: block; width: 100%; text-align: center; padding: 10px 12px; border-radius: 12px; font-weight: 600; font-size: 13px; background: var(--chip); color: var(--fg); border: 1px solid var(--line) }
  .btn:hover { border-color: var(--accent) }
  .btn.primary { color: #fff; border: 0; background: linear-gradient(135deg, var(--brand), var(--brand-2)); box-shadow: 0 0 18px oklch(0.585 0.233 277.117 / 35%) }
  .btn[disabled], .btn[aria-disabled="true"] { opacity: .55; cursor: default; box-shadow: none }
  .row { display: flex; gap: 8px; margin-top: 8px }
  .row .btn { flex: 1 }
  h3 { margin: 0 0 8px; font-size: 12px; font-weight: 700; letter-spacing: .02em }
  .list { list-style: none; margin: 8px 0 0; padding: 0; max-height: 220px; overflow: auto }
  .list li { display: flex; gap: 8px; align-items: flex-start; padding: 5px 0; font-size: 12px; border-top: 1px solid var(--line); cursor: pointer }
  .list li:first-child { border-top: 0 }
  .tick { width: 16px; height: 16px; border-radius: 99px; flex: none; margin-top: 1px; display: grid; place-items: center; font-size: 10px; border: 1.5px solid var(--muted); color: transparent }
  .done .tick { background: var(--high); border-color: var(--high); color: #04130c }
  .pct { font-weight: 700; font-variant-numeric: tabular-nums }
  .report ul { margin: 4px 0 0; padding-left: 16px; color: var(--muted) }
  .report li { margin: 2px 0 }
  .report .ok { color: var(--fg) }
  .note { font-size: 11px; color: var(--muted); margin-top: 6px }
  summary { cursor: pointer; font-weight: 700; font-size: 12px }
  details.info summary { color: var(--fg) }
  a { color: var(--accent); text-decoration: none }
  .tab { all: unset; cursor: pointer; position: fixed; right: 0; top: 40%; z-index: 1; padding: 12px 8px; border-radius: 12px 0 0 12px; writing-mode: vertical-rl;
    font: 700 12px -apple-system, sans-serif; color: #fff; background: linear-gradient(135deg, oklch(0.585 0.233 277.117), oklch(0.558 0.288 302.321)); box-shadow: -4px 0 18px oklch(0 0 0 / 35%) }
  .tab[hidden] { display: none }
  .tab.left { right: auto; left: 0; border-radius: 0 12px 12px 0 }
`

function mount() {
  const host = document.createElement('div')
  host.id = 'saaf-overlay-host'
  host.style.cssText = 'all:initial;position:fixed;top:0;right:0;z-index:2147483647'
  document.documentElement.appendChild(host)
  const root = host.attachShadow({ mode: 'open' })
  root.innerHTML = `<style>${STYLE}</style>
    <button class="tab" id="tab" hidden aria-label="Open Jobinko">Jobinko</button>
    <aside class="panel" id="panel" aria-label="Jobinko">
      <header><span class="brand">Jobinko</span><span id="ats"></span><span class="grow"></span><button class="x" id="gear" aria-label="Jobinko settings" title="Settings">⚙</button><button class="x" id="collapse" aria-label="Collapse Jobinko panel" title="Collapse">›</button></header>
      <div class="scroll">
        <section id="account"></section>
        <section id="support"></section>
        <section id="wall"></section>
        <section id="match"><div class="muted">Scoring this posting…</div></section>
        <section id="actions"></section>
        <section id="tailored"></section>
        <section id="dash"></section>
        <section id="report"></section>
      </div>
    </aside>`
  const panel = root.getElementById('panel')
  const tab = root.getElementById('tab')
  /**
   * The panel makes room instead of covering the form: the page gets a margin the width of the panel while it is open and
   * gives it back when collapsed. (Narrow windows keep the panel on top: a squeezed form is worse than a covered one.)
   *
   * ⚠️ TWO JOB EXTENSIONS ON ONE PAGE FIGHT FOR THE RIGHT EDGE. The founder runs Jobright and Jobinko side by side, and a
   * second panel on the same edge covers the first. Where another job extension's panel is present, ours docks on the
   * LEFT instead. Checked at mount and again as the other panel finishes loading.
   */
  const PANEL_W = 380
  const OTHER_PANELS = 'plasmo-csui#jobright-helper-plugin, #jobright-helper-plugin, #simplify-jobs-extension, [id^="simplify"][id*="container" i]'
  let side = 'right'
  let open = true
  const apply = () => {
    const wide = window.innerWidth >= 900
    const de = document.documentElement
    de.style.transition = 'margin .2s'
    de.style.marginRight = open && wide && side === 'right' ? `${PANEL_W}px` : ''
    de.style.marginLeft = open && wide && side === 'left' ? `${PANEL_W}px` : ''
    panel.classList.toggle('left', side === 'left')
    tab.classList.toggle('left', side === 'left')
    host.style.cssText = `all:initial;position:fixed;top:0;${side}:0;z-index:2147483647`
  }
  const dock = () => { const next = document.querySelector(OTHER_PANELS) ? 'left' : 'right'; if (next !== side) { side = next; apply() } }
  const setOpen = (o) => { open = o; panel.hidden = !o; tab.hidden = o; apply() }
  apply()
  setTimeout(dock, 1500); setTimeout(dock, 4000); setTimeout(dock, 9000)
  root.getElementById('collapse').addEventListener('click', () => setOpen(false))
  tab.addEventListener('click', () => setOpen(true))
  root.getElementById('gear').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'jx:open-options' }))
  // The toolbar icon: opens the panel if it is collapsed, collapses it if it is open (service-worker.js, "The toolbar icon").
  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (msg?.type === 'jx:ping') { sendResponse({ ok: true }); return false }
    if (msg?.type !== 'jx:toggle') return false
    setOpen(panel.hidden)
    sendResponse({ ok: true })
    return false
  })
  return root
}

function ring(score) {
  const color = score >= 75 ? 'var(--high)' : score >= 60 ? 'var(--mid)' : 'var(--low)'
  const r = 25, c = 2 * Math.PI * r, dash = (Math.max(0, Math.min(100, score)) / 100) * c
  return `<div class="ring"><svg width="58" height="58" viewBox="0 0 58 58">
    <circle cx="29" cy="29" r="${r}" fill="none" stroke="var(--bg)" stroke-width="5"/>
    <circle cx="29" cy="29" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"
      stroke-dasharray="${dash} ${c}"/></svg><b>${esc(score)}</b></div>`
}

/** Who is connected: the signed-in account and the résumé that will be attached, or a way to sign in. */
function renderAccount(root, state) {
  const el = root.getElementById('account')
  if (state.signedIn === true) {
    const resume = state.resumeFile
      ? `${state.resumeFile.tailored ? 'Attaching your <b>tailored</b> résumé' : 'Attaching'} <b>${esc(state.resumeFile.name)}</b>`
      : 'No résumé on Jobinko yet — <a href="' + SITE + '/resume" target="_blank" rel="noopener">add one</a>'
    el.innerHTML = `<div class="box"><div><b>${esc(state.account?.name || state.account?.email || 'Signed in')}</b> <span class="muted">· connected</span></div><div class="muted" style="margin-top:2px">${resume}</div></div>`
  } else if (state.signedIn === false) {
    el.innerHTML = `<div class="box"><div><b>Sign in to Jobinko</b></div>
      <div class="muted" style="margin:2px 0 8px">To autofill, save jobs and attach your résumé, the extension uses your Jobinko account.</div>
      <a class="btn primary" id="signin" href="${SITE}/signin" target="_blank" rel="noopener">Sign in to Jobinko</a>
      <button class="btn" id="recheck" style="margin-top:8px">I’ve signed in — reconnect</button></div>`
    root.getElementById('recheck').addEventListener('click', () => state.reconnect())
  } else {
    el.innerHTML = `<div class="box muted">${esc(state.error || 'Connecting to your Jobinko account…')}</div>`
  }
}

function renderMatch(root, job, data) {
  const el = root.getElementById('match')
  if (job.atsPlatform) root.getElementById('ats').innerHTML = `<span class="badge">${esc(job.atsPlatform)}</span>`
  if (!data?.ok) {
    el.innerHTML = `<div class="box">${esc(data?.error ?? 'Could not score this posting.')}</div>`
    return
  }
  // ⚠️ NO COMPONENT COUNT IN THIS COPY. This path omits work mode, so it is five components and not seven, and a stated
  // number goes stale the next time the scorer changes shape.
  const chips = (data.components ?? []).slice(0, 6).map((c) => {
    const pct = c.max ? Math.round((c.points / c.max) * 100) : 0
    const color = pct >= 75 ? 'var(--high)' : pct >= 50 ? 'var(--mid)' : 'var(--low)'
    return `<div class="chip"><b style="color:${color}">${esc(c.points)}/${esc(c.max)}</b><span>${esc(c.label)}</span></div>`
  }).join('')
  /**
   * Missing keywords. Ours come from a vocabulary mined out of our own index, so a term is listed only because at least
   * twelve distinct employers name it. That is what stops it saying your résumé is missing "synergy".
   */
  const tags = (list, cls) => list.slice(0, 8).map((t) => `<span class="tag ${cls}">${esc(t)}</span>`).join('')
  const kw = []
  if (data.matched?.length) kw.push(`<div><b>You have</b> ${tags(data.matched, 'have')}</div>`)
  if (data.missing?.length) kw.push(`<div><b>Not on your résumé</b> ${tags(data.missing, 'miss')}</div>`)
  el.innerHTML = `<div class="box">
    <div class="head">${ring(data.total)}
      <div class="job"><div class="t">${esc(job.title || 'This posting')}</div>
        <div class="muted">${esc([job.company, job.location].filter(Boolean).join(' · ') || 'match out of 100')}</div></div></div>
    <div class="chips">${chips}</div>
    ${kw.length ? `<div class="kw">${kw.join('')}</div>` : ''}</div>`
}

const save = (job, status) => chrome.runtime.sendMessage({
  type: 'jx:save',
  item: { url: job.pageUrl, title: job.title || 'Untitled role', company: job.company || new URL(job.pageUrl).hostname, ats: job.atsPlatform, status },
})

/**
 * The panel's working half, laid out like the reference's: Autofill, then what it fills with ("Your autofill information"),
 * the résumé it will attach (with Tailor beside it), Save job, and — as it runs — live progress with the page's own
 * Required and Optional fields, each ticked as it is filled, collapsing to "6/6 required fields filled" when done.
 */
function mountActions(root, job, state) {
  const doc = document
  const A = globalThis.SaafAutofill
  const A2 = globalThis.SaafAutoApply
  const actions = root.getElementById('actions')
  const dash = root.getElementById('dash')
  const report = root.getElementById('report')
  const pk = pageKey(job.pageUrl)
  /**
   * ⚠️ THE FORM OFTEN ARRIVES AFTER THE PANEL. Greenhouse renders the application below the description, Lever puts it
   * on a separate /apply URL, and several ATS front ends mount it client-side a beat later. So the Autofill button
   * enables when a form does, and the observer stops after 15 s — one left running for the life of the tab is a cost
   * every page pays forever.
   */
  const FORM_SELECTOR = 'input[type="email"], input[type="tel"], input[type="file"], form input[type="text"], form select'
  const hasForm = () => !!doc.querySelector(FORM_SELECTOR)

  actions.innerHTML = `
    <button class="btn primary" id="go" disabled>⚡ Autofill</button>
    <div class="note" id="gonote"></div>
    <button class="btn" id="apply" style="margin-top:8px" disabled>Apply on this page</button>
    <div id="applybox"></div>
    <div id="submitbox"></div>
    <details class="box info" id="info" style="margin-top:10px"><summary>Your autofill information</summary><div id="infobody" class="muted"></div></details>
    <div class="box" id="resumerow" style="margin-top:8px">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b>Résumé</b><span class="muted" id="rname"></span></div>
      <button class="btn" id="tailor" style="margin-top:8px">✦ Tailor résumé for this job</button>
    </div>
    <button class="btn" id="save" style="margin-top:8px">Save job</button>
    <div class="note" id="savenote"></div>`
  const go = root.getElementById('go')
  const gonote = root.getElementById('gonote')
  const supportEl = root.getElementById('support')
  const saveBtn = root.getElementById('save')
  const saveNote = root.getElementById('savenote')
  const tailorBtn = root.getElementById('tailor')
  const tailored = root.getElementById('tailored')

  const applyBtn = root.getElementById('apply')
  const setSupport = () => {
    const form = hasForm()
    const entry = !form && !!globalThis.SaafAutoApply.findApplyEntry(doc)
    // Autofill works with a form on the page, or — new — with an Apply button it can press itself.
    go.disabled = state.running || !(form || entry)
    applyBtn.disabled = state.running || !(form || entry)
    renderWall(root, state)
    const msg = form ? `Autofill supported${job.atsPlatform ? ' · ' + esc(job.atsPlatform) : ''}`
      : entry ? 'Jobinko will press Apply for you, then fill the form'
      : 'No application form or Apply button found on this page'
    supportEl.innerHTML = `<div class="support ${form || entry ? '' : 'off'}"><span class="dot"></span>${msg}</div>`
  }
  setSupport()

  // Résumé row: which file will be attached.
  state.drawResume = () => { root.getElementById('rname').textContent = state.resumeFile ? `${state.resumeFile.tailored ? 'Tailored · ' : ''}${state.resumeFile.name}` : 'none yet' }
  state.drawResume()

  // "Your autofill information": exactly what the filler will type, so nothing is a surprise.
  const LABELS = { fullName: 'Full name', email: 'Email', phone: 'Phone', city: 'City', currentTitle: 'Current title', currentEmployer: 'Current employer', yearsExperience: 'Years of experience', noticePeriod: 'Notice period', workAuth: 'Work authorisation', linkedin: 'LinkedIn', portfolio: 'Portfolio' }
  root.getElementById('info').addEventListener('toggle', async (e) => {
    if (!e.currentTarget.open) return
    const { profile = {} } = await chrome.storage.local.get('profile')
    const rows = Object.entries(LABELS).map(([k, label]) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-top:1px solid var(--line)"><span>${label}</span><span style="color:var(--fg);text-align:right;overflow-wrap:anywhere">${esc(profile[k]) || '—'}</span></div>`).join('')
    root.getElementById('infobody').innerHTML = `<div style="margin-top:6px">${rows}</div><div class="note">Kept in this browser; synced from your Jobinko profile. <a href="${SITE}/profile" target="_blank" rel="noopener">Edit on Jobinko</a></div>`
  })

  // Save job — straight onto the tracker; falls back to a queue when signed out.
  async function showSaved() {
    const { tracked = [], pendingTrack = [] } = await chrome.storage.local.get(['tracked', 'pendingTrack'])
    const on = tracked.find((t) => pageKey(t.url) === pk)
    const queued = pendingTrack.find((t) => pageKey(t.url) === pk)
    if (on) { saveBtn.textContent = `✓ ${STAGE_LABEL[on.status] ?? on.status}`; saveNote.innerHTML = `On your Jobinko tracker · <a href="${SITE}/applications" target="_blank" rel="noopener">open it</a>` }
    else if (queued) { saveBtn.textContent = '✓ Saved'; saveNote.innerHTML = `Not signed in — it goes on your tracker next time Jobinko is open. <a href="${SITE}/applications" target="_blank" rel="noopener">Open Jobinko</a>` }
    else { saveBtn.textContent = 'Save job'; saveNote.textContent = '' }
  }
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true
    saveBtn.textContent = 'Saving…'
    const r = await save(job, 'saved').catch(() => null)
    saveBtn.disabled = false
    if (!r?.ok) { saveBtn.textContent = 'Save job'; saveNote.textContent = r?.error || 'Could not save it just now.'; return }
    await showSaved()
  })
  showSaved()
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && (changes.tracked || changes.pendingTrack)) showSaved() })

  // Tailor — rewrites your résumé for THIS posting on Jobinko (same engine and honesty guard as the website), keeps it as a
  // saved résumé, and attaches exactly that file on this application.
  function drawTailored(t) {
    if (!t) { tailored.innerHTML = ''; return }
    const sc = t.scores?.before != null && t.scores?.after != null ? `Match ${esc(t.scores.before)} → <b>${esc(t.scores.after)}</b> · ` : ''
    tailored.innerHTML = `<div class="box"><h3>Tailored résumé</h3>
      <div>${sc}${esc(t.changed ?? 0)} line${t.changed === 1 ? '' : 's'} reworded for this role</div>
      <div class="muted" style="margin-top:2px">Every line is checked against your own original; anything it could not support was left as you wrote it.</div>
      <div class="row"><a class="btn" href="${SITE}/resume/edit/${esc(t.id)}" target="_blank" rel="noopener">View &amp; edit</a><button class="btn" id="untailor">Use my main résumé</button></div>
      <div class="note">${hasForm() ? 'Press <b>Autofill again</b> to attach it to this application.' : 'It will be attached when you press Autofill.'}</div></div>`
    root.getElementById('untailor').addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ type: 'jx:untailor', pageKey: pk })
      await state.reconnect()
      drawTailored(null)
    })
  }
  state.drawTailored = drawTailored
  tailorBtn.addEventListener('click', async () => {
    tailorBtn.disabled = true
    tailorBtn.textContent = 'Tailoring… about 20 seconds'
    const r = await chrome.runtime.sendMessage({ type: 'jx:tailor', pageKey: pk, jdText: job.description, jdTitle: job.title, company: job.company }).catch(() => null)
    tailorBtn.disabled = false
    tailorBtn.textContent = '✦ Tailor résumé for this job'
    if (r?.signedIn === false) { state.signedIn = false; renderAccount(root, state); return }
    if (!r?.ok) { tailored.innerHTML = `<div class="box">${esc(r?.error || 'Could not tailor it just now.')}</div>`; return }
    state.resumeFile = r.file ? { name: r.file.name, tailored: true } : state.resumeFile
    renderAccount(root, state)
    state.drawResume()
    drawTailored(r)
  })

  // The Required and Optional lists, drawn from the page's own marks, ticked live while Autofill runs.
  const row = (i, n) => `<li class="${i.done ? 'done' : ''}" data-n="${n}"><span class="tick">✓</span><span>${esc(i.label)}</span></li>`
  let shown = []
  function drawDashboard() {
    const c = A.checklist(doc)
    shown = c.items
    if (!c.items.length) { dash.innerHTML = ''; return c }
    const counted = c.counted
    const pct = c.required ? Math.round((c.done / c.required) * 100) : 0
    const hasReq = c.items.some((i) => i.required)
    const head = state.running
      ? `<div style="display:flex;justify-content:space-between;align-items:baseline"><b>Autofilling…</b><span class="pct">${pct}%</span><button class="x" id="cancel" style="font-size:12px;text-decoration:underline">Cancel</button></div>`
      : `<div style="display:flex;justify-content:space-between;align-items:baseline"><b>${c.done}/${c.required} ${hasReq ? 'required ' : ''}fields filled</b><span class="pct">${pct}%</span></div>`
    const req = c.items.map((i, n) => [i, n]).filter(([i]) => i.required)
    const opt = c.items.map((i, n) => [i, n]).filter(([i]) => !i.required)
    const list = (title, rows) => rows.length ? `<div class="muted" style="margin-top:10px;font-weight:700">${title}</div><ul class="list">${rows.map(([i, n]) => row(i, n)).join('')}</ul>` : ''
    dash.innerHTML = `<div class="box"><h3>Application dashboard</h3>${head}<div class="bar" style="margin-top:6px"><i style="width:${pct}%"></i></div>
      <details ${state.running || !state.collapsed ? 'open' : ''} id="dlist"><summary class="muted" style="cursor:pointer;margin-top:8px">${state.running ? 'Fields' : 'Show fields'}</summary>${list('Required', req)}${list(hasReq ? 'Optional' : 'Fields', opt.length || !hasReq ? opt : [])}</details></div>`
    void counted
    dash.querySelectorAll('li').forEach((li) => li.addEventListener('click', () => {
      const el = shown[Number(li.dataset.n)]?.el
      if (!el) return
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      try { el.focus({ preventScroll: true }) } catch { /* not focusable */ }
    }))
    root.getElementById('cancel')?.addEventListener('click', () => { state.cancel = true })
    root.getElementById('dlist')?.addEventListener('toggle', (e) => { state.collapsed = !e.currentTarget.open })
    return c
  }
  const refreshDashboard = () => { if (hasForm() && !state.running) drawDashboard(); else if (!hasForm()) dash.innerHTML = '' }
  refreshDashboard()
  // The person types answers themselves too; keep the bar honest (cheap: only while a form exists).
  doc.addEventListener('input', () => { clearTimeout(refreshDashboard.t); refreshDashboard.t = setTimeout(refreshDashboard, 300) }, true)
  doc.addEventListener('change', () => { clearTimeout(refreshDashboard.t); refreshDashboard.t = setTimeout(refreshDashboard, 300) }, true)

  const submitbox = root.getElementById('submitbox')

  /** Fill the form on THIS page, with live progress, then offer the Submit step. */
  async function fillNow() {
    state.running = true; state.cancel = false; state.collapsed = false
    go.disabled = true
    go.textContent = 'Autofilling…'
    report.innerHTML = ''
    submitbox.innerHTML = ''
    // Bring the profile, answers and résumé file up to date from the account, then fill.
    const conn = await chrome.runtime.sendMessage({ type: 'jx:connect', pageKey: pk }).catch(() => null)
    if (conn) { state.signedIn = conn.signedIn; state.account = conn.account; state.resumeFile = conn.resumeFile; renderAccount(root, state); state.drawResume() }
    const { profile, resumeFile } = await chrome.storage.local.get(['profile', 'resumeFile'])
    if (!profile || !profile.fullName) {
      state.running = false
      report.innerHTML = '<div class="box report">We have no details to fill with yet. Sign in to Jobinko and finish your profile — or open Jobinko once while signed in and they sync.</div>'
      go.textContent = '⚡ Autofill'; setSupport()
      return
    }
    // Live progress: redraw the lists from the page's own state while the filler works.
    drawDashboard()
    const tick = setInterval(drawDashboard, 150)
    let res
    try {
      res = await A.fillForm(profile, doc, { resumeFile, replaceResumeNamed: state.attachedName, shouldStop: () => state.cancel })
    } finally {
      clearInterval(tick)
      state.running = false
    }
    const att = res.filled.find((f) => f.how === 'attached')
    if (att) state.attachedName = att.value
    if (res.unanswered.length) chrome.runtime.sendMessage({ type: 'saaf:questions', items: res.unanswered })
    const how = { typed: 'Typed', chose: 'Chose', ticked: 'Ticked', attached: 'Attached' }
    const picks = res.filled.map((f) => `<li class="ok">${how[f.how] ?? 'Filled'}: ${esc(f.value)}</li>`).join('')
    const left = res.refused.map((r) => `<li>${esc(r.reason)}</li>`).join('')
    report.innerHTML = `<div class="box report">
      <b>${state.cancel ? 'Stopped. ' : ''}Filled ${res.filled.length} field${res.filled.length === 1 ? '' : 's'}.</b> Check them before you submit.
      ${picks ? `<ul>${picks}</ul>` : ''}
      ${left ? `<div class="muted" style="margin-top:6px">Left for you:</div><ul>${left}</ul>` : ''}
      ${res.unanswered.length ? `<div class="muted" style="margin-top:6px">${res.unanswered.length} question${res.unanswered.length === 1 ? '' : 's'} on this form ${res.unanswered.length === 1 ? 'needs' : 'need'} your own answer. Write ${res.unanswered.length === 1 ? 'it' : 'each'} once in Jobinko → Profile → Templates, and it is filled next time it is asked.</div>` : ''}</div>`
    go.textContent = 'Autofill again'
    setSupport()
    state.collapsed = !state.cancel // like the reference: finish → collapse to the summary line
    drawDashboard()
    // Filling a form is the candidate applying, so the role goes on the tracker as Applying. It never reaches Applied
    // from here: we cannot see whether they pressed Submit, and saying they did would be a guess.
    if (res.filled.length) { await save(job, 'applying'); showSaved() }
    offerSubmit()
  }

  /**
   * After the form is filled: ask. The person reads the form and presses Submit themselves — or presses it here, which
   * runs the same checks as the one-click flow (nothing required empty, no CAPTCHA, the kill switch) and counts the
   * application as sent only when the employer's page confirms it.
   */
  function offerSubmit() {
    const submit = A2.findSubmit(doc)
    if (!submit) {
      submitbox.innerHTML = `<div class="box" style="margin-top:8px"><b>Filled.</b> <span class="muted">This step has no Submit button — press the site’s own Next or Continue, then press <b>Autofill again</b> on the next step.</span></div>`
      return
    }
    submitbox.innerHTML = `<div class="box" style="margin-top:8px"><b>Ready to submit?</b>
      <div class="muted" style="margin:4px 0 8px">Read the form first. Jobinko presses Submit only when every required answer is filled, and counts it as sent only when the employer’s page confirms it.</div>
      <div class="row"><button class="btn primary" id="submitnow">Submit application</button><button class="btn" id="submitlater">I’ll review first</button></div></div>`
    root.getElementById('submitlater').addEventListener('click', () => { submitbox.innerHTML = '' })
    root.getElementById('submitnow').addEventListener('click', async () => {
      submitbox.innerHTML = '<div class="box muted" style="margin-top:8px">Submitting… keep this tab open.</div>'
      const ok = await chrome.runtime.sendMessage({ type: 'saaf:autoapply-here', job: { url: job.pageUrl, title: job.title, company: job.company } }).catch(() => null)
      if (!ok?.ok) { submitbox.innerHTML = `<div class="box" style="margin-top:8px">${esc(ok?.error || 'Could not start.')}</div>`; return }
      const beforeSubmit = () => chrome.runtime.sendMessage({ type: 'saaf:autoapply-phase', phase: 'await-confirm' })
      const r = await A2.submitOnly(doc, { beforeSubmit }, {}).catch(() => ({ status: 'needs-you', reason: 'Something went wrong — check this page' }))
      await chrome.runtime.sendMessage({ type: 'saaf:autoapply-result', status: r.status, reason: r.reason, coverage: r.coverage }).catch(() => {})
      submitbox.innerHTML = ''
      renderApplyResult(root, { here: true, status: r.status, reason: r.reason, coverage: r.coverage })
    })
  }

  /**
   * The Autofill button. On a posting page with no form it PRESSES APPLY ITSELF first — the form may open on this page, on
   * the next page, or in a new tab — and the fill carries on wherever the form appears (the note left in storage, below).
   */
  async function startAutofill() {
    if (state.running) return
    if (!hasForm()) {
      const entry = A2.findApplyEntry(doc)
      if (!entry) { report.innerHTML = '<div class="box report">I could not find an Apply button on this page. Open the application form and press Autofill.</div>'; return }
      state.running = true; setSupport()
      go.textContent = 'Opening the application…'
      // A note for whichever page the form turns up on (this one, the next, or a new tab); it expires in 90 seconds.
      await chrome.storage.local.set({ autofillPending: { at: Date.now() } })
      entry.click()
      const appeared = await A2.waitForForm(doc, 8000)
      state.running = false
      if (!appeared) {
        // The page is navigating, or the application opened elsewhere: that page's panel takes over from the note.
        go.textContent = '⚡ Autofill'
        setSupport()
        report.innerHTML = '<div class="box report muted">Opening the application… the form will be filled as soon as it appears (on this page or in a new tab).</div>'
        return
      }
      await chrome.storage.local.remove('autofillPending')
    }
    await fillNow()
  }
  go.addEventListener('click', () => startAutofill())
  state.autofill = startAutofill
  state.hasForm = hasForm

  // Apply on this page — fills, checks, and presses Submit only when everything required is answered from the person's
  // own details. Their press is the consent for THIS application; the rules (autoapply.js) do not change: no CAPTCHAs,
  // no guessing, "applied" only when the employer's page confirms it.
  const applybox = root.getElementById('applybox')
  applyBtn.addEventListener('click', () => {
    applybox.innerHTML = `<div class="box" style="margin-top:8px"><b>Apply on this page?</b>
      <div class="muted" style="margin:4px 0 8px">Jobinko fills this form from your saved details and presses Submit — but only when every required answer is filled. It stops, and leaves the page to you, at a CAPTCHA, at a question it has no answer for, or at a required file it does not have. It counts the application as sent only when the employer’s page confirms it. Up to 25 a day.</div>
      <div class="row"><button class="btn primary" id="applyyes">Fill &amp; submit</button><button class="btn" id="applyno">Cancel</button></div></div>`
    root.getElementById('applyno').addEventListener('click', () => { applybox.innerHTML = '' })
    root.getElementById('applyyes').addEventListener('click', async () => {
      applybox.innerHTML = '<div class="box muted" style="margin-top:8px">Applying… keep this tab open.</div>'
      state.running = true; setSupport(); go.disabled = true
      // Fresh profile and résumé from the account first, then register this tab as the one application running.
      await chrome.runtime.sendMessage({ type: 'jx:connect', pageKey: pk }).catch(() => null)
      const ok = await chrome.runtime.sendMessage({ type: 'saaf:autoapply-here', job: { url: job.pageUrl, title: job.title, company: job.company } }).catch(() => null)
      if (!ok?.ok) {
        state.running = false; setSupport(); go.disabled = !hasForm()
        applybox.innerHTML = `<div class="box" style="margin-top:8px">${esc(ok?.error || 'Could not start.')}</div>`
        return
      }
      const out = await autoApplyIfAssigned()
      state.running = false; setSupport(); go.disabled = !hasForm()
      renderApplyResult(root, out)
      applybox.innerHTML = ''
      refreshDashboard()
    })
  })

  if (hasForm()) return
  const obs = new MutationObserver(() => { if (hasForm()) { setSupport(); refreshDashboard() } })
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
  if (!state) return null
  const here = !!state.here
  const report = async (status, reason, coverage) => {
    await chrome.runtime.sendMessage({ type: 'saaf:autoapply-result', status, reason, coverage })
    return { here, status, reason, coverage }
  }
  const A = globalThis.SaafAutoApply

  if (state.phase === 'await-confirm') {
    for (let i = 0; i < 20; i++) {
      if (A.confirmationSeen(document)) return report('submitted', 'The employer’s page confirmed it')
      await new Promise((r) => setTimeout(r, 500))
    }
    return report('unconfirmed', 'Submitted, but the next page showed no confirmation — check this tab')
  }

  const { profile, resumeFile } = await chrome.storage.local.get(['profile', 'resumeFile'])
  if (!profile?.fullName) return report('needs-you', 'Add your details in the Jobinko extension first')
  const beforeSubmit = () => chrome.runtime.sendMessage({ type: 'saaf:autoapply-phase', phase: 'await-confirm' })
  // A person who pressed Apply may use any answer they saved; a queued background run uses only those they marked for it.
  const mode = here ? 'manual' : 'auto'
  let r = await A.run(document, profile, { resumeFile, beforeSubmit, mode })
  if (r.status === 'open-form') {
    // Same-page forms appear a beat after the Apply button; a navigating one reloads this script.
    await new Promise((res) => setTimeout(res, 3000))
    r = await A.run(document, profile, { resumeFile, beforeSubmit, mode })
    if (r.status === 'open-form') r = { status: 'needs-you', reason: 'Could not reach the application form' }
  }
  if (r.unanswered?.length) chrome.runtime.sendMessage({ type: 'saaf:questions', items: r.unanswered })
  return report(r.status, r.reason, r.coverage)
}

/** What happened when the person pressed "Apply on this page", in plain words. */
function renderApplyResult(root, out) {
  const el = root.getElementById('report')
  if (!out) { el.innerHTML = ''; return }
  const head = { submitted: '✓ Applied', unconfirmed: 'Check this tab', 'needs-you': 'Needs you' }[out.status] ?? out.status
  const cov = out.coverage ? `<div class="muted" style="margin-top:4px">${esc(out.coverage.percent)}% of required fields answered${out.coverage.missing?.length ? ` · missing: ${esc(out.coverage.missing.slice(0, 4).join('; '))}` : ''}</div>` : ''
  el.innerHTML = `<div class="box report"><b>${esc(head)}</b><div>${esc(out.reason)}</div>${cov}${out.status === 'submitted' ? '' : '<div class="muted" style="margin-top:6px">Nothing was submitted unless it says Applied. The page is yours — finish it by hand.</div>'}</div>`
}

/**
 * The account wall (account.js): a sign-in or create-account form. The panel offers to write the person's EMAIL and leave
 * the password to the browser — it never creates, reads or stores one.
 */
function renderWall(root, state) {
  const el = root.getElementById('wall')
  const K = globalThis.SaafAccount
  const kind = K?.kind(document)
  if (!kind) { el.innerHTML = ''; return }
  el.innerHTML = `<div class="box"><h3>${kind === 'signup' ? 'This site wants you to create an account' : 'This site wants you to sign in'}</h3>
    <div class="muted">Jobinko fills your email and leaves the password to you. ${kind === 'signup' ? 'Click the password box and Chrome offers a strong one and remembers it.' : 'Click the password box and Chrome offers the one it saved.'} Jobinko never sees, makes or stores a password.</div>
    <button class="btn" id="wallemail" style="margin-top:8px">Fill my email</button><div class="note" id="wallnote"></div></div>`
  root.getElementById('wallemail').addEventListener('click', async () => {
    const { profile } = await chrome.storage.local.get('profile')
    const email = profile?.email || state.account?.email
    const note = root.getElementById('wallnote')
    if (!email) { note.textContent = 'No email on file — sign in to Jobinko first.'; return }
    const r = K.fillEmail(document, email)
    note.textContent = !r.hadEmailBox ? 'Could not find the email box on this form.' : r.filled ? 'Email filled. Now click the password box, then press the site’s own button.' : 'The email box already has something in it, so it was left alone.'
  })
}

/**
 * `run`: the page decides whether the panel shows — a posting with a description, a page with an application form, a page
 * the person just pressed Apply toward (the note in storage), the page after a Submit, or any page the toolbar icon forced.
 * Anything else stays quiet: an extension that paints on every page is one people uninstall.
 */
;(async function run() {
  if (globalThis.__jxMounted) return
  const applied = await autoApplyIfAssigned()
  if (applied && !applied.here) return
  const job = globalThis.SaafExtract.extractJob(document, location)
  const { autofillPending: pending } = await chrome.storage.local.get('autofillPending')
  const pendingFresh = !!pending && Date.now() - pending.at < 90_000
  // A confirmation page is short: when the person applied from the panel, still show the panel with what happened.
  const noPosting = job.description.length < globalThis.SaafExtract.MIN_JD_CHARS
  const formHere = globalThis.SaafAutoApply.hasForm(document)
  if (noPosting && !applied && !globalThis.__jxForce && !pendingFresh && !formHere) return
  globalThis.__jxMounted = true
  const root = mount()
  const state = {
    signedIn: null, account: null, resumeFile: null, error: '',
    async reconnect() {
      state.signedIn = null; state.error = ''; renderAccount(root, state)
      const r = await chrome.runtime.sendMessage({ type: 'jx:connect', pageKey: pageKey(job.pageUrl) }).catch(() => null)
      state.signedIn = r?.signedIn ?? null
      state.account = r?.account ?? null
      state.resumeFile = r?.resumeFile ?? null
      state.drawTailored?.(r?.tailored ?? null)
      state.drawResume?.()
      state.error = r?.error || (r ? '' : 'Could not reach Jobinko.')
      renderAccount(root, state)
    },
  }
  renderAccount(root, state)
  mountActions(root, job, state)
  if (applied) renderApplyResult(root, applied) // the page reloaded after Submit: show what the employer said
  // Connect first so the score below uses the account's current résumé.
  await state.reconnect()
  // The person pressed Autofill on the posting and the form opened here (the same tab, or a new one): carry on, no click needed.
  if (pendingFresh && !applied) {
    if (await globalThis.SaafAutoApply.waitForForm(document, 8000)) {
      await chrome.storage.local.remove('autofillPending')
      state.autofill?.()
    }
  }
  if (noPosting) { root.getElementById('match').innerHTML = ''; return }
  chrome.runtime.sendMessage(
    { type: 'saaf:score', jdText: job.description, jdTitle: job.title, jdLocation: job.location },
    (data) => renderMatch(root, job, data),
  )
})()
