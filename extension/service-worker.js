/**
 * Saaf extension — the only place that touches the network.
 *
 * ⚠️ THE NETWORK CALL LIVES HERE AND NOT IN THE CONTENT SCRIPT, FOR A REASON
 * THAT IS ARCHITECTURAL RATHER THAN STYLISTIC. A content script's fetch runs in
 * the PAGE's origin, so it is subject to CORS — and the Saaf app has no CORS
 * layer anywhere, by design. An extension background context with
 * `host_permissions` is not subject to CORS, so routing every request through
 * here means the web app never has to open a cross-origin surface to serve the
 * extension. The endpoint still sets permissive headers, but nothing depends on
 * them.
 */
const ENDPOINT = 'https://saaf-ten.vercel.app/api/extension/score'

/**
 * Who may talk to the extension from a web page. manifest.json's
 * `externally_connectable` already limits this to these origins; the check is
 * repeated here because a manifest edit that widens the list should not
 * silently widen who can write the candidate's profile.
 */
const SAAF_ORIGINS = ['https://saaf-ten.vercel.app']
/**
 * localhost is trusted only in the unpacked development copy. A store-installed
 * extension carries `update_url` in its manifest; an unpacked one does not.
 * Found by the 2026-09-25 security review: otherwise any page served from a
 * user's own machine, on any port, could read their queued jobs.
 */
const IS_DEV_BUILD = !('update_url' in chrome.runtime.getManifest())
const isSaaf = (sender) => {
  const o = sender?.origin || (sender?.url ? new URL(sender.url).origin : '')
  return SAAF_ORIGINS.includes(o) || (IS_DEV_BUILD && /^http:\/\/localhost(:\d+)?$/.test(o))
}

/** Fields the web app may write. Anything else in a sync message is dropped. */
const SYNCED_FIELDS = [
  'fullName', 'email', 'phone', 'city', 'currentTitle', 'currentEmployer',
  'yearsExperience', 'noticePeriod', 'linkedin', 'portfolio', 'workAuth', 'preferredLocations',
]
const RANK = { saved: 0, applying: 1, applied: 2 }

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // A role the candidate saved or filled on a job site. Held here until the
  // Saaf web app, open and signed in, collects it (saaf:drain below) — the
  // extension holds no session, so it never writes to the tracker itself.
  if (msg?.type === 'saaf:queue') {
    ;(async () => {
      const item = msg.item || {}
      if (!/^https?:\/\//.test(item.url || '') || !RANK.hasOwnProperty(item.status)) { sendResponse({ ok: false }); return }
      const { pendingTrack = [] } = await chrome.storage.local.get('pendingTrack')
      const i = pendingTrack.findIndex((p) => p.url === item.url)
      const row = {
        url: String(item.url).slice(0, 2000), title: String(item.title || '').slice(0, 300),
        company: String(item.company || '').slice(0, 200), status: item.status, at: new Date().toISOString(),
      }
      // Saved → Applying only moves forward; a second "Save" never demotes it.
      if (i === -1) pendingTrack.push(row)
      else if (RANK[row.status] > RANK[pendingTrack[i].status]) pendingTrack[i] = row
      await chrome.storage.local.set({ pendingTrack: pendingTrack.slice(-50) })
      sendResponse({ ok: true })
    })()
    return true
  }

  // Required questions a form asked that the candidate has no saved answer for.
  // Held here until the Saaf web app collects them (saaf:drain); the candidate
  // answers them in Saaf and the next form that asks the same question is filled.
  if (msg?.type === 'saaf:questions') {
    ;(async () => {
      const { pendingQuestions = [] } = await chrome.storage.local.get('pendingQuestions')
      for (const q of Array.isArray(msg.items) ? msg.items : []) {
        const key = typeof q?.key === 'string' ? q.key.slice(0, 200) : ''
        const question = typeof q?.question === 'string' ? q.question.slice(0, 200) : ''
        if (!key || !question || pendingQuestions.some((p) => p.key === key)) continue
        pendingQuestions.push({ key, question })
      }
      await chrome.storage.local.set({ pendingQuestions: pendingQuestions.slice(-50) })
      sendResponse({ ok: true })
    })()
    return true
  }

  // "Tailor my résumé" on a posting. The extension calls no model and holds no session, so it hands
  // the posting to Saaf's own tailoring tool: the text waits here for ten minutes, one time, and the
  // tool it opens collects it (saaf:take-jd). Nothing leaves the browser in this step.
  if (msg?.type === 'saaf:tailor-open') {
    ;(async () => {
      const text = String(msg.jdText || '').slice(0, 20000)
      if (text.length < 120) { sendResponse({ ok: false }); return }
      await chrome.storage.local.set({ pendingJd: { text, title: String(msg.jdTitle || '').slice(0, 200), location: String(msg.jdLocation || '').slice(0, 200), at: new Date().toISOString() } })
      await chrome.tabs.create({ url: `${new URL(ENDPOINT).origin}/tools/paste-jd?from=extension` })
      sendResponse({ ok: true })
    })()
    return true
  }

  if (msg?.type !== 'saaf:score') return false

  ;(async () => {
    try {
      const { resumeText } = await chrome.storage.local.get('resumeText')
      if (!resumeText || resumeText.trim().length < 120) {
        sendResponse({ ok: false, error: 'Add your résumé to Saaf first — click the extension icon.' })
        return
      }

      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jdText: msg.jdText,
          resumeText,
          jdTitle: msg.jdTitle || undefined,
          jdLocation: msg.jdLocation || undefined,
          // ⚠️ preferredRole is deliberately NOT filled from the posting's own
          // title. The scorer falls back to the candidate's current title, and
          // passing the JD's title instead hands every posting full marks on
          // the heaviest component in the model.
        }),
      })
      sendResponse(await res.json())
    } catch {
      sendResponse({ ok: false, error: 'Could not reach Saaf.' })
    }
  })()

  // Keeps the message channel open for the async reply above. Without this the
  // sendResponse lands after the port has closed and the overlay hangs.
  return true
})

/**
 * The web app ↔ extension bridge. Only Saaf's own pages reach this.
 *
 *  saaf:hello  → is the extension installed, and which version
 *  saaf:sync   ← profile fields, résumé text and the tracker's url→stage list,
 *                pushed by the signed-in app on load
 *  saaf:drain  → the roles queued on job sites since the last visit, and the
 *                required custom questions forms asked that have no saved answer,
 *                and the hostnames the candidate asked Saaf to support
 *  saaf:ack    ← those the app has filed, so they are not filed twice
 *  saaf:ack-questions ← the questions the app has put on file
 *  saaf:ack-sites     ← the "support this site" requests the app has put on file
 *  saaf:take-jd       → the posting "Tailor my résumé" left for Saaf's tailoring tool (once, ≤10 min)
 *
 * ⚠️ SYNC FILLS, IT DOES NOT ERASE. A field the web profile leaves blank keeps
 * whatever the candidate typed into the extension, and the fields only the
 * extension holds (salary figures, yes/no answers, the résumé file) are never
 * touched by a sync — the web app does not have them.
 */
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (!isSaaf(sender)) return false

  ;(async () => {
    if (msg?.type === 'saaf:hello') {
      sendResponse({ ok: true, version: chrome.runtime.getManifest().version })
      return
    }
    if (msg?.type === 'saaf:sync') {
      const { profile = {} } = await chrome.storage.local.get('profile')
      for (const f of SYNCED_FIELDS) {
        const v = msg.profile?.[f]
        if (typeof v === 'string' && v.trim()) profile[f] = v.trim().slice(0, 500)
      }
      // The candidate's own typed answers to demographic questions. REPLACED, not
      // merged: clearing an answer on the web must remove it here, or a question
      // they took back would still be answered. Whitelisted keys, short strings only.
      if (msg.selfId && typeof msg.selfId === 'object') {
        const KEYS = ['gender', 'pronouns', 'ethnicity', 'disability', 'veteran', 'orientation', 'caste', 'religion', 'marital']
        const next = {}
        for (const k of KEYS) {
          const v = msg.selfId[k]
          if (typeof v === 'string' && v.trim()) next[k] = v.trim().slice(0, 60)
        }
        profile.selfId = next
      }
      // The candidate's own saved answers to custom questions, keyed by the question
      // (autofill.js questionKey). REPLACED, like selfId: deleting one on the web must
      // stop it being filled here. Capped so a bad message cannot fill storage.
      if (Array.isArray(msg.answerBank)) {
        const bank = {}
        for (const e of msg.answerBank.slice(0, 60)) {
          if (typeof e?.key === 'string' && typeof e?.a === 'string' && e.key && e.a.trim()) {
            bank[e.key.slice(0, 200)] = { a: e.a.trim().slice(0, 1500), auto: e.auto === true }
          }
        }
        profile.answerBank = bank
      }
      const patch = { profile, syncedAt: new Date().toISOString() }
      if (typeof msg.resumeText === 'string' && msg.resumeText.trim().length >= 120) {
        patch.resumeText = msg.resumeText.slice(0, 40000)
      }
      if (Array.isArray(msg.tracked)) {
        patch.tracked = msg.tracked
          .filter((t) => t && typeof t.url === 'string' && typeof t.status === 'string')
          .slice(0, 500)
          .map((t) => ({ url: t.url.slice(0, 2000), status: t.status }))
      }
      await chrome.storage.local.set(patch)
      sendResponse({ ok: true })
      return
    }
    if (msg?.type === 'saaf:drain') {
      const { pendingTrack = [], pendingQuestions = [], requestedSites = [] } = await chrome.storage.local.get(['pendingTrack', 'pendingQuestions', 'requestedSites'])
      sendResponse({ ok: true, items: pendingTrack, questions: pendingQuestions, sites: requestedSites })
      return
    }
    if (msg?.type === 'saaf:ack-sites') {
      const done = new Set(Array.isArray(msg.hosts) ? msg.hosts : [])
      const { requestedSites = [] } = await chrome.storage.local.get('requestedSites')
      await chrome.storage.local.set({ requestedSites: requestedSites.filter((h) => !done.has(h)) })
      sendResponse({ ok: true })
      return
    }
    if (msg?.type === 'saaf:take-jd') {
      const { pendingJd, resumeText } = await chrome.storage.local.get(['pendingJd', 'resumeText'])
      await chrome.storage.local.remove('pendingJd') // one time only
      const fresh = pendingJd && Date.now() - Date.parse(pendingJd.at) < 10 * 60 * 1000
      // The résumé goes along only with a fresh posting the candidate just chose to tailor for.
      sendResponse({ ok: true, jd: fresh ? { text: pendingJd.text, title: pendingJd.title, location: pendingJd.location } : null, resumeText: fresh && resumeText ? String(resumeText).slice(0, 40000) : '' })
      return
    }
    if (msg?.type === 'saaf:ack-questions') {
      const done = new Set(Array.isArray(msg.keys) ? msg.keys : [])
      const { pendingQuestions = [] } = await chrome.storage.local.get('pendingQuestions')
      await chrome.storage.local.set({ pendingQuestions: pendingQuestions.filter((p) => !done.has(p.key)) })
      sendResponse({ ok: true })
      return
    }
    if (msg?.type === 'saaf:autoapply-add') {
      const jobs = Array.isArray(msg.jobs) ? msg.jobs : []
      const { autoApplyQueue = [], autoApply = {} } = await chrome.storage.local.get(['autoApplyQueue', 'autoApply'])
      for (const j of jobs) {
        if (!j || !/^https?:\/\//.test(j.url || '') || autoApplyQueue.some((q) => q.url === j.url)) continue
        autoApplyQueue.push({ url: String(j.url).slice(0, 2000), title: String(j.title || '').slice(0, 300), company: String(j.company || '').slice(0, 200) })
      }
      await chrome.storage.local.set({ autoApplyQueue: autoApplyQueue.slice(0, 100) })
      sendResponse({ ok: true, queued: autoApplyQueue.length, enabled: !!autoApply.enabled })
      return
    }
    if (msg?.type === 'saaf:ack') {
      const done = new Set(Array.isArray(msg.urls) ? msg.urls : [])
      const { pendingTrack = [] } = await chrome.storage.local.get('pendingTrack')
      await chrome.storage.local.set({ pendingTrack: pendingTrack.filter((p) => !done.has(p.url)) })
      sendResponse({ ok: true })
      return
    }
    sendResponse({ ok: false })
  })()
  return true
})

// ------------------------------------------------------------ Apply for me
/**
 * "Apply for me" (2026-09-25, founder direction; see autoapply.js for the
 * rules that stay fixed). One job at a time, in a background tab, only after
 * the candidate switched it on AND pressed Start, and at most DAILY_CAP a day.
 *
 * State: storage.local  autoApply {enabled}, autoApplyQueue [...jobs],
 *                       autoApplyLog [...results], autoApplyDay {date, count}
 *        storage.session autoApplyActive {tabId, job, phase, startedAt}
 *
 * MV3 service workers sleep, so there is no timer to trust: a job that never
 * reports back is closed out the next time Start is pressed (STALE_MS).
 */
const DAILY_CAP = 25

/**
 * Saaf's remote kill switch. If an application goes out wrong for anyone, the
 * founder sets one flag (docs/RUNBOOK.md) and every extension stops submitting
 * on its next check — it is asked before each job is opened AND again just
 * before each Submit click, so a run already in progress stops too.
 *
 * ⚠️ FAILS OPEN, ON PURPOSE AND SAID HERE. If Saaf cannot be reached the check
 * returns "not paused": the run is the candidate's own, started by their own
 * press of Start, against an employer's site that does not depend on ours. A
 * switch that also stopped everyone whenever Saaf had an outage would be a
 * second way to fail, not a safety. The cost: a kill switch cannot reach a
 * browser that is offline — and an offline browser cannot submit anything.
 */
const STATUS_URL = 'https://saaf-ten.vercel.app/api/extension/status'
async function pausedBySaaf() {
  try {
    const res = await fetch(STATUS_URL, { cache: 'no-store', signal: AbortSignal.timeout(4000) })
    if (!res.ok) return { paused: false }
    const body = await res.json()
    return body && body.applyForMe === 'paused'
      ? { paused: true, message: String(body.message || 'Apply for me is paused by Saaf').slice(0, 200) }
      : { paused: false }
  } catch {
    return { paused: false }
  }
}
const STALE_MS = 90_000
const today = () => new Date().toISOString().slice(0, 10)

/** Only hosts our content scripts run on can be applied to — the rest would never report. */
const SUPPORTED = (chrome.runtime.getManifest().content_scripts?.[0]?.matches ?? [])
  .map((m) => new RegExp('^' + m.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'))
const supported = (url) => SUPPORTED.some((re) => re.test(url))

/** Coverage as the content script measured it, bounded: it came from a page. */
function cleanCoverage(c) {
  if (!c || typeof c !== 'object') return undefined
  const labels = (a) => (Array.isArray(a) ? a.slice(0, 20).map((x) => String(x).slice(0, 80)) : [])
  const percent = Number(c.percent)
  if (!Number.isFinite(percent)) return undefined
  return { percent: Math.max(0, Math.min(100, Math.round(percent))), filled: labels(c.filled), missing: labels(c.missing) }
}

async function logResult(job, status, reason, coverage) {
  const { autoApplyLog = [] } = await chrome.storage.local.get('autoApplyLog')
  autoApplyLog.unshift({ url: job.url, title: job.title, company: job.company, status, reason, coverage: cleanCoverage(coverage), at: new Date().toISOString() })
  await chrome.storage.local.set({ autoApplyLog: autoApplyLog.slice(0, 50) })
}

async function queueForTracker(job, status, via) {
  const { pendingTrack = [] } = await chrome.storage.local.get('pendingTrack')
  const i = pendingTrack.findIndex((p) => p.url === job.url)
  // `via` is set only by "Apply for me", and only the tracker's "Applied" reads it —
  // so a candidate's own submit is never credited to the extension.
  const row = { url: job.url, title: job.title, company: job.company, status, via, at: new Date().toISOString() }
  if (i === -1) pendingTrack.push(row)
  else if (RANK[status] > RANK[pendingTrack[i].status]) pendingTrack[i] = row
  await chrome.storage.local.set({ pendingTrack: pendingTrack.slice(-50) })
}

async function processNext() {
  const { autoApply = {}, autoApplyQueue = [], autoApplyDay = {} } = await chrome.storage.local.get(['autoApply', 'autoApplyQueue', 'autoApplyDay'])
  const { autoApplyActive } = await chrome.storage.session.get('autoApplyActive')
  if (!autoApply.enabled) return { ok: false, error: 'Apply for me is switched off.' }
  if (autoApplyActive && Date.now() - autoApplyActive.startedAt < STALE_MS) return { ok: true, running: true }
  if (autoApplyActive) await logResult(autoApplyActive.job, 'needs-you', 'The page never reported back — check that tab')

  const count = autoApplyDay.date === today() ? autoApplyDay.count : 0
  if (count >= DAILY_CAP) { await chrome.storage.session.remove('autoApplyActive'); return { ok: false, error: `Today's limit of ${DAILY_CAP} applications is reached.` } }

  // Asked before a job is taken off the queue, so a paused run leaves it queued.
  const gate = await pausedBySaaf()
  if (gate.paused) { await chrome.storage.session.remove('autoApplyActive'); return { ok: false, error: gate.message } }

  const job = autoApplyQueue.shift()
  await chrome.storage.local.set({ autoApplyQueue })
  if (!job) { await chrome.storage.session.remove('autoApplyActive'); return { ok: true, done: true } }
  if (!supported(job.url)) {
    await logResult(job, 'needs-you', 'Not an application site the extension works on — apply there yourself')
    return processNext()
  }
  const tab = await chrome.tabs.create({ url: job.url, active: false })
  await chrome.storage.session.set({ autoApplyActive: { tabId: tab.id, job, phase: 'fill', startedAt: Date.now() } })
  return { ok: true, running: true }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg?.type?.startsWith('saaf:autoapply')) return false
  ;(async () => {
    const { autoApplyActive } = await chrome.storage.session.get('autoApplyActive')
    const mine = autoApplyActive && sender.tab && sender.tab.id === autoApplyActive.tabId

    if (msg.type === 'saaf:autoapply-gate') { sendResponse(await pausedBySaaf()); return }
    if (msg.type === 'saaf:autoapply-start') { sendResponse(await processNext()); return }
    if (msg.type === 'saaf:autoapply-state') { sendResponse(mine ? { job: autoApplyActive.job, phase: autoApplyActive.phase } : null); return }
    if (msg.type === 'saaf:autoapply-phase' && mine) {
      // 'await-confirm' is sent immediately before the Submit click: the last
      // moment the kill switch can stop this application.
      if (msg.phase === 'await-confirm') {
        const gate = await pausedBySaaf()
        if (gate.paused) { sendResponse({ ok: true, allow: false, reason: gate.message }); return }
      }
      await chrome.storage.session.set({ autoApplyActive: { ...autoApplyActive, phase: msg.phase, startedAt: Date.now() } })
      sendResponse({ ok: true, allow: true }); return
    }
    if (msg.type === 'saaf:autoapply-result' && mine) {
      const job = autoApplyActive.job
      await chrome.storage.session.remove('autoApplyActive')
      await logResult(job, msg.status, msg.reason, msg.coverage)
      if (msg.status === 'submitted') {
        const { autoApplyDay = {} } = await chrome.storage.local.get('autoApplyDay')
        const count = autoApplyDay.date === today() ? autoApplyDay.count : 0
        await chrome.storage.local.set({ autoApplyDay: { date: today(), count: count + 1 } })
        await queueForTracker(job, 'applied', 'apply-for-me')
        setTimeout(() => chrome.tabs.remove(sender.tab.id).catch(() => {}), 3000)
      } else {
        // Left open for the candidate, and filed as Applying — never Applied.
        await queueForTracker(job, 'applying', 'apply-for-me')
      }
      sendResponse({ ok: true })
      setTimeout(() => { processNext() }, 4000)
      return
    }
    sendResponse({ ok: false })
  })()
  return true
})
