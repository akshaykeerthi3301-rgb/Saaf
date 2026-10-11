/**
 * Jobinko extension — the account wall: a site that makes you sign in, or create an account, before you can apply.
 *
 * ⚠️ THE FOUNDER CHOSE THE EMAIL-ONLY VERSION (2026-10-12), AND THAT IS THE WHOLE FEATURE. It recognises a sign-in or
 * create-account form and writes the person's EMAIL into it. It never writes a password, never generates one, never
 * reads one and never stores one — not in the extension, not at Jobinko. The password box is left to the browser: Chrome
 * offers a strong password on a create-account form and the saved one on a sign-in form, and remembers it in its own
 * encrypted password manager. A "verify your email" step and any CAPTCHA are the person's.
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

  /** Visible password boxes, in document order. Only ever FOUND, to locate the form — never read or written. */
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
   * Write the email, then put the cursor in the password box so the browser's own password manager takes over.
   * Returns { filled, focused }. An email already typed is left as the person wrote it.
   */
  function fillEmail(doc, email) {
    const box = emailBox(doc)
    const pw = passwordBoxes(doc)[0]
    let filled = false
    if (box && email && !String(box.value || '').trim()) { root.SaafAutofill.setNativeValue(box, email); filled = true }
    let focused = false
    try { if (pw) { pw.focus(); focused = true } } catch { /* not focusable */ }
    return { filled, focused, hadEmailBox: !!box }
  }

  root.SaafAccount = { kind, emailBox, passwordBoxes, fillEmail }
})(typeof globalThis !== 'undefined' ? globalThis : window)
