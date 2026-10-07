/**
 * Saaf extension — "Apply for me" (2026-09-25).
 *
 * ⚠️ THIS REVERSES A DECISION THAT WAS CALLED PERMANENT, BY FOUNDER DIRECTION.
 * Until 2026-09-25 Saaf never submitted an application on anyone's behalf
 * (PROJECT-STATE, Locked decisions — now struck). Jobright's Agent does
 * (OBSERVED), and the founder chose parity. What stays fixed, because these are
 * about honesty and the law rather than product taste:
 *
 *  - IT NEVER GETS PAST A CAPTCHA. A "prove you are human" check is the
 *    employer saying a person must be here. We stop and hand the tab over.
 *  - IT NEVER GUESSES. Every required field must have been filled from the
 *    candidate's own stored answers (autofill.js). One empty required field,
 *    one demographic or free-text question the employer marked required, or a
 *    required upload we have no file for — and it stops.
 *  - IT NEVER CLAIMS WHAT IT DID NOT SEE. "Submitted" means the employer's page
 *    showed a confirmation after the click; a click with no confirmation is
 *    reported as "check this tab", never as applied.
 *  - IT IS OFF UNTIL THE CANDIDATE TURNS IT ON, runs only when they press
 *    Start, and is capped per day (service-worker.js).
 *
 * Attached to a global (MV3 content scripts are not modules); tested through it.
 */
;(function (root) {
  const CAPTCHA = [
    'iframe[src*="recaptcha"]', 'iframe[src*="hcaptcha"]', 'iframe[src*="challenges.cloudflare.com"]',
    '.g-recaptcha', '.h-captcha', '.cf-turnstile', '[data-sitekey]', 'iframe[title*="captcha" i]',
  ]

  /** A CAPTCHA is on the page. We never solve, click or bypass one. */
  function hasCaptcha(doc) {
    return CAPTCHA.some((s) => doc.querySelector(s))
  }

  const isVisible = (el) => {
    if (!el || el.type === 'hidden' || el.disabled) return false
    const style = el.ownerDocument?.defaultView?.getComputedStyle?.(el)
    return !(style && (style.display === 'none' || style.visibility === 'hidden'))
  }

  const isRequired = (el) => el.required || el.getAttribute('aria-required') === 'true'

  /**
   * Every visible required field, with whether it holds an answer. The one place
   * "required" is read, so the coverage report and the stop-before-submit rule
   * can never disagree about what was required.
   */
  function requiredFields(doc) {
    const out = []
    const seenGroups = new Set()
    for (const el of doc.querySelectorAll('input, select, textarea')) {
      if (!isVisible(el) || !isRequired(el)) continue
      const type = (el.type || '').toLowerCase()
      let empty
      if (type === 'radio' || type === 'checkbox') {
        const name = el.name || el.id
        if (seenGroups.has(name)) continue
        seenGroups.add(name)
        const group = name ? [...doc.querySelectorAll(`input[name="${CSS.escape(name)}"]`)] : [el]
        empty = !group.some((g) => g.checked)
      } else if (type === 'file') {
        empty = !(el.files && el.files.length)
      } else {
        empty = !String(el.value || '').trim()
      }
      out.push({ label: labelOf(el, doc), filled: !empty })
    }
    return out
  }

  /** Labels of required fields that are still empty. Empty list = ready. */
  function missingRequired(doc) {
    return requiredFields(doc).filter((f) => !f.filled).map((f) => f.label)
  }

  /**
   * How much of what the employer REQUIRED is answered — for the queue view. It
   * counts required fields only: counting optional ones would make a form we
   * left half-empty look done, and "100%" is a claim about what will be sent.
   * No required field at all reads 100%, and the labels still say what was filled.
   */
  function coverage(doc) {
    const fields = requiredFields(doc)
    const filled = fields.filter((f) => f.filled).map((f) => f.label)
    const missing = fields.filter((f) => !f.filled).map((f) => f.label)
    const percent = fields.length ? Math.round((100 * filled.length) / fields.length) : 100
    return { percent, filled: filled.slice(0, 20), missing: missing.slice(0, 20), required: fields.length }
  }

  function labelOf(el, doc) {
    const byFor = el.id && doc.querySelector(`label[for="${CSS.escape(el.id)}"]`)
    const text = (byFor?.textContent || el.closest?.('label')?.textContent || el.closest?.('fieldset')?.querySelector('legend')?.textContent
      || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || 'a required field')
    return text.replace(/\s+/g, ' ').replace(/\*/g, '').trim().slice(0, 80)
  }

  /** The form's own submit control — never a generic link or an "apply with LinkedIn" button. */
  function findSubmit(doc) {
    const cands = [...doc.querySelectorAll('button, input[type="submit"]')].filter(isVisible)
    const label = (b) => (b.textContent || b.value || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()
    const bad = /linkedin|indeed|google|save|draft|cancel|back|sign ?in|log ?in|upload|attach|add another/i
    const good = /^(submit( application)?|apply|send application|apply now|submit your application)$/i
    return (
      cands.find((b) => good.test(label(b)) && !bad.test(label(b))) ||
      cands.find((b) => (b.type || '').toLowerCase() === 'submit' && b.form && !bad.test(label(b))) ||
      null
    )
  }

  /** On a posting page with no form yet: the button or link that opens the application. */
  function findApplyEntry(doc) {
    const cands = [...doc.querySelectorAll('a, button')].filter(isVisible)
    const t = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim()
    return cands.find((e) => /^(apply( for this (job|position|role))?|apply now|i'?m interested)$/i.test(t(e)) && !/linkedin|indeed/i.test(t(e))) || null
  }

  /**
   * ⚠️ "Thank you for your interest" is NOT a confirmation — it is the opening
   * line of countless postings, BEFORE anyone applies. An earlier pattern
   * accepted it and would have marked jobs Applied that were not; the test
   * "is not fooled by…" exists because of it.
   */
  const CONFIRM = /(thank(s| you)[^.]{0,40}\b(for )?(applying|your application|submitting)|application (has been |was )?(received|submitted|sent)|we('ve| have) received your application|successfully (applied|submitted))/i

  function confirmationSeen(doc) {
    return CONFIRM.test((doc.body?.innerText || doc.body?.textContent || '').slice(0, 20000))
  }

  function hasForm(doc) {
    // An <input> with no type attribute IS a text box, and CSS [type="text"] does not match it.
    return !!doc.querySelector('input[type="email"], input[type="tel"], input[type="file"], form input[type="text"], form input:not([type])')
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  /**
   * Fill, check, and submit only when nothing is missing.
   * Returns { status: 'submitted' | 'needs-you' | 'open-form' | 'unconfirmed', reason, filled, coverage }.
   */
  async function run(doc, profile, opts = {}) {
    if (!hasForm(doc)) {
      const entry = findApplyEntry(doc)
      if (entry) { entry.click(); return { status: 'open-form', reason: 'Opened the application form', filled: [] } }
      return { status: 'needs-you', reason: 'No application form on this page', filled: [] }
    }
    if (hasCaptcha(doc)) return { status: 'needs-you', reason: 'The employer asks for a CAPTCHA — that one is yours', filled: [] }

    const res = await root.SaafAutofill.fillForm(profile, doc, { resumeFile: opts.resumeFile, waitMs: opts.waitMs })
    await sleep(opts.settleMs ?? 400)
    if (hasCaptcha(doc)) return { status: 'needs-you', reason: 'A CAPTCHA appeared — that one is yours', filled: res.filled, coverage: coverage(doc) }

    const cov = coverage(doc)
    const missing = missingRequired(doc)
    if (missing.length) {
      return { status: 'needs-you', reason: `Required and not filled: ${missing.slice(0, 3).join('; ')}${missing.length > 3 ? '…' : ''}`, filled: res.filled, coverage: cov }
    }
    const submit = findSubmit(doc)
    if (!submit) return { status: 'needs-you', reason: 'Could not find the form’s own Submit button', filled: res.filled, coverage: cov }

    // Tell the service worker before clicking: most ATS forms navigate on
    // submit, which ends this script — the NEXT page then checks for the
    // confirmation (content-script.js, phase 'await-confirm').
    //
    // ⚠️ THE SAME CALL IS THE KILL SWITCH'S LAST CHANCE. The service worker
    // checks Saaf's remote switch here and answers { allow: false, reason } when
    // applications are paused; nothing is clicked, and the tab is handed back.
    // Anything other than an explicit `allow: false` goes ahead (a worker that
    // cannot answer must not strand the candidate's own run).
    if (opts.beforeSubmit) {
      const verdict = await opts.beforeSubmit()
      if (verdict && verdict.allow === false) {
        return { status: 'needs-you', reason: verdict.reason || 'Apply for me is paused by Saaf', filled: res.filled, coverage: cov }
      }
    }
    submit.click()
    const deadline = Date.now() + (opts.confirmMs ?? 15000)
    while (Date.now() < deadline) {
      await sleep(500)
      if (confirmationSeen(doc)) return { status: 'submitted', reason: 'The employer’s page confirmed it', filled: res.filled, coverage: cov }
      if (hasCaptcha(doc)) return { status: 'needs-you', reason: 'A CAPTCHA appeared on submit — that one is yours', filled: res.filled, coverage: cov }
    }
    return { status: 'unconfirmed', reason: 'Clicked Submit but saw no confirmation — check this tab', filled: res.filled, coverage: cov }
  }

  root.SaafAutoApply = { run, hasCaptcha, missingRequired, requiredFields, coverage, findSubmit, findApplyEntry, confirmationSeen, hasForm, CONFIRM }
})(typeof globalThis !== 'undefined' ? globalThis : window)
