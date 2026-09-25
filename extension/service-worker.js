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
const isSaaf = (sender) => {
  const o = sender?.origin || (sender?.url ? new URL(sender.url).origin : '')
  return SAAF_ORIGINS.includes(o) || /^http:\/\/localhost(:\d+)?$/.test(o)
}

/** Fields the web app may write. Anything else in a sync message is dropped. */
const SYNCED_FIELDS = [
  'fullName', 'email', 'phone', 'city', 'currentTitle', 'currentEmployer',
  'yearsExperience', 'noticePeriod', 'linkedin', 'portfolio', 'workAuth', 'preferredLocations',
]
const RANK = { saved: 0, applying: 1 }

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
 *  saaf:drain  → the roles queued on job sites since the last visit
 *  saaf:ack    ← those the app has filed, so they are not filed twice
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
      const { pendingTrack = [] } = await chrome.storage.local.get('pendingTrack')
      sendResponse({ ok: true, items: pendingTrack })
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
