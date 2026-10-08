/**
 * Jobinko extension — reads the posting on the page into one plain object.
 *
 * ⚠️ STRUCTURED DATA FIRST, THE DOM SECOND. Most ATS job pages carry a
 * schema.org `JobPosting` in a `<script type="application/ld+json">` block,
 * because Google for Jobs only indexes a posting that has one. It is the
 * employer's own statement of title, company and location, in a fixed shape,
 * so it beats any selector guess — and it survives redesigns that break
 * selectors. The DOM heuristics below are the fallback for pages without it.
 *
 * ⚠️ ONLY THE HOSTS IN manifest.json EVER RUN THIS. There are no LinkedIn,
 * Naukri, Indeed, Glassdoor, Foundit or Instahyre adapters, and adding one is a
 * product decision, not a code change: their terms prohibit exactly this, and
 * the penalty lands on the candidate's own account (README § Why LinkedIn and
 * Naukri are not in the host list).
 *
 * Attached to a global rather than exported, because MV3 content scripts are
 * not ES modules. The test imports this file for its side effect.
 */
;(function (root) {
  const MIN_JD_CHARS = 120

  /** Hostname → the ATS behind it. Order matters only where hosts nest. */
  const ATS = [
    [/greenhouse\.io$/, 'Greenhouse'],
    [/lever\.co$/, 'Lever'],
    [/ashbyhq\.com$/, 'Ashby'],
    [/workable\.com$/, 'Workable'],
    [/recruitee\.com$/, 'Recruitee'],
    [/smartrecruiters\.com$/, 'SmartRecruiters'],
    [/myworkdayjobs\.com$/, 'Workday'],
    [/icims\.com$/, 'iCIMS'],
    [/taleo\.net$/, 'Taleo'],
    [/successfactors\.com$/, 'SuccessFactors'],
    [/oraclecloud\.com$/, 'Oracle Recruiting'],
    [/brassring\.com$/, 'BrassRing'],
    [/jobvite\.com$/, 'Jobvite'],
    [/bamboohr\.com$/, 'BambooHR'],
    [/breezy\.hr$/, 'Breezy'],
    [/teamtailor\.com$/, 'Teamtailor'],
    [/personio\.de$/, 'Personio'],
    [/pinpointhq\.com$/, 'Pinpoint'],
    [/rippling\.com$/, 'Rippling'],
    [/zohorecruit\.com$/, 'Zoho Recruit'],
    [/keka\.com$/, 'Keka'],
    [/darwinbox\.in$/, 'Darwinbox'],
    [/freshteam\.com$/, 'Freshteam'],
  ]

  function detectAts(hostname) {
    const h = (hostname || '').toLowerCase()
    const hit = ATS.find(([re]) => re.test(h))
    return hit ? hit[1] : null
  }

  /** HTML → text without executing or loading anything. */
  function htmlToText(html, doc) {
    if (!html) return ''
    // A <template> parses markup inertly: no scripts run, no images load. An
    // innerHTML on a live div would fetch every <img> in the description.
    const t = doc.createElement('template')
    t.innerHTML = String(html).replace(/<(br|\/p|\/li|\/h\d)\s*\/?>/gi, '$&\n')
    return (t.content.textContent || '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim()
  }

  /** Every JobPosting node in the page, wherever it is nested. */
  function jobPostingNodes(doc) {
    const out = []
    const visit = (node) => {
      if (!node || typeof node !== 'object') return
      if (Array.isArray(node)) { node.forEach(visit); return }
      const type = node['@type']
      if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) out.push(node)
      if (node['@graph']) visit(node['@graph'])
    }
    for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
      // A malformed block is common (trailing commas, CMS escaping) and must not
      // stop the rest of the page from being read.
      try { visit(JSON.parse(s.textContent || '')) } catch { /* next block */ }
    }
    return out
  }

  function placeOf(loc) {
    const one = Array.isArray(loc) ? loc[0] : loc
    const a = one && (one.address || one)
    if (!a || typeof a !== 'object') return ''
    return [a.addressLocality, a.addressRegion, a.addressCountry?.name || a.addressCountry]
      .filter((x) => typeof x === 'string' && x.trim())
      .join(', ')
  }

  /**
   * Pay, only as the employer stated it. Never inferred and never converted —
   * 2.2% of indexed postings state pay at all (PROJECT-STATE Stage T), so an
   * absent figure is the normal case and is left absent.
   */
  function salaryOf(base) {
    if (!base || typeof base !== 'object') return ''
    const v = base.value || {}
    const cur = base.currency || v.currency || ''
    const lo = v.minValue ?? v.value
    const hi = v.maxValue
    if (lo == null && hi == null) return ''
    const unit = v.unitText ? ` per ${String(v.unitText).toLowerCase()}` : ''
    return `${cur} ${lo ?? ''}${hi != null && hi !== lo ? `–${hi}` : ''}${unit}`.trim()
  }

  function fromJsonLd(doc) {
    const node = jobPostingNodes(doc)[0]
    if (!node) return null
    const org = node.hiringOrganization
    return {
      title: typeof node.title === 'string' ? node.title.trim() : '',
      company: (typeof org === 'string' ? org : org?.name || '').trim(),
      location: placeOf(node.jobLocation) || (node.jobLocationType === 'TELECOMMUTE' ? 'Remote' : ''),
      salary: salaryOf(node.baseSalary),
      description: htmlToText(node.description, doc),
    }
  }

  /** The posting body from the DOM: the largest matching block. */
  function domDescription(doc) {
    const sel = [
      '#content', '.opening', '[class*="posting"]', '[class*="job-description"]',
      '[data-automation-id="jobPostingDescription"]', 'main article', 'main',
    ]
    let best = ''
    for (const s of sel) {
      for (const el of doc.querySelectorAll(s)) {
        const t = (el.innerText || el.textContent || '').trim()
        if (t.length > best.length) best = t
      }
    }
    if (best.length < MIN_JD_CHARS) best = (doc.body?.innerText || doc.body?.textContent || '').trim()
    return best
  }

  function domTitle(doc) {
    const h = doc.querySelector('h1, [data-automation-id="jobPostingHeader"], h2')
    return (h?.innerText || h?.textContent || doc.title || '').trim()
  }

  function domCompany(doc) {
    const og = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content')
    return (og || '').trim()
  }

  /**
   * The one entry point. Every field is a string; empty means "not stated".
   * `source` says which path produced the text, so a wrong read can be traced.
   */
  function extractJob(doc, loc) {
    const ld = fromJsonLd(doc)
    const domText = domDescription(doc)
    // Structured description wins unless it is a stub — some boards put a
    // one-line teaser in the JSON-LD and the real posting in the page.
    const useLd = ld && ld.description.length >= MIN_JD_CHARS
    return {
      title: (ld?.title || domTitle(doc)).slice(0, 200),
      company: (ld?.company || domCompany(doc)).slice(0, 200),
      location: (ld?.location || '').slice(0, 200),
      salary: (ld?.salary || '').slice(0, 120),
      description: (useLd ? ld.description : domText).slice(0, 20000),
      atsPlatform: detectAts(loc?.hostname),
      pageUrl: loc?.href || '',
      source: useLd ? 'json-ld' : 'dom',
    }
  }

  root.SaafExtract = { extractJob, detectAts, htmlToText, jobPostingNodes, MIN_JD_CHARS }
})(typeof globalThis !== 'undefined' ? globalThis : window)
