/**
 * Jobinko extension — deterministic ATS form autofill.
 *
 * ⚠️ ZERO TOKENS, BY CONSTRUCTION. This is a mapping from stored profile fields
 * to form inputs. No model is involved and none should be: Groq's free tier is
 * 8,000 tokens a MINUTE shared across every environment on the key, which is
 * about three generations a minute site-wide (src/lib/parse/llm.ts). A
 * generative autofill would be inoperable at 100 users; this one is free at any
 * number.
 *
 * ⚠️ IT FILLS, IT NEVER SUBMITS. The locked decision is that Jobinko never applies
 * on the candidate's behalf. Assisted application is in scope and automatic
 * application never is. The only things this module ever clicks are the radio,
 * tick-box or dropdown OPTION it chose — never a button, a link, or anything
 * that submits or navigates — and it only runs when the candidate asks.
 *
 * ⚠️ WHAT CHANGED ON 2026-09-25, BY FOUNDER DIRECTION (Jobright parity).
 * Until then this refused salary, every dropdown, every radio and tick-box, and
 * file inputs. It now fills them — but only from answers the CANDIDATE typed:
 *  - Salary/CTC comes from the figure they entered in the extension. With none
 *    stored it is still refused, with the reason. We never guess one.
 *  - Yes/no questions (work authorisation, sponsorship, relocation) are answered
 *    from their own stored yes/no, never inferred from other facts. "Are you
 *    based in Bengaluru?" is still refused: answering it means inferring from
 *    the city, which is the mistake that went wrong on a real form.
 *  - Choices (dropdown option, radio, tick-box) are picked only when exactly one
 *    option matches. Every pick is listed back on the card, because a wrong
 *    choice in a closed dropdown is the one the candidate is least likely to see.
 *  - The résumé file is attached only to an upload whose label says résumé/CV.
 * Still refused, and not a preference: free text the employer asked them,
 * consent boxes, credentials and identity numbers.
 *
 * ⚠️ DEMOGRAPHIC / EEO QUESTIONS ARE REFUSED BY DEFAULT, AND ANSWERED ONLY FROM
 * WORDS THE CANDIDATE TYPED THEMSELVES (2026-10-08, TASK-171). The default has
 * not moved: with no answer stored, every one of them is left for the person.
 * A candidate who wants it can type their own answer once on the web profile
 * ("Prefer not to say" is the starting state of every question); the extension
 * then fills ONLY that question, ONLY with those words, and matches an option
 * by exact text — never "contains", because "Male" is inside "Female". Never
 * inferred from anything else on the profile. Date of birth, age and pregnancy
 * are not on that list and stay refused for everyone.
 *
 * ⚠️ A CUSTOM QUESTION IS ANSWERED ONLY WITH WORDS THE CANDIDATE WROTE FOR THAT
 * EXACT QUESTION (2026-10-08, TASK-194). Employers add their own free-text
 * questions ("Why Razorpay?"). The candidate can write an answer in Jobinko once;
 * it is filled only when a form asks the same question — compared after
 * lower-casing and dropping punctuation, never "similar", never a model's
 * guess. A required question with no saved answer is not guessed either: it is
 * reported back so the candidate can answer it in Jobinko, and filled next time.
 * Demographic, credential and consent questions never come from this bank, and
 * Apply for me uses an answer only if the candidate ticked it for that.
 *
 * Attached to a global rather than exported, because MV3 content scripts are
 * not ES modules. The test imports this file for its side effect and reads the
 * same global.
 */
;(function (root) {
  /**
   * Never filled, with the reason the candidate is shown.
   *
   *  - PROTECTED  demographic and EEO questions. Answering these for somebody is
   *               not assistance, and several are unlawful to require in India.
   *               Caste, religion and marital status appear on real Indian forms.
   *  - WRITTEN    free text the employer asked THEM. A pre-filled "why do you
   *               want to work here" is the auto-apply failure mode in miniature.
   *  - CREDENTIAL never entered by us, anywhere.
   *  - CONSENT    ticking "I agree" is accepting terms on their behalf.
   */
  const REFUSALS = [
    // ⚠️ STEMS NEED NO TRAILING \b. `\bdisab\b` never matched "Disability" —
    // the boundary requires a non-word character and the word continues. Caught
    // by the test, which is the entire reason a form filler has one.
    { re: /\b(gender|sex|sexual|race|ethnic|ethnicity|veteran|disabilit|disabled|orientation|pronoun|caste|religion|marital|pregnan|date\s*of\s*birth|\bdob\b|age\b)/i,
      reason: 'a demographic question — yours alone to answer', selfId: true },
    { re: /\b(why\s*(do\s*)?you|cover\s*letter|motivation|tell\s*us|describe|essay|what\s*interests|in\s*your\s*own\s*words)\b/i,
      reason: 'free text the employer asked you — not us', written: true },
    { re: /\b(password|passcode|ssn|social\s*security|aadhaar|\bpan\b|bank|account\s*number|ifsc)\b/i,
      reason: 'a credential or identity number — never entered by us' },
    { re: /\b(i\s*agree|agree\s*to|consent|terms\s*(and|&)\s*conditions|privacy\s*(policy|notice)|i\s*(hereby\s*)?(certify|confirm|declare|acknowledge))/i,
      reason: 'a consent box — yours to agree to' },
  ]

  /**
   * The demographic questions a candidate may answer THEMSELVES, one key each.
   * A label that matches more than one ("Gender and sexual orientation") is two
   * questions in one box and is refused — we will not split someone's answer.
   * Mirrors src/lib/self-id.ts (the web form that stores them).
   */
  const SELF_ID = [
    { key: 'gender', re: /\b(gender|sex)\b/i },
    { key: 'pronouns', re: /\bpronoun/i },
    { key: 'ethnicity', re: /\b(race|racial|ethnic)/i },
    { key: 'disability', re: /\b(disabilit|disabled)/i },
    { key: 'veteran', re: /\bveteran/i },
    { key: 'orientation', re: /\b(sexual|orientation)/i },
    { key: 'caste', re: /\bcaste\b/i },
    { key: 'religion', re: /\breligio/i },
    { key: 'marital', re: /\bmarital/i },
  ]
  /** Never answered, for anyone, whatever is stored — and a label that mentions one is refused whole. */
  const NEVER_ANSWERED = /\b(pregnan|date\s*of\s*birth|dob\b|age\b)/i
  const SELF_ID_YES_NO = new Set(['selfId:disability', 'selfId:veteran'])
  /** Accepted option texts for a stored gender: forms say Man/Woman as often as Male/Female. */
  const GENDER_WORDS = { male: ['male', 'man'], female: ['female', 'woman'], 'non binary': ['non binary', 'nonbinary'] }

  /** The self-ID key for this label, only when exactly one question matches AND the candidate typed an answer. */
  function selfIdKey(signals, selfId) {
    if (!selfId || NEVER_ANSWERED.test(signals)) return null
    const hits = SELF_ID.filter((q) => q.re.test(signals))
    if (hits.length !== 1) return null
    const v = selfId[hits[0].key]
    return typeof v === 'string' && v.trim() ? `selfId:${hits[0].key}` : null
  }

  /**
   * Money. Formerly a refusal; now a field filled from the candidate's own
   * figure. "Total Target Cash expectation" is a real Bluevine/Greenhouse field
   * and contains none of salary, CTC, pay or compensation — any *expectation*
   * of *cash* is money; so is a "band", a "range" and an "in hand" figure.
   */
  const MONEY = /\b(salary|compensation|ctc|cost\s*to\s*company|remuneration|package|payout|in\s*hand|take\s*home|target\s*cash|expected\s*(pay|cash|amount)|(pay|cash|comp)\s*expectation|expectation\b.*\bcash|cash\b.*\bexpectation|desired\s*(pay|salary)|\bpay\s*(range|band|expectation))\b/i
  const EXPECTED = /\b(expect|expected|expectation|desired|target|asking|looking\s*for)/i

  /**
   * Yes/no questions we answer ONLY from the candidate's stored yes/no.
   * Checked before FIELDS, so "Are you legally authorised to work in India?"
   * reaches the stored answer rather than the free-text work-auth statement.
   */
  const ANSWERS = [
    { key: 'needsSponsorship', re: /\b(sponsor|require\s*(a\s*)?visa|need\s*(a\s*)?visa)/i },
    { key: 'authorisedToWork', re: /\b(legally\s*authori[sz]|authori[sz]ed\s*to\s*work|eligible\s*to\s*work|right\s*to\s*work|work\s*permit)/i },
    { key: 'willingToRelocate', re: /\brelocat/i },
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
    // Before `city`: "Preferred locations" contains "location".
    { key: 'preferredLocations', re: /\b(preferred\s*(work\s*)?(locations?|cities)|locations?\s*(you\s*)?prefer|open\s*to\s*(work\s*in|relocat\w*\s*to))\b/i },
    { key: 'city',            re: /\b(city|current\s*location|location|based\s*in|town)\b/i },
    // ⚠️ NO TRAILING \b — THIRD TIME THIS EXACT MISTAKE APPEARED IN THIS FILE.
    // `work\s*authoris\b` never matches "Work authorisation status", because
    // the boundary needs a non-word character and the word carries on. Same
    // shape as `\bdisab\b` failing on "Disability". **A stem takes \b at the
    // START only.** Grep this file for `\b/i` before adding a pattern.
    { key: 'workAuth',        re: /\b(work\s*authoriz|work\s*authoris|visa\s*status)/i },
  ]

  /** How each key is matched against a choice, and how it is written as text. */
  const NUMERIC = { yearsExperience: 'years', noticePeriod: 'days', currentCtc: 'lakhs', expectedCtc: 'lakhs' }
  const YES_NO = new Set([...ANSWERS.map((a) => a.key), ...SELF_ID_YES_NO])

  /** Why a recognised field went unfilled when the candidate stored nothing. */
  const MISSING = {
    currentCtc: 'salary — add your own figure in the extension to fill it; we never guess one',
    expectedCtc: 'salary — add your own figure in the extension to fill it; we never guess one',
    needsSponsorship: 'a yes/no question — add your answer in the extension to fill it',
    authorisedToWork: 'a yes/no question — add your answer in the extension to fill it',
    willingToRelocate: 'a yes/no question — add your answer in the extension to fill it',
  }

  const textOf = (n) => (n ? (n.textContent || '') : '')

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
      if (lab) bits.push(textOf(lab))
    }
    const wrapping = el.closest ? el.closest('label') : null
    if (wrapping) bits.push(textOf(wrapping))
    bits.push(el.getAttribute?.('aria-label') || '')
    const by = el.getAttribute?.('aria-labelledby')
    if (by && doc) for (const id of by.split(/\s+/)) bits.push(textOf(doc.getElementById?.(id)))
    bits.push(el.getAttribute?.('placeholder') || '')
    bits.push(el.getAttribute?.('autocomplete') || '')
    bits.push(el.getAttribute?.('name') || '')
    bits.push(el.id || '')
    return tidy(bits.join(' '))
  }

  // ------------------------------------------------------ saved answers (bank) --

  /**
   * One question, one key: lower-case, "(optional)"/"(required)" and every mark
   * of punctuation dropped, spaces collapsed. Mirrored by questionKey() in
   * src/lib/answer-bank.ts — extension/answer-bank.test.ts fails if they drift.
   */
  function questionKey(label) {
    return String(label || '').toLowerCase()
      .replace(/\((optional|required)\)/g, ' ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 200)
  }

  /** The question as the page words it — the label, not the machine names signalsFor also searches. */
  function questionLabel(el, doc) {
    const first = (...bits) => bits.map((b) => tidy(b || '')).find(Boolean) || ''
    const lab = el.id && doc ? doc.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null
    const by = el.getAttribute?.('aria-labelledby')
    return first(
      textOf(lab),
      textOf(el.closest ? el.closest('label') : null),
      el.getAttribute?.('aria-label'),
      by && doc ? by.split(/\s+/).map((id) => textOf(doc.getElementById?.(id))).join(' ') : '',
      el.getAttribute?.('placeholder'),
    )
  }

  /** A plain text box or text area — not a picker, a number or an email field. */
  function isTextBox(el) {
    const tag = (el.tagName || '').toLowerCase()
    if (el.getAttribute?.('role') === 'combobox' || el.getAttribute?.('aria-autocomplete') === 'list') return false
    return tag === 'textarea' || (tag === 'input' && ['text', ''].includes((el.type || 'text').toLowerCase()))
  }

  /** Demographic, credential and consent questions: the bank is never consulted, whatever it holds. */
  const neverFromBank = (signals) => NEVER_ANSWERED.test(signals) || REFUSALS.some((r) => !r.written && r.re.test(signals))

  const isRequiredEl = (el) => !!el.required || el.getAttribute?.('aria-required') === 'true'

  /**
   * ⚠️ SEPARATORS BECOME SPACES, AND WITHOUT THIS THE WHOLE MODULE IS INERT ON
   * REAL FORMS. Machine names are snake_case or kebab-case almost universally —
   * `full_name`, `expected_ctc`, `first-name`, `cand.email` — and every pattern
   * here is written with `\s*` between words, which does not match an
   * underscore. Caught by the fillForm tests, which is the reason they use
   * attribute names rather than tidy human labels.
   */
  function tidy(s) {
    return s.replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim()
  }

  /**
   * The question a radio or tick-box GROUP asks: the fieldset legend, the
   * radiogroup's own label, or the group's machine name. An option's own label
   * ("Yes", "Bengaluru") is the answer, not the question.
   */
  function questionFor(el, doc) {
    const bits = []
    const fs = el.closest ? el.closest('fieldset') : null
    if (fs) bits.push(textOf(fs.querySelector('legend')))
    const group = el.closest ? el.closest('[role="radiogroup"], [role="group"]') : null
    if (group) {
      bits.push(group.getAttribute('aria-label') || '')
      const by = group.getAttribute('aria-labelledby')
      if (by && doc) for (const id of by.split(/\s+/)) bits.push(textOf(doc.getElementById?.(id)))
    }
    bits.push(el.getAttribute?.('name') || '')
    return tidy(bits.join(' '))
  }

  /** The visible label of one option (radio or tick-box). */
  function optionLabel(el, doc) {
    if (el.id && doc) {
      const lab = doc.querySelector(`label[for="${CSS.escape(el.id)}"]`)
      if (lab) return textOf(lab).trim()
    }
    const wrapping = el.closest ? el.closest('label') : null
    if (wrapping) return textOf(wrapping).trim()
    return (el.getAttribute?.('aria-label') || el.value || '').trim()
  }

  /**
   * ⚠️ A YES/NO QUESTION IS NEVER ANSWERED WITH A FACT, AND THIS IS THE ONE THAT
   * ACTUALLY WENT WRONG ON A REAL FORM. Bluevine's Greenhouse application asks
   * "Are you currently based in Bengaluru ?" as a free-text box. That matches
   * the `city` pattern via "based in", so the first version wrote **Bengaluru**
   * into it — where the employer expected "Yes". Only questions in ANSWERS are
   * answered, and only from the candidate's own stored yes/no.
   */
  const INTERROGATIVE = /^\s*(are|do|did|does|have|has|will|would|can|could|is|were|was)\s+you\b|\?\s*\*?\s*$/i

  /**
   * What this input is, or why we will not touch it.
   * Returns { key } | { refused, reason } | null.
   *
   * ⚠️ REFUSALS ARE CHECKED FIRST AND THAT ORDER IS LOAD-BEARING. When a label
   * matches both a refusal and a field, not filling is always the safe answer.
   * Money next, because "Current company salary band" also matches
   * `currentEmployer`, and the employer's name is not a salary.
   */
  function classify(signals, selfId) {
    if (!signals) return null
    for (const r of REFUSALS) {
      if (!r.re.test(signals)) continue
      // A demographic question is the one refusal a candidate's own typed
      // answer can lift — for exactly that question, never for a neighbour.
      if (r.selfId) {
        const key = selfIdKey(signals, selfId)
        if (key) return { key }
      }
      return { refused: true, reason: r.reason }
    }
    if (MONEY.test(signals)) return { key: EXPECTED.test(signals) ? 'expectedCtc' : 'currentCtc' }
    const answer = ANSWERS.find((a) => a.re.test(signals))
    if (answer) return { key: answer.key }
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
    if (key.startsWith('selfId:')) {
      const v = p.selfId && p.selfId[key.slice(7)]
      if (SELF_ID_YES_NO.has(key)) return yesNo(v)
      return typeof v === 'string' && v.trim() ? v.trim() : undefined
    }
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
      case 'preferredLocations': return p.preferredLocations
      case 'workAuth': return p.workAuth
      case 'currentCtc': return p.currentCtcLakhs
      case 'expectedCtc': return p.expectedCtcLakhs
      case 'authorisedToWork': return yesNo(p.authorisedToWork)
      case 'needsSponsorship': return yesNo(p.needsSponsorship)
      case 'willingToRelocate': return yesNo(p.willingToRelocate)
      default: return undefined
    }
  }

  function yesNo(v) {
    const s = String(v || '').trim().toLowerCase()
    return s === 'yes' || s === 'no' ? s : undefined
  }

  /**
   * Notice period in days, from what the candidate typed. Indian forms bucket
   * it as Immediate / 15 / 30 / 60 / 90 days, or in months.
   */
  function noticeDays(v) {
    const s = String(v || '').toLowerCase()
    if (/immediate|serving|\bnone\b/.test(s)) return 0
    const n = parseFloat(s)
    if (Number.isNaN(n)) return null
    return /month/.test(s) ? Math.round(n * 30) : n
  }

  function numberFor(key, raw) {
    if (NUMERIC[key] === 'days') return noticeDays(raw)
    const n = parseFloat(String(raw || '').replace(/,/g, ''))
    return Number.isNaN(n) ? null : n
  }

  /**
   * A stored value as text for one particular box, or the reason it cannot be.
   *
   * ⚠️ CTC IS STORED IN LAKHS AND WRITTEN IN THE BOX'S OWN UNIT, OR NOT AT ALL.
   * "18" in a box labelled "in Lakhs" is right; "18" in a bare number box that
   * might mean rupees tells a recruiter the candidate expects eighteen rupees.
   * A text box with no unit gets "18 LPA", which no Indian recruiter misreads.
   * A box in dollars is refused: we hold an INR figure and will not convert it.
   */
  function formatFor(key, raw, el, signals) {
    const isNumberBox = (el.type || '').toLowerCase() === 'number'
    if (YES_NO.has(key)) return { value: raw === 'yes' ? 'Yes' : 'No' }
    if (key === 'currentCtc' || key === 'expectedCtc') {
      const lakhs = numberFor(key, raw)
      if (lakhs == null) return { refused: MISSING[key] }
      if (/\$|\busd\b|dollar|\beur\b|£|gbp/i.test(signals)) {
        return { refused: 'salary asked in another currency — we hold only your INR figure' }
      }
      if (/lakh|\blpa\b|\blac\b|\blacs\b/i.test(signals)) return { value: String(lakhs) }
      if (isNumberBox) {
        if (/inr|₹|rupee|per\s*annum|annual|yearly/i.test(signals)) return { value: String(Math.round(lakhs * 100000)) }
        return { refused: 'salary box with no unit — we could not tell lakhs from rupees, so left it' }
      }
      return { value: `${lakhs} LPA` }
    }
    if (key === 'noticePeriod' && isNumberBox) {
      const d = noticeDays(raw)
      return d == null ? { refused: null } : { value: String(d) }
    }
    if (key === 'yearsExperience' && isNumberBox) {
      const n = numberFor(key, raw)
      return n == null ? { refused: null } : { value: String(n) }
    }
    return { value: String(raw) }
  }

  /** An input we may write text into, before we know what it is. */
  function isFillable(el) {
    if (!el || el.disabled || el.readOnly) return false
    const tag = (el.tagName || '').toLowerCase()
    if (tag === 'textarea' || tag === 'select') return true
    if (tag !== 'input') return false
    const type = (el.type || 'text').toLowerCase()
    // Choices (radio, checkbox) and files take their own paths below; password,
    // hidden and submit are never touched by any path.
    return ['text', 'email', 'tel', 'url', 'number', 'search'].includes(type)
  }

  // ---------------------------------------------------------------- choices --

  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
  const isPlaceholder = (text, value) =>
    value === '' || /^\s*(select|choose|please|--|—|pick)\b/i.test(text || '')

  /**
   * A numeric range read out of an option label: "3-5 years", "5+", "Less
   * than 1", "Immediate", "1 month", "₹10,00,000 - ₹15,00,000". Null when the
   * label carries no number.
   */
  function rangeOf(label, unit) {
    const s = String(label || '').toLowerCase().replace(/,/g, '')
    if (unit === 'days' && /immediate/.test(s)) return { lo: 0, hi: 0 }
    const nums = (s.match(/\d+(\.\d+)?/g) || []).map(Number)
    if (!nums.length) return null
    let scale = 1
    if (unit === 'days' && /month/.test(s)) scale = 30
    if (unit === 'lakhs' && nums.some((n) => n >= 1000)) scale = 1 / 100000
    const [a, b] = nums.map((n) => n * scale)
    if (/less\s*than|under|below|up\s*to|upto|<|within/.test(s)) return { lo: 0, hi: a }
    if (/\+|more\s*than|above|over|or\s*more|>|and\s*above/.test(s)) return { lo: a, hi: Infinity }
    if (b != null) return { lo: Math.min(a, b), hi: Math.max(a, b) }
    return { lo: a, hi: a }
  }

  /**
   * The one option that matches, or null. Never guesses between two.
   * options: [{ text, value, ref }] with placeholders already removed.
   */
  function pickOption(key, raw, options) {
    if (!options.length || raw == null || raw === '') return null
    const only = (list) => (list.length === 1 ? list[0] : null)

    if (YES_NO.has(key)) {
      const want = raw === 'yes' ? /^\s*yes\b/i : /^\s*no\b/i
      return only(options.filter((o) => want.test(o.text)))
    }
    // A demographic answer matches an option by its WHOLE text, never by
    // "contains": "Male" is inside "Female", and a wrong answer here is worse
    // than an unanswered one. Gender also accepts the form's other word for it.
    if (key.startsWith('selfId:')) {
      const want = norm(raw)
      const accepted = new Set(key === 'selfId:gender' ? (GENDER_WORDS[want] || [want]) : [want])
      return only(options.filter((o) => accepted.has(norm(o.text)) || accepted.has(norm(o.value))))
    }
    if (NUMERIC[key]) {
      const n = numberFor(key, raw)
      if (n == null) return null
      const hits = options.filter((o) => {
        const r = rangeOf(o.text, NUMERIC[key])
        return r && n >= r.lo && n <= r.hi
      })
      if (hits.length <= 1) return only(hits)
      // Bins overlap at their edges ("3-5", "5-7"). Half-open decides: 5 is in
      // "5-7", not "3-5". Still two → leave it for the candidate.
      return only(hits.filter((o) => { const r = rangeOf(o.text, NUMERIC[key]); return n < r.hi || r.hi === Infinity }))
    }
    const want = norm(raw)
    if (!want) return null
    const exact = options.filter((o) => norm(o.text) === want || norm(o.value) === want)
    if (exact.length) return only(exact)
    return only(options.filter((o) => {
      const t = norm(o.text)
      return t.length >= 3 && (t.includes(want) || want.includes(t))
    }))
  }

  // ---------------------------------------------------------------- writing --

  /**
   * Write a value the way a person typing would, so framework state follows.
   *
   * ⚠️ THROUGH THE PROTOTYPE'S NATIVE SETTER, NOT `el.value =`. React (and
   * several Vue/Angular wrappers) install their own `value` property on the
   * element to track what they last rendered. A plain assignment goes through
   * that tracker, React sees "no change", swallows the input event, and the box
   * looks filled but submits empty — or is wiped on the next render. The
   * prototype's setter bypasses the tracker, so the event reads as a real edit.
   * Proven against a real React controlled input in autofill.dom.test.ts.
   */
  function setNativeValue(el, value) {
    const view = el.ownerDocument && el.ownerDocument.defaultView
    const tag = (el.tagName || '').toLowerCase()
    const Ctor = view && (tag === 'select' ? view.HTMLSelectElement : tag === 'textarea' ? view.HTMLTextAreaElement : view.HTMLInputElement)
    const setter = Ctor && Object.getOwnPropertyDescriptor(Ctor.prototype, 'value')?.set
    if (setter) setter.call(el, value)
    else el.value = value
    fire(el)
  }

  function fire(el) {
    const view = el.ownerDocument && el.ownerDocument.defaultView
    const Ev = (view && view.Event) || Event
    for (const type of ['input', 'change', 'blur']) el.dispatchEvent(new Ev(type, { bubbles: true }))
  }

  /** Attach the stored résumé to a file input. False if the page refuses it. */
  function attachFile(el, file) {
    const view = el.ownerDocument && el.ownerDocument.defaultView
    if (!view || !view.DataTransfer || !view.File) return false
    const accept = (el.getAttribute('accept') || '').toLowerCase()
    const ext = (file.name.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase()
    if (accept && !accept.split(',').some((a) => {
      a = a.trim()
      return a === ext || a === file.type || (a.endsWith('/*') && file.type.startsWith(a.slice(0, -1)))
    })) return false
    const bytes = Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0))
    const dt = new view.DataTransfer()
    dt.items.add(new view.File([bytes], file.name, { type: file.type }))
    el.files = dt.files
    fire(el)
    return true
  }

  const RESUME_UPLOAD = /(resume|résumé|\bcv\b|curriculum)/i

  /**
   * A combobox (React-Select, Headless UI, Ashby's pickers): type the value,
   * wait for the list, click the one option that matches. If none or several
   * match, the typed text is cleared again — half-typed search text in a picker
   * looks answered and is not.
   */
  async function fillCombobox(el, key, raw, text, doc, waitMs) {
    setNativeValue(el, text)
    const listId = el.getAttribute('aria-controls') || el.getAttribute('aria-owns')
    const deadline = Date.now() + waitMs
    let choice = null
    do {
      await new Promise((r) => setTimeout(r, 40))
      const scope = (listId && doc.getElementById(listId)) || doc
      const options = [...scope.querySelectorAll('[role="option"]')]
        .map((o) => ({ text: textOf(o).trim(), value: o.getAttribute('data-value') || '', ref: o }))
        .filter((o) => o.text && !/^no (options|results)/i.test(o.text))
      choice = pickOption(key, raw, options)
      if (choice) break
    } while (Date.now() < deadline)
    if (!choice) { setNativeValue(el, ''); return null }
    const view = el.ownerDocument.defaultView
    for (const type of ['mousedown', 'mouseup', 'click']) {
      choice.ref.dispatchEvent(new view.MouseEvent(type, { bubbles: true, cancelable: true }))
    }
    return choice.text
  }

  /**
   * Fill what we can, report everything.
   * Returns { filled: [{key, value, how}], refused: [{reason}], skipped: n }.
   * `how` is typed | chose | ticked | attached, so the card can say exactly
   * what was picked for the candidate to check. Never submits, never navigates.
   */
  async function fillForm(profile, doc, opts = {}) {
    const out = { filled: [], refused: [], skipped: 0, unanswered: [] }
    const refuse = (reason) => {
      if (reason && !out.refused.some((r) => r.reason === reason)) out.refused.push({ reason })
    }
    const seen = new Set()
    const waitMs = opts.waitMs ?? 800
    const all = [...doc.querySelectorAll('input, textarea, select')]

    const groups = new Map()
    for (const el of all) {
      if (el.disabled || el.readOnly) continue
      const tag = (el.tagName || '').toLowerCase()
      const type = (el.type || 'text').toLowerCase()

      // ---- choices: grouped by name, answered once per group, below.
      if (tag === 'input' && (type === 'radio' || type === 'checkbox')) {
        const name = el.getAttribute('name') || el.id || `__${groups.size}`
        if (!groups.has(name)) groups.set(name, [])
        groups.get(name).push(el)
        continue
      }

      // ---- files: only a résumé upload, only with a stored résumé file.
      if (tag === 'input' && type === 'file') {
        const signals = signalsFor(el, doc)
        if (!RESUME_UPLOAD.test(signals) || /cover/i.test(signals)) { out.skipped++; continue }
        // A file already there stays — unless it is the one this extension attached earlier (a re-run after tailoring).
        if (el.files && el.files.length && el.files[0].name !== opts.replaceResumeNamed) { out.skipped++; continue }
        if (!opts.resumeFile) { refuse('résumé upload — add your résumé PDF in the extension to attach it'); continue }
        if (attachFile(el, opts.resumeFile)) out.filled.push({ key: 'resume', value: opts.resumeFile.name, how: 'attached' })
        else refuse('résumé upload that does not accept your file type — left for you')
        continue
      }

      if (!isFillable(el)) continue
      const signals = signalsFor(el, doc)
      const verdict = classify(signals, profile.selfId)

      // ---- a custom question: the candidate's own saved answer, or a note that it is theirs to write.
      const written = !verdict || (verdict.refused && REFUSALS.find((r) => r.re.test(signals))?.written)
      if (written && isTextBox(el) && !neverFromBank(signals)) {
        const q = questionLabel(el, doc)
        const entry = q && profile.answerBank ? profile.answerBank[questionKey(q)] : null
        if (el.value && el.value.trim()) { out.skipped++; continue }
        if (entry && entry.a) {
          if (opts.mode === 'auto' && !entry.auto) { refuse('a question you answered in Jobinko, but not for Apply for me — left for you'); continue }
          setNativeValue(el, entry.a)
          out.filled.push({ key: 'answer', value: entry.a.length > 60 ? entry.a.slice(0, 57) + '…' : entry.a, how: 'typed' })
          continue
        }
        if (!entry && q && isRequiredEl(el) && out.unanswered.length < 20 && !out.unanswered.some((u) => u.key === questionKey(q))) {
          out.unanswered.push({ key: questionKey(q), question: q.slice(0, 200) })
        }
      }

      if (!verdict) { out.skipped++; continue }
      if (verdict.refused) { refuse(verdict.reason); continue }
      const raw = valueFor(verdict.key, profile)
      if (raw == null || raw === '') {
        if (MISSING[verdict.key]) refuse(MISSING[verdict.key])
        else out.skipped++
        continue
      }

      // ---- dropdown.
      if (tag === 'select') {
        const options = [...el.options].map((o) => ({ text: o.text, value: o.value, ref: o }))
        const real = options.filter((o) => !isPlaceholder(o.text, o.value))
        const hasPlaceholder = real.length < options.length
        const current = el.options[el.selectedIndex]
        // An answer the candidate already chose is never changed. With no
        // placeholder the browser pre-selects option 1 itself, so that alone is
        // not taken as the candidate's answer.
        if (current && !isPlaceholder(current.text, current.value) && (hasPlaceholder || el.selectedIndex !== 0)) {
          out.skipped++; continue
        }
        const choice = pickOption(verdict.key, raw, real)
        if (!choice) { refuse('a dropdown whose options did not match your answer — left for you'); continue }
        setNativeValue(el, choice.value)
        out.filled.push({ key: verdict.key, value: choice.text.trim(), how: 'chose' })
        continue
      }

      // An answer the candidate already typed is never overwritten.
      if (el.value && el.value.trim()) { out.skipped++; continue }
      if (seen.has(verdict.key) && verdict.key !== 'city') { out.skipped++; continue }

      const text = formatFor(verdict.key, raw, el, signals)
      if (text.refused !== undefined) { if (text.refused) refuse(text.refused); else out.skipped++; continue }

      // ---- searchable picker.
      const role = el.getAttribute?.('role')
      if (role === 'combobox' || el.getAttribute?.('aria-autocomplete') === 'list') {
        const picked = await fillCombobox(el, verdict.key, raw, text.value, doc, waitMs)
        if (picked) { seen.add(verdict.key); out.filled.push({ key: verdict.key, value: picked, how: 'chose' }) }
        else refuse('a dropdown whose options did not match your answer — left for you')
        continue
      }

      seen.add(verdict.key)
      setNativeValue(el, text.value)
      out.filled.push({ key: verdict.key, value: text.value, how: 'typed' })
    }

    // ---- radio and tick-box groups.
    for (const els of groups.values()) {
      const first = els[0]
      const isRadio = (first.type || '').toLowerCase() === 'radio'
      if (els.some((e) => e.checked)) { out.skipped++; continue }
      const single = !isRadio && els.length === 1
      const question = single ? signalsFor(first, doc) : questionFor(first, doc)
      const verdict = classify(question, profile.selfId)
      if (!verdict) { out.skipped++; continue }
      if (verdict.refused) { refuse(verdict.reason); continue }
      const raw = valueFor(verdict.key, profile)
      if (raw == null || raw === '') {
        if (MISSING[verdict.key]) refuse(MISSING[verdict.key]); else out.skipped++
        continue
      }

      // One tick-box that IS the question ("I will require visa sponsorship"):
      // ticked for yes, left clear for no. Nothing else is ticked alone.
      if (single) {
        if (YES_NO.has(verdict.key) && raw === 'yes') {
          first.click()
          out.filled.push({ key: verdict.key, value: 'ticked', how: 'ticked' })
        } else out.skipped++
        continue
      }

      const options = els.map((e) => ({ text: optionLabel(e, doc), value: e.value, ref: e }))
      // Several tick-boxes: tick every preferred location the candidate named.
      if (!isRadio && (verdict.key === 'preferredLocations' || verdict.key === 'city')) {
        const wanted = String(raw).split(/[,;/]/).map((s) => s.trim()).filter(Boolean)
        const ticked = []
        for (const w of wanted) {
          const o = pickOption('city', w, options)
          if (o && !o.ref.checked) { o.ref.click(); ticked.push(o.text) }
        }
        if (ticked.length) out.filled.push({ key: verdict.key, value: ticked.join(', '), how: 'ticked' })
        else refuse('a list of options that did not match your answer — left for you')
        continue
      }
      if (!isRadio) { out.skipped++; continue }

      const choice = pickOption(verdict.key, raw, options)
      if (!choice) { refuse('a choice whose options did not match your answer — left for you'); continue }
      choice.ref.click()
      out.filled.push({ key: verdict.key, value: choice.text, how: 'chose' })
    }

    return out
  }


  // ------------------------------------------------------------- checklist --

  /**
   * What the page asks, and how much of it is answered — the panel's "Completion" bar and "Required" list.
   *
   * Returns { items: [{ label, required, done, el }], required, done }:
   *  • one item per text/select/textarea/file box, and ONE per radio or tick-box group;
   *  • `required` from the page's own marks (the `required` attribute or aria-required) — nothing is guessed;
   *  • `done` = has a value (a chosen non-placeholder option, a ticked box, an attached file);
   *  • hidden, disabled, password and button inputs are not part of the form the person sees.
   * Counted over the required items when the page marks any, over every item when it marks none.
   * Read-only: it never writes to the page.
   */
  function checklist(doc) {
    const items = []
    const groups = new Map()
    const visible = (el) => {
      if (!el.isConnected) return false
      const style = el.ownerDocument.defaultView?.getComputedStyle?.(el)
      if (style && (style.display === 'none' || style.visibility === 'hidden')) return false
      return true
    }
    for (const el of doc.querySelectorAll('input, textarea, select')) {
      if (el.disabled || !visible(el)) continue
      const tag = (el.tagName || '').toLowerCase()
      const type = (el.type || 'text').toLowerCase()
      if (tag === 'input' && ['hidden', 'submit', 'button', 'image', 'reset', 'password', 'search'].includes(type)) continue
      if (el.getAttribute('aria-hidden') === 'true') continue

      if (tag === 'input' && (type === 'radio' || type === 'checkbox')) {
        const name = el.getAttribute('name') || el.id || `__${groups.size}`
        const key = `${type}:${name}`
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(el)
        continue
      }
      let label = questionLabel(el, doc)
      if (!label) label = tidy(el.getAttribute?.('name') || el.id || '')
      if (!label) continue
      let done
      if (tag === 'input' && type === 'file') done = !!(el.files && el.files.length)
      else if (tag === 'select') done = !!el.value && !isPlaceholder(el.options?.[el.selectedIndex]?.text, el.value)
      else done = !!String(el.value || '').trim()
      items.push({ label: label.replace(/\s*\*\s*$/, '').slice(0, 120), required: isRequiredEl(el), done, el })
    }
    for (const els of groups.values()) {
      const first = els[0]
      // The visible question (legend / group label), not the machine name questionFor also searches.
      const fs = first.closest ? first.closest('fieldset') : null
      const grp = first.closest ? first.closest('[role="radiogroup"], [role="group"]') : null
      const by = grp?.getAttribute('aria-labelledby')
      const visibleQ = tidy([textOf(fs?.querySelector('legend')), grp?.getAttribute('aria-label') || '', by && doc ? by.split(/\s+/).map((id) => textOf(doc.getElementById?.(id))).join(' ') : ''].join(' '))
      const label = (visibleQ || questionFor(first, doc)).replace(/\s*\*\s*$/, '').slice(0, 120)
      if (!label) continue
      items.push({ label, required: els.some(isRequiredEl), done: els.some((e) => e.checked), el: first })
    }
    // Document order, so the list reads like the form.
    items.sort((a, b) => (a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1))
    const counted = items.some((i) => i.required) ? items.filter((i) => i.required) : items
    return { items, required: counted.length, done: counted.filter((i) => i.done).length, counted: counted.length ? counted : [] }
  }

  root.SaafAutofill = {
    classify, signalsFor, valueFor, formatFor, isFillable, fillForm,
    pickOption, rangeOf, noticeDays, REFUSALS, FIELDS, ANSWERS, SELF_ID, questionKey, checklist,
  }
})(typeof globalThis !== 'undefined' ? globalThis : window)
