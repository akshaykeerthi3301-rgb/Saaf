/**
 * Jobinko extension — the account wall: a site that makes you sign in, or create an account, before you can apply.
 *
 * HISTORY. 2026-10-12 morning the founder chose the EMAIL-ONLY version. Later that day, after trying a real Workday job,
 * he reversed it and specified the Jobright behaviour: the person sets ONE password in the extension, once; from then on the
 * extension fills their email and that password on every create-account / sign-in form, and the account is one click.
 *
 * HOW IT WORKS.
 *   - The person saves a password in the panel (or the settings page). It is kept in this browser's extension storage
 *     (`chrome.storage.local`, never `sync`), is never sent to Jobinko or anywhere else, and is removed with one button.
 *   - On a create-account page the panel's button writes email + that password into the password and confirm boxes, then
 *     presses the site's own Create account button.
 *   - On a sign-in page it writes them and presses Sign in.
 *
 * THE AGREEMENT BOX. By default the extension never ticks a site's "I agree to the terms" box: it is outlined and the button
 * waits — the person ticks it and presses again. The person may switch ON, once, in Sign-up information, "tick the site's
 * agreement box for me"; that is their own advance, visible, revocable choice, and only boxes that are REQUIRED or that say
 * agree / acknowledge / terms / privacy are ever ticked — never a marketing or newsletter box. It never reads a password the
 * person typed or the browser saved. A "verify your email" step and any CAPTCHA are the person's.
 *
 * OBSERVED 2026-10-12 (founder's browser, Jobright's pop-up, nothing typed or pressed): Jobright asks for the password in a
 * "Sign-up Information" section BEFORE any site — registration email, password with a show/hide eye, a live checklist (12+
 * characters, upper, lower, number, special) and the note "stored in your browser's local storage". Jobinko now does the same.
 *
 * ⚠️ ONE PASSWORD ON MANY SITES is what makes this one click — and what makes it worth guarding: a leak at one employer's
 * site would expose it everywhere it was used. The panel says so where the password is set, and asks for a password used
 * nowhere else.
 *
 * Attached to a global (MV3 content scripts are not modules); tested through it.
 */
;(function (root) {
  const visible = (el) => {
    if (!el || el.disabled || el.type === 'hidden') return false
    const st = el.ownerDocument?.defaultView?.getComputedStyle?.(el)
    return !(st && (st.display === 'none' || st.visibility === 'hidden'))
  }
  const text = (el) => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim()

  /** Visible password boxes, in document order. */
  const passwordBoxes = (doc) => [...doc.querySelectorAll('input[type="password"]')].filter(visible)
  const scopeOf = (doc, pw) => pw.closest?.('form') || doc.body

  /** 'signup' (two password boxes, or the form says so), 'login', or null when there is no password box. */
  function kind(doc) {
    const boxes = passwordBoxes(doc)
    if (!boxes.length) return null
    if (boxes.length >= 2) return 'signup'
    const words = text(scopeOf(doc, boxes[0])).toLowerCase().slice(0, 4000)
    return /create (an? )?account|create your account|sign ?up|register|new account|choose a password|confirm password|verify password/.test(words) ? 'signup' : 'login'
  }

  /** The email / username box in the same form as the password box. */
  function emailBox(doc) {
    const pw = passwordBoxes(doc)[0]
    if (!pw) return null
    const boxes = [...scopeOf(doc, pw).querySelectorAll('input')].filter((i) => visible(i) && !['password', 'checkbox', 'radio', 'file', 'submit', 'button'].includes((i.type || 'text').toLowerCase()))
    const sig = (i) => `${i.type} ${i.name} ${i.id} ${i.getAttribute('autocomplete') || ''} ${i.getAttribute('aria-label') || ''} ${i.placeholder || ''}`.toLowerCase()
    return boxes.find((i) => /e-?mail|username|user name|login/.test(sig(i))) || boxes.find((i) => (i.type || '').toLowerCase() === 'email') || boxes[0] || null
  }

  /**
   * Write the email. An email already typed is left as the person wrote it. Never touches a password box.
   * Returns { filled, hadEmailBox }.
   */
  function fillEmail(doc, email) {
    const box = emailBox(doc)
    let filled = false
    if (box && email && !String(box.value || '').trim()) { root.SaafAutofill.setNativeValue(box, email); filled = true }
    return { filled, hadEmailBox: !!box }
  }

  /**
   * Why a password cannot be saved, or null. Most sites (Workday among them) demand upper and lower case, a digit and a
   * symbol; a password that fails there would leave the person stuck on the first form, so it is refused up front.
   */
  /** The five rules, each with whether this password meets it — drawn as a live tick-list while the person types. */
  function passwordRules(pw) {
    const p = String(pw || '')
    return [
      { ok: p.length >= 12, label: 'At least 12 characters' },
      { ok: /[A-Z]/.test(p), label: 'Uppercase letter' },
      { ok: /[a-z]/.test(p), label: 'Lowercase letter' },
      { ok: /\d/.test(p), label: 'Number' },
      { ok: /[^A-Za-z0-9]/.test(p), label: 'Special character' },
    ]
  }

  function passwordProblem(pw) {
    const bad = passwordRules(pw).filter((r) => !r.ok)
    return bad.length ? `Still needed: ${bad.map((r) => r.label.toLowerCase()).join(', ')}.` : null
  }

  /**
   * Write the saved password into the form: every visible password box on a create-account form (password and confirm),
   * the first on a sign-in form. A box that already holds something is left as the person typed it.
   * Returns how many boxes were written.
   */
  function fillPassword(doc, password, which) {
    if (!password) return 0
    const boxes = passwordBoxes(doc)
    const targets = which === 'login' ? boxes.slice(0, 1) : boxes
    let n = 0
    for (const b of targets) {
      if (String(b.value || '').trim()) continue
      root.SaafAutofill.setNativeValue(b, password)
      n++
    }
    return n
  }

  /** A form's own wording around a tick-box: its label, its aria-label, or the line it sits in. */
  function labelOf(box) {
    const doc = box.ownerDocument
    const bits = []
    if (box.id) { const l = doc.querySelector(`label[for="${CSS.escape(box.id)}"]`); if (l) bits.push(text(l)) }
    const wrap = box.closest?.('label'); if (wrap) bits.push(text(wrap))
    bits.push(box.getAttribute?.('aria-label') || '')
    if (!bits.join('').trim()) bits.push(text(box.parentElement).slice(0, 300))
    return bits.join(' ')
  }

  /**
   * Unticked agreement boxes on the form ("I agree to the terms", "I acknowledge the privacy notice", any required one).
   * These are the person's to tick: accepting a site's terms is never done on their behalf.
   */
  const NOT_AN_AGREEMENT = /newsletter|marketing|promotion|offers|subscribe|email me|e-mail me|contact me|text me|sms|share my|talent community|job alerts?/i
  function agreementBoxes(doc) {
    const pw = passwordBoxes(doc)[0]
    if (!pw) return []
    return [...scopeOf(doc, pw).querySelectorAll('input[type="checkbox"], [role="checkbox"]')].filter((c) => {
      if (!visible(c)) return false
      const ticked = c.checked === true || c.getAttribute?.('aria-checked') === 'true'
      const label = labelOf(c)
      return !ticked && !NOT_AN_AGREEMENT.test(label) && (c.required || c.getAttribute?.('aria-required') === 'true' || /agree|acknowledg|terms|privacy|consent|accept|policy/i.test(label))
    })
  }

  const NOT_THE_BUTTON = /google|linkedin|facebook|apple|microsoft|github|forgot|already|cancel|back|reset|show|hide|help|save for later/i
  const BUTTONS = {
    signup: [/create\s*(an?\s*)?account|sign\s*up|register|join\b/i, /^(continue|next|submit)$/i],
    login: [/sign\s*in|log\s*in/i, /^(continue|next|submit)$/i],
  }

  /** The site's own Create account / Sign in button — found in the password box's form, or on the page. */
  function submitButton(doc, which) {
    const pw = passwordBoxes(doc)[0]
    if (!pw) return null
    const scopes = [scopeOf(doc, pw), doc.body]
    const nameOf = (b) => (b.getAttribute?.('aria-label') || b.value || text(b) || '').trim()
    for (const re of BUTTONS[which === 'login' ? 'login' : 'signup']) {
      for (const scope of scopes) {
        const hit = [...scope.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]')]
          .find((b) => visible(b) && re.test(nameOf(b)) && !NOT_THE_BUTTON.test(nameOf(b)))
        if (hit) return hit
      }
    }
    return null
  }

  /**
   * Press the site's button — unless an agreement box is still unticked. Then nothing is pressed, the box is outlined and
   * scrolled to, and the caller says so: the person ticks it and presses the panel button again. With
   * `{ tickAgreement: true }` — the person's own advance choice — the agreement boxes are ticked first.
   * Returns { pressed, waitingOn: [boxes], hadButton, ticked }.
   */
  function proceed(doc, which, opts = {}) {
    let ticked = 0
    if (which === 'signup') {
      if (opts.tickAgreement) {
        for (const c of agreementBoxes(doc)) { try { c.click(); ticked++ } catch { /* not clickable */ } }
      }
      const open = agreementBoxes(doc)
      if (open.length) {
        for (const c of open) {
          try { c.style.outline = '3px solid #f59e0b'; c.style.outlineOffset = '2px' } catch { /* not styleable */ }
        }
        try { open[0].scrollIntoView({ block: 'center', behavior: 'smooth' }) } catch { /* no layout */ }
        return { pressed: false, waitingOn: open, hadButton: !!submitButton(doc, which), ticked }
      }
    }
    const btn = submitButton(doc, which)
    if (!btn) return { pressed: false, waitingOn: [], hadButton: false, ticked }
    btn.click()
    return { pressed: true, waitingOn: [], hadButton: true, ticked }
  }

  root.SaafAccount = { kind, emailBox, passwordBoxes, fillEmail, passwordRules, passwordProblem, fillPassword, agreementBoxes, submitButton, proceed }
})(typeof globalThis !== 'undefined' ? globalThis : window)
