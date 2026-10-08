/**
 * Everything the extension knows, and it lives in chrome.storage.local only.
 *
 * ⚠️ NOTHING HERE IS SENT ANYWHERE EXCEPT THE RÉSUMÉ TEXT, AND ONLY TO BE
 * SCORED. The form fields, salary figures, yes/no answers and the résumé file
 * never leave the machine — the content script reads them from local storage
 * and writes them into the page in front of the user. The web app can PUSH
 * profile fields in (service-worker.js, saaf:sync); nothing is pulled out.
 */
const FIELDS = [
  'fullName', 'email', 'phone', 'city', 'preferredLocations', 'currentTitle',
  'currentEmployer', 'yearsExperience', 'noticePeriod', 'workAuth', 'linkedin', 'portfolio',
  'currentCtcLakhs', 'expectedCtcLakhs', 'authorisedToWork', 'needsSponsorship', 'willingToRelocate',
]
const MAX_FILE_BYTES = 4 * 1024 * 1024
const $ = (id) => document.getElementById(id)

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
  if (syncedAt) $('sync').textContent = `Synced from Saaf ${new Date(syncedAt).toLocaleString()}`
})

/** The file as base64, so it can live in chrome.storage and be rebuilt as a File. */
function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

$('save').addEventListener('click', async () => {
  const profile = {}
  for (const f of FIELDS) profile[f] = $(f).value.trim()
  const lakhs = (v) => v === '' || /^\d+(\.\d+)?$/.test(v)
  if (!lakhs(profile.currentCtcLakhs) || !lakhs(profile.expectedCtcLakhs)) {
    $('msg').textContent = 'CTC must be a number of lakhs, like 18 or 12.5'
    return
  }
  const patch = { resumeText: $('resume').value.trim(), profile }

  const file = $('resumeFile').files?.[0]
  if (file) {
    if (file.size > MAX_FILE_BYTES) { $('msg').textContent = 'That file is over 4 MB'; return }
    patch.resumeFile = { name: file.name, type: file.type || 'application/pdf', base64: await readFile(file) }
    $('fileName').textContent = `Stored: ${file.name}`
  }
  await chrome.storage.local.set(patch)
  $('msg').textContent = 'Saved'
})

// ------------------------------------------------------------ Apply for me
const STATUS = { submitted: 'Applied', 'needs-you': 'Needs you', unconfirmed: 'Check this tab' }
const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

async function renderAutoApply() {
  const { autoApply = {}, autoApplyQueue = [], autoApplyLog = [], autoApplyDay = {} } =
    await chrome.storage.local.get(['autoApply', 'autoApplyQueue', 'autoApplyLog', 'autoApplyDay'])
  const todayCount = autoApplyDay.date === new Date().toISOString().slice(0, 10) ? autoApplyDay.count : 0
  $('aaEnabled').checked = !!autoApply.enabled
  $('aaStatus').textContent = `${autoApplyQueue.length} queued · ${todayCount} of 25 applied today. Queue jobs with "Apply for me" on any job in Saaf.`
  // Saaf's remote switch: when applications are paused, say so and do not offer Start.
  const gate = await chrome.runtime.sendMessage({ type: 'saaf:autoapply-gate' }).catch(() => null)
  $('aaPaused').hidden = !gate?.paused
  $('aaPaused').textContent = gate?.paused ? `Paused by Saaf — ${gate.message}` : ''
  $('aaStart').disabled = !autoApply.enabled || !autoApplyQueue.length || !!gate?.paused
  // The queue itself: what will be opened next, each removable. Order is the order it runs in.
  $('aaQueue').innerHTML = autoApplyQueue.slice(0, 12).map((q, i) =>
    `<li>${i + 1}. ${esc(q.title)} · ${esc(q.company)} <a href="#" data-drop="${i}" title="Take this job off the queue">remove</a></li>`).join('') +
    (autoApplyQueue.length > 12 ? `<li>…and ${autoApplyQueue.length - 12} more</li>` : '')
  $('aaClear').hidden = !autoApplyQueue.length
  // Per application: how much of what the employer REQUIRED was answered, and which fields.
  $('aaLog').innerHTML = autoApplyLog.slice(0, 8).map((l) => {
    const c = l.coverage
    const cov = c
      ? `<br><span title="${esc((c.filled || []).join(', '))}">${c.percent}% of required fields answered</span>` +
        (c.missing && c.missing.length ? ` · missing: ${esc(c.missing.slice(0, 4).join('; '))}${c.missing.length > 4 ? '…' : ''}` : '')
      : ''
    return `<li><b>${esc(STATUS[l.status] ?? l.status)}</b> — ${esc(l.title)} · ${esc(l.company)}<br>${esc(l.reason)}${cov}</li>`
  }).join('')
}

$('aaQueue').addEventListener('click', async (e) => {
  const a = e.target.closest('a[data-drop]')
  if (!a) return
  e.preventDefault()
  const { autoApplyQueue = [] } = await chrome.storage.local.get('autoApplyQueue')
  autoApplyQueue.splice(Number(a.dataset.drop), 1)
  await chrome.storage.local.set({ autoApplyQueue })
})
$('aaClear').addEventListener('click', async () => {
  await chrome.storage.local.set({ autoApplyQueue: [] })
})

$('aaEnabled').addEventListener('change', async (e) => {
  await chrome.storage.local.set({ autoApply: { enabled: e.target.checked, at: new Date().toISOString() } })
  renderAutoApply()
})
$('aaStart').addEventListener('click', async () => {
  const r = await chrome.runtime.sendMessage({ type: 'saaf:autoapply-start' })
  $('aaMsg').textContent = r?.error ?? (r?.done ? 'Queue is empty.' : 'Started — keep Chrome open.')
  renderAutoApply()
})
chrome.storage.onChanged.addListener((c, area) => {
  if (area === 'local' && (c.autoApplyLog || c.autoApplyQueue || c.autoApplyDay)) renderAutoApply()
})
renderAutoApply()

// --------------------------------------------------------------- This site
/**
 * What Saaf does on the tab you are looking at, and — for a site it does not run on — a button
 * to ask for it. Only the HOSTNAME is kept (never the URL or anything on the page), and it is
 * filed in Saaf the next time you open it signed in (service-worker.js, saaf:drain).
 * The popup can read the tab's address because opening it grants `activeTab` for that tab.
 */
const NEVER_ASK = /(^|\.)(linkedin\.com|naukri\.com|saaf-ten\.vercel\.app)$/
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
    msg.textContent = 'Open a job page and then this popup, to see how Saaf handles that site.'
    return
  }
  const ats = globalThis.SaafExtract?.detectAts(host)
  if (ats) { msg.textContent = `${ats} — Saaf runs on this site. How well each site has been checked: saaf-ten.vercel.app/extension`; return }
  if (NEVER_ASK.test(host)) { msg.textContent = 'Saaf does not run on this site, on purpose.'; return }
  const { requestedSites = [] } = await chrome.storage.local.get('requestedSites')
  if (requestedSites.includes(host)) { msg.textContent = `You asked Saaf to support ${host}. It is sent the next time you open Saaf signed in.`; return }
  msg.textContent = `${host} is not a site Saaf runs on yet.`
  btn.textContent = `Ask Saaf to support ${host}`
  btn.hidden = false
  btn.onclick = async () => {
    const { requestedSites: have = [] } = await chrome.storage.local.get('requestedSites')
    if (!have.includes(host)) await chrome.storage.local.set({ requestedSites: [...have, host].slice(-20) })
    renderSite()
  }
}
renderSite()
