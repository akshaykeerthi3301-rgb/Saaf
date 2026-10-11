/**
 * The drop-down — shown only on a page the panel is NOT running on. On a supported page the icon opens the panel instead
 * (service-worker.js, the toolbar icon).
 */
const $ = (id) => document.getElementById(id)
const SITE = 'https://jobinko.in'

/** Who the extension is acting for — the account, or a way to sign in. */
chrome.runtime.sendMessage({ type: 'jx:connect' }).then((r) => {
  const el = $('acct')
  if (r?.signedIn) {
    const who = r.account?.name || r.account?.email || 'your account'
    const file = r.resumeFile ? `Attaching <b>${r.resumeFile.name.replace(/[<>&"]/g, '')}</b>` : `No résumé yet — <a href="${SITE}/resume" target="_blank">add one</a>`
    el.innerHTML = `<b>${who.replace(/[<>&"]/g, '')}</b> · connected<br><span style="color:var(--muted)">${file}</span>`
  } else if (r?.signedIn === false) {
    el.innerHTML = `<b>Not signed in</b><br><span style="color:var(--muted)">Sign in to Jobinko in this browser, then reopen this popup.</span><br><a href="${SITE}/signin" target="_blank">Sign in to Jobinko</a>`
  } else {
    el.textContent = r?.error || 'Could not reach Jobinko.'
  }
}).catch(() => { $('acct').textContent = 'Could not reach Jobinko.' })

chrome.storage.local.get(['resumeText', 'profile', 'resumeFile', 'syncedAt']).then(({ resumeText, profile, resumeFile, syncedAt }) => {
  if (resumeText) $('resume').value = resumeText
  for (const f of FIELDS) {
    const el = $(f)
    const v = profile?.[f]
    if (!v) continue
    // A synced notice period may not be one of the menu's words; keep it.
    if (el.tagName === 'SELECT' && ![...el.options].some((o) => o.value === v || o.text === v)) el.add(new Option(v, v))
    el.value = v
  }
  if (resumeFile) $('fileName').textContent = `Stored: ${resumeFile.name}`
  if (syncedAt) $('sync').textContent = `Synced from Jobinko ${new Date(syncedAt).toLocaleString()}`
})


// --------------------------------------------------------------- This site
/**
 * What Jobinko does on the tab you are looking at, and — for a site it does not run on — a button to ask for it. Only the
 * HOSTNAME is kept (never the URL or anything on the page), and it is filed in Jobinko the next time you open it signed
 * in (service-worker.js, saaf:drain). The popup can read the tab's address because opening it grants `activeTab`.
 */
const NEVER_ASK = /(^|\.)(linkedin\.com|naukri\.com|jobinko\.in|saaf-ten\.vercel\.app)$/
async function renderSite() {
  const msg = $('siteMsg'), btn = $('siteAsk')
  btn.hidden = true
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => [])
  let host = ''
  try {
    const u = new URL(tab?.url || '')
    if (/^https?:$/.test(u.protocol)) host = u.hostname.toLowerCase().replace(/\.$/, '')
  } catch { /* a page with no address (a new tab) */ }
  if (!host || host === 'localhost' || /^[\d.]+$/.test(host) || !host.includes('.')) {
    msg.textContent = 'Open a job posting or application form, then click the icon.'
    return
  }
  const ats = globalThis.SaafExtract?.detectAts(host)
  if (ats) { msg.textContent = `${ats} — Jobinko runs on this site. Reload the page if the panel is not showing. How well each site has been checked: jobinko.in/extension`; return }
  if (NEVER_ASK.test(host)) { msg.textContent = 'Jobinko does not run on this site, on purpose.'; return }
  const { requestedSites = [] } = await chrome.storage.local.get('requestedSites')
  if (requestedSites.includes(host)) { msg.textContent = `You asked Jobinko to support ${host}. It is sent the next time you open Jobinko signed in.`; return }
  msg.textContent = `${host} is not a site Jobinko runs on yet.`
  btn.textContent = `Ask Jobinko to support ${host}`
  btn.hidden = false
  btn.onclick = async () => {
    const { requestedSites: have = [] } = await chrome.storage.local.get('requestedSites')
    if (!have.includes(host)) await chrome.storage.local.set({ requestedSites: [...have, host].slice(-20) })
    renderSite()
  }
}
renderSite()
$('settings').addEventListener('click', () => { chrome.runtime.openOptionsPage(); window.close() })
