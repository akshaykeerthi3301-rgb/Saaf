/**
 * Saaf extension — reads the posting on screen and renders the score.
 *
 * ⚠️ IT TOUCHES THE NETWORK NEVER, AND THE PAGE'S DATA ONLY. It reads the
 * active document, hands the text to the service worker, and draws the result.
 * No fetch, no storage, no navigation, no clicking. The extension does not act
 * on the candidate's behalf, which is the same guarantee the product makes
 * everywhere else.
 *
 * ⚠️ THE OVERLAY LIVES IN A SHADOW ROOT, AND THAT IS NOT OPTIONAL. It renders
 * on sites with arbitrary CSS; style bleeding in either direction is both the
 * commonest cause of a broken-looking overlay and the commonest cause of a
 * store review rejection.
 */
const MIN_JD_CHARS = 120

/** The posting body, per provider, falling back to the largest text block. */
function readPosting() {
  const sel = [
    '#content', '.opening', '[class*="posting"]', '[class*="job-description"]',
    '[data-automation-id="jobPostingDescription"]', 'main article', 'main',
  ]
  let best = ''
  for (const s of sel) {
    for (const el of document.querySelectorAll(s)) {
      const t = (el.innerText || '').trim()
      if (t.length > best.length) best = t
    }
  }
  if (best.length < MIN_JD_CHARS) best = (document.body.innerText || '').trim()
  return best.slice(0, 20000)
}

function readTitle() {
  const h = document.querySelector('h1, h2, [data-automation-id="jobPostingHeader"]')
  return (h?.innerText || document.title || '').trim().slice(0, 200)
}

function mount() {
  const host = document.createElement('div')
  host.id = 'saaf-overlay-host'
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647'
  document.documentElement.appendChild(host)
  const root = host.attachShadow({ mode: 'open' })
  root.innerHTML = `
    <style>
      .card{width:300px;font:13px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        background:#fff;color:#0f172a;border:1px solid #e2e8f0;border-radius:14px;
        box-shadow:0 6px 24px rgba(15,23,42,.12);padding:14px 16px}
      .row{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
      .score{font-size:26px;font-weight:600;font-variant-numeric:tabular-nums}
      .muted{color:#64748b;font-size:11px}
      .comp{display:flex;justify-content:space-between;gap:8px;margin-top:5px;font-size:11px}
      .q{margin-top:8px;padding:7px 9px;background:#f8fafc;border-radius:8px;
        font-size:11px;color:#475569;max-height:82px;overflow:auto}
      .kw{margin-top:8px;font-size:10px;line-height:1.7}
      .kw b{color:#0f172a;font-weight:600}
      .tag{display:inline-block;padding:1px 6px;margin:1px 3px 1px 0;border-radius:5px;
        background:#f1f5f9;color:#475569}
      .tag.miss{background:#fef3c7;color:#854d0e}
      .track{display:inline-block;margin-top:9px;color:#0f766e;font-weight:600;
        font-size:11px;text-decoration:none}
      button{all:unset;cursor:pointer;color:#0f766e;font-weight:600;font-size:11px;margin-top:10px}
      button:disabled{color:#94a3b8;cursor:default}
      .fill{margin-top:10px;padding-top:9px;border-top:1px solid #f1f5f9}
      .refused{margin-top:6px;font-size:10px;color:#64748b}
      .refused li{margin:2px 0}
    </style>
    <div class="card"><div class="muted">Saaf</div><div id="body">Scoring…</div></div>`
  return root
}

function render(root, data) {
  const body = root.getElementById('body')
  if (!data?.ok) {
    body.innerHTML = `<div style="margin-top:6px">${data?.error ?? 'Could not score this posting.'}</div>`
    return
  }
  // ⚠️ NO COMPONENT COUNT IN THIS COPY. This path omits work mode, so it is
  // five components and not seven, and a stated number goes stale the next time
  // the scorer changes shape.
  const comps = (data.components ?? [])
    .map((c) => `<div class="comp"><span>${c.label}</span><span>${c.points}/${c.max}</span></div>`)
    .join('')
  const quote = (data.requirements ?? []).find((r) => r.sourceQuote)?.sourceQuote

  /**
   * Missing keywords. Every tool in this category shows these; the difference
   * is that ours come from a vocabulary mined out of our own index, so a term
   * is listed only because at least twelve distinct employers name it. That is
   * what stops it saying your résumé is missing the word "synergy".
   */
  const tags = (list, cls) => list.map((t) => `<span class="tag ${cls}">${t}</span>`).join('')
  const kw = []
  if (data.matched?.length) kw.push(`<div><b>You have:</b> ${tags(data.matched, '')}</div>`)
  if (data.missing?.length) kw.push(`<div><b>Not on your résumé:</b> ${tags(data.missing, 'miss')}</div>`)

  // Track it in Saaf. A link rather than a request: the tracker is behind a
  // sign-in and the extension deliberately holds no session, so the web app
  // does the authenticated part. Nothing is sent from here.
  const track = `https://saaf-ten.vercel.app/applications?add=${encodeURIComponent(
    (document.querySelector('h1, h2')?.innerText || document.title || '').trim().slice(0, 120),
  )}&url=${encodeURIComponent(location.href)}`

  body.innerHTML = `
    <div class="row"><span class="score">${data.total}</span><span class="muted">out of 100</span></div>
    ${comps}
    ${kw.length ? `<div class="kw">${kw.join('')}</div>` : ''}
    ${quote ? `<div class="q">Read from the posting: “${quote.slice(0, 180)}”</div>` : ''}
    <a class="track" href="${track}" target="_blank" rel="noopener">Track this in Saaf →</a>`
}

/**
 * The autofill control.
 *
 * ⚠️ IT IS A BUTTON, AND IT IS NEVER AUTOMATIC. Filling a stranger's form on
 * page load is both surprising and the shape of the auto-apply behaviour this
 * product refuses. The candidate asks; we fill; they read it and press Submit
 * themselves. Nothing here clicks, submits or navigates.
 *
 * ⚠️ THE REFUSALS ARE RENDERED, NOT SWALLOWED. A filler that silently leaves
 * gaps looks broken. One that says "salary — yours to set" is making the
 * argument the rest of the product makes.
 */
function mountAutofill(root) {
  const doc = document
  /**
   * ⚠️ THE FORM OFTEN ARRIVES AFTER THE CARD, AND THE FIRST VERSION GAVE UP.
   * Greenhouse renders the application below the description, Lever puts it on
   * a separate /apply URL, and several ATS front ends mount it client-side a
   * beat later. A one-shot check at document_idle therefore found nothing on
   * exactly the pages where filling matters, and the button silently never
   * appeared. This waits, briefly and then stops — an observer left running for
   * the life of the tab is a cost every page pays forever.
   */
  const FORM_SELECTOR = 'input[type="email"], input[type="tel"], form input[type="text"]'
  if (!doc.querySelector(FORM_SELECTOR)) {
    const obs = new MutationObserver(() => {
      if (doc.querySelector(FORM_SELECTOR)) { obs.disconnect(); mountAutofill(root) }
    })
    obs.observe(doc.body, { childList: true, subtree: true })
    setTimeout(() => obs.disconnect(), 15000)
    return
  }
  if (root.querySelector('.fill')) return

  const wrap = doc.createElement('div')
  wrap.className = 'fill'
  const btn = doc.createElement('button')
  btn.textContent = 'Fill what we can →'
  wrap.appendChild(btn)
  root.querySelector('.card').appendChild(wrap)

  btn.addEventListener('click', async () => {
    btn.disabled = true
    const { profile } = await chrome.storage.local.get('profile')
    if (!profile || !profile.fullName) {
      wrap.innerHTML = '<div class="refused">Add your details in the Saaf extension first.</div>'
      return
    }
    const res = globalThis.SaafAutofill.fillForm(profile, doc)
    const refusedList = res.refused.length
      ? `<div class="refused">Left for you:<ul>${res.refused.map((r) => `<li>${r.reason}</li>`).join('')}</ul></div>`
      : ''
    wrap.innerHTML =
      `<div class="refused"><b>Filled ${res.filled.length} field${res.filled.length === 1 ? '' : 's'}.</b> ` +
      `Check them before you submit — we never do.</div>${refusedList}`
  })
}

;(function run() {
  const jdText = readPosting()
  if (jdText.length < MIN_JD_CHARS) return
  const root = mount()
  chrome.runtime.sendMessage(
    { type: 'saaf:score', jdText, jdTitle: readTitle() },
    (data) => { render(root, data); mountAutofill(root) },
  )
})()
