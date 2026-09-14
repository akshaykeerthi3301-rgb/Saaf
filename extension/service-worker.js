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

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
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
