/**
 * Saaf extension — deterministic ATS form autofill.
 *
 * ⚠️ ZERO TOKENS, BY CONSTRUCTION. This is a mapping from stored profile fields
 * to form inputs. No model is involved and none should be: Groq's free tier is
 * 8,000 tokens a MINUTE shared across every environment on the key, which is
 * about three generations a minute site-wide (src/lib/parse/llm.ts). A
 * generative autofill would be inoperable at 100 users; this one is free at any
 * number.
 *
 * ⚠️ IT FILLS, IT NEVER SUBMITS. The locked decision is that Saaf never applies
 * on the candidate's behalf. Assisted application is in scope and automatic
 * application never is, so nothing here clicks a button, and the fill only runs
 * when the candidate asks for it — never on page load.
 *
 * ⚠️ THE REFUSAL LIST IS THE INTERESTING HALF. Most of what this module knows is
 * what NOT to touch, and each refusal is surfaced to the candidate with its
 * reason rather than silently skipped. A form filler that quietly leaves gaps
 * looks broken; one that says "salary expectation — yours to answer" is making
 * an argument.
 *
 * Attached to a global rather than exported, because MV3 content scripts are
 * not ES modules. The test imports this file for its side effect and reads the
 * same global.
 */
;(function (root) {
  /**
   * Never filled, with the reason the candidate is shown.
   *
   * Three categories and they are refused for different reasons:
   *  - MONEY      an anchor the candidate should set deliberately, not inherit
   *               from a box we filled. Also: we do not hold a reliable figure.
   *  - PROTECTED  demographic and EEO questions. Answering these for somebody is
   *               not assistance, and several are unlawful to require in India.
   *               Caste, religion and marital status appear on real Indian forms.
   *  - WRITTEN    free text the employer asked THEM. A pre-filled "why do you
   *               want to work here" is the auto-apply failure mode in miniature.
   */
  const REFUSALS = [
    // "Total Target Cash expectation" is a real Bluevine/Greenhouse field and it
    // contains none of salary, CTC, pay or compensation. Any *expectation* of
    // *cash* is money; so is a "band", a "range" and an "in hand" figure.
    { re: /\b(salary|compensation|ctc|cost\s*to\s*company|remuneration|package|payout|in\s*hand|take\s*home|target\s*cash|expected\s*(pay|cash|amount)|(pay|cash|comp)\s*expectation|expectation\b.*\bcash|cash\b.*\bexpectation|desired\s*(pay|salary)|\bpay\s*(range|band|expectation))\b/i,
      reason: 'salary — yours to set, and we hold no figure we trust' },
    // ⚠️ STEMS NEED NO TRAILING \b. `\bdisab\b` never matched "Disability" —
    // the boundary requires a non-word character and the word continues. Caught
    // by the test, which is the entire reason a form filler has one.
    { re: /\b(gender|sex|sexual|race|ethnic|ethnicity|veteran|disabilit|disabled|orientation|pronoun|caste|religion|marital|pregnan|date\s*of\s*birth|\bdob\b|age\b)/i,
      reason: 'a demographic question — yours alone to answer' },
    { re: /\b(why\s*(do\s*)?you|cover\s*letter|motivation|tell\s*us|describe|essay|what\s*interests|in\s*your\s*own\s*words)\b/i,
      reason: 'free text the employer asked you — not us' },
    { re: /\b(password|passcode|ssn|social\s*security|aadhaar|\bpan\b|bank|account\s*number|ifsc)\b/i,
      reason: 'a credential or identity number — never entered by us' },
  ]

  /**
   * Field patterns, MOST SPECIFIC FIRST, because the loop takes the first hit.
   * "current employer" has to beat "employer"; "full name" has to beat "name",
   * and "first name" has to beat both or everyone is called by their full name
   * in the first-name box.
   */
  const FIELDS = [
    { key: 'firstName',       re: /\b(first\s*name|given\s*name|forename|fname)\b/i },
    { key: 'lastName',        re: /\b(last\s*name|surname|family\s*name|lname)\b/i },
    { key: 'fullName',        re: /\b(full\s*name|your\s*name|candidate\s*name|^name$|applicant\s*name)\b/i },
    { key: 'email',           re: /\b(e-?mail|email\s*address)\b/i },
    { key: 'phone',           re: /\b(phone|mobile|contact\s*number|telephone|cell)\b/i },
    { key: 'linkedin',        re: /\b(linked-?in)\b/i },
    { key: 'portfolio',       re: /\b(portfolio|website|personal\s*site|github|behance|dribbble)\b/i },
    { key: 'currentTitle',    re: /\b(current\s*(job\s*)?title|current\s*role|present\s*designation|job\s*title|designation)\b/i },
    { key: 'currentEmployer', re: /\b(current\s*(employer|company|organisation|organization)|present\s*employer|employer|company\s*name)\b/i },
    // "How many years of total work experience do you have?" is the real
    // Greenhouse wording and `years of experience` does not match it — there are
    // two words in between. Allow any short run between "years of" and
    // "experience".
    { key: 'yearsExperience', re: /\b(years?\s*of\s*(\w+\s+){0,3}experience|total\s*experience|experience\s*\(years?\)|yrs\s*exp|how\s*many\s*years)\b/i },
    { key: 'noticePeriod',    re: /\b(notice\s*period|availability|when\s*can\s*you\s*(start|join)|joining\s*time)\b/i },
    { key: 'city',            re: /\b(city|current\s*location|location|based\s*in|town)\b/i },
    // ⚠️ NO TRAILING \b — THIRD TIME THIS EXACT MISTAKE APPEARED IN THIS FILE.
    // `work\s*authoris\b` never matches "Work authorisation status", because
    // the boundary needs a non-word character and the word carries on. Same
    // shape as `\bdisab\b` failing on "Disability". **A stem takes \b at the
    // START only.** Grep this file for `\b/i` before adding a pattern.
    { key: 'workAuth',        re: /\b(work\s*authoriz|work\s*authoris|right\s*to\s*work|visa\s*status|legally\s*authoriz)/i },
  ]

  /**
   * Everything the page says about one input, joined into one haystack.
   * Order is deliberate: an explicit label beats a placeholder, which beats a
   * machine name like `cand_fn_1`, but all of them are searched because ATS
   * forms are wildly inconsistent about which they provide.
   */
  function signalsFor(el, doc) {
    const bits = []
    if (el.id && doc) {
      const lab = doc.querySelector(`label[for="${CSS.escape(el.id)}"]`)
      if (lab) bits.push(lab.textContent || '')
    }
    const wrapping = el.closest ? el.closest('label') : null
    if (wrapping) bits.push(wrapping.textContent || '')
    bits.push(el.getAttribute?.('aria-label') || '')
    bits.push(el.getAttribute?.('placeholder') || '')
    bits.push(el.getAttribute?.('autocomplete') || '')
    bits.push(el.getAttribute?.('name') || '')
    bits.push(el.id || '')
    /**
     * ⚠️ SEPARATORS BECOME SPACES, AND WITHOUT THIS THE WHOLE MODULE IS INERT
     * ON REAL FORMS. Machine names are snake_case or kebab-case almost
     * universally — `full_name`, `expected_ctc`, `first-name`, `cand.email` —
     * and every pattern here is written with `\s*` between words, which does
     * not match an underscore. The first version matched single-word labels
     * like "gender" and nothing else, so on a genuine ATS form it would have
     * filled nothing, refused nothing, and reported success. Caught by the
     * fillForm tests, which is the reason they use attribute names rather than
     * tidy human labels.
     */
    return bits.join(' ').replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim()
  }

  /**
   * What this input is, or why we will not touch it.
   * Returns { key } | { refused, reason } | null.
   *
   * ⚠️ REFUSALS ARE CHECKED FIRST AND THAT ORDER IS LOAD-BEARING. "Expected CTC"
   * also matches nothing else, but "current company salary band" matches both
   * `currentEmployer` and the money refusal — and the refusal has to win. When
   * the two disagree, not filling is always the safe answer.
   */
  /**
   * ⚠️ A YES/NO QUESTION IS NEVER ANSWERED WITH A FACT, AND THIS IS THE ONE THAT
   * ACTUALLY WENT WRONG ON A REAL FORM. Bluevine's Greenhouse application asks
   * "Are you currently based in Bengaluru ?" as a free-text box. That matches
   * the `city` pattern via "based in", so the first version wrote **Bengaluru**
   * into it — where the employer expected "Yes". A recruiter reads a non-answer
   * and the candidate never sees why.
   *
   * We hold facts, not answers to questions about those facts, and turning one
   * into the other is inference. So an interrogative box is skipped and left to
   * the candidate, whatever else it matches.
   */
  const INTERROGATIVE = /^\s*(are|do|did|does|have|has|will|would|can|could|is|were|was)\s+you\b|\?\s*\*?\s*$/i

  function classify(signals) {
    if (!signals) return null
    for (const r of REFUSALS) if (r.re.test(signals)) return { refused: true, reason: r.reason }
    const field = FIELDS.find((f) => f.re.test(signals))
    if (!field) return null
    // A question wins over the field match, except where the question IS the
    // field — "How many years of experience do you have?" wants the number, and
    // "What is your notice period?" wants the period. Those ask for a value; a
    // yes/no asks for a judgement.
    if (INTERROGATIVE.test(signals) && !['yearsExperience', 'noticePeriod'].includes(field.key)) {
      return { refused: true, reason: 'a yes/no question — we hold facts, not answers' }
    }
    return { key: field.key }
  }

  /** Values for each key, from the stored profile. Undefined means "no value". */
  function valueFor(key, p) {
    const full = (p.fullName || '').trim()
    switch (key) {
      case 'fullName': return full
      case 'firstName': return full.split(/\s+/)[0]
      case 'lastName': return full.split(/\s+/).slice(1).join(' ')
      case 'email': return p.email
      case 'phone': return p.phone
      case 'linkedin': return p.linkedin
      case 'portfolio': return p.portfolio
      case 'currentTitle': return p.currentTitle
      case 'currentEmployer': return p.currentEmployer
      case 'yearsExperience': return p.yearsExperience
      case 'noticePeriod': return p.noticePeriod
      case 'city': return p.city
      case 'workAuth': return p.workAuth
      default: return undefined
    }
  }

  /** An input we may write to at all, before we know what it is. */
  function isFillable(el) {
    if (!el || el.disabled || el.readOnly) return false
    const tag = (el.tagName || '').toLowerCase()
    if (tag === 'select' || tag === 'textarea') return tag === 'textarea'
    if (tag !== 'input') return false
    const type = (el.type || 'text').toLowerCase()
    // Never a file, never a password, never a checkbox or radio — those encode a
    // choice rather than a fact, and a wrong one is invisible to the candidate.
    return ['text', 'email', 'tel', 'url', 'number', 'search'].includes(type)
  }

  /**
   * Fill what we can, report everything.
   * Returns { filled: [{key, value}], refused: [{reason}], skipped: n }.
   * Never submits, never clicks, never navigates.
   */
  function fillForm(profile, doc) {
    const out = { filled: [], refused: [], skipped: 0 }
    const seen = new Set()
    for (const el of doc.querySelectorAll('input, textarea')) {
      if (!isFillable(el)) continue
      const verdict = classify(signalsFor(el, doc))
      if (!verdict) { out.skipped++; continue }
      if (verdict.refused) {
        if (!out.refused.some((r) => r.reason === verdict.reason)) out.refused.push({ reason: verdict.reason })
        continue
      }
      // An answer the candidate already typed is never overwritten.
      if (el.value && el.value.trim()) { out.skipped++; continue }
      const value = valueFor(verdict.key, profile)
      if (!value) { out.skipped++; continue }
      if (seen.has(verdict.key) && verdict.key !== 'city') { out.skipped++; continue }
      seen.add(verdict.key)

      el.value = value
      // React and most ATS front ends listen for these rather than reading
      // .value, so a silent assignment looks filled and submits empty.
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      out.filled.push({ key: verdict.key, value })
    }
    return out
  }

  root.SaafAutofill = { classify, signalsFor, valueFor, isFillable, fillForm, REFUSALS, FIELDS }
})(typeof globalThis !== 'undefined' ? globalThis : window)
