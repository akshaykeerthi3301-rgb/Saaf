/**
 * Facts about a posting that can be read off data we already hold — the apply
 * URL, the title, the description — with no model and no extra source.
 *
 * Pure functions, no imports, so the feed's client components can use them
 * without pulling the scorer into the browser bundle.
 */

/**
 * "Easy Apply": the posting's form is a single page on an ATS that needs no
 * candidate account.
 *
 * ⚠️ NOT "EVERY BOARD THE EXTENSION RUNS ON". The extension's manifest also
 * matches Workday, iCIMS, Taleo and SuccessFactors, and on those a candidate
 * must create an account and click through several steps before a form
 * exists — calling that easy would be the badge lying. These five serve the
 * whole application on one page with no sign-up, which is the claim the pill
 * makes. Saaf never submits it: the extension fills, the candidate presses send.
 */
const EASY_HOSTS = [
  /(^|\.)greenhouse\.io$/,
  /(^|\.)lever\.co$/,
  /(^|\.)ashbyhq\.com$/,
  /(^|\.)workable\.com$/,
  /(^|\.)recruitee\.com$/,
]

export function isEasyApply(applyUrl: string | null | undefined): boolean {
  if (!applyUrl) return false
  try {
    const host = new URL(applyUrl).hostname.toLowerCase()
    return EASY_HOSTS.some((re) => re.test(host))
  } catch {
    return false
  }
}

export type TitleSeniority = 'Intern' | 'Entry' | 'Mid' | 'Senior' | 'Lead' | 'Executive'

/**
 * The seniority a title states, or null when it states none.
 *
 * Read from words in the title only — "Senior Product Manager" says Senior;
 * "Product Manager" says nothing, and that is reported as nothing rather than
 * guessed as Mid. The one exception is a bare level numeral (II, III), which
 * ATS titles use as a stated band.
 *
 * Order matters: "Senior Director" is Executive, "Lead Engineer II" is Lead.
 */
export function titleSeniority(title: string): TitleSeniority | null {
  const t = ` ${title.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ')} `
  if (/ (intern|internship|trainee|apprentice) /.test(t)) return 'Intern'
  if (/ (vp|vice president|director|head|chief|cxo|cto|cfo|coo|ceo|cmo|partner|general manager) /.test(t)) return 'Executive'
  if (/ (lead|principal|staff|architect|manager ii|engineering manager) /.test(t)) return 'Lead'
  if (/ (senior|sr|iii|iv) /.test(t)) return 'Senior'
  if (/ (junior|jr|entry|graduate|fresher|associate|i) /.test(t)) return 'Entry'
  if (/ (ii|mid) /.test(t)) return 'Mid'
  return null
}

/**
 * Culture tags, each backed by a phrase the posting itself contains.
 *
 * The brief asked for "culture tags" in the company snapshot. Tags from a
 * ratings site would need a licence we do not hold; tags we invent would be
 * the product making things up. These are neither: a tag appears only when the
 * posting uses words that say it, and `evidence` is the phrase, so the panel
 * can show where each came from.
 */
const CULTURE: { tag: string; re: RegExp }[] = [
  { tag: 'Remote-friendly', re: /\b(remote[- ]first|fully remote|work from (home|anywhere)|remote)\b/i },
  { tag: 'Hybrid', re: /\bhybrid\b/i },
  { tag: 'Flexible hours', re: /\bflexib(le|ility) (working|work|hours|schedule)\b/i },
  { tag: 'Equity / ESOPs', re: /\b(esops?|equity|stock options?|rsus?)\b/i },
  { tag: 'Health cover', re: /\b(health|medical) (insurance|cover(age)?|benefits?)\b/i },
  { tag: 'Learning budget', re: /\b(learning|education|training|upskilling) (budget|allowance|stipend)\b/i },
  { tag: 'Parental leave', re: /\b(parental|maternity|paternity) leave\b/i },
  { tag: 'Diversity focus', re: /\b(equal opportunity|diversity|inclusive|inclusion)\b/i },
  { tag: 'Startup pace', re: /\b(fast[- ]paced|start-?up|early[- ]stage|high[- ]growth)\b/i },
  { tag: 'Global team', re: /\b(global team|distributed team|across (\d+ )?countries|international team)\b/i },
]

export function cultureTags(description: string): { tag: string; evidence: string }[] {
  const out: { tag: string; evidence: string }[] = []
  for (const { tag, re } of CULTURE) {
    const m = re.exec(description)
    if (m) out.push({ tag, evidence: m[0] })
  }
  return out
}

/**
 * The description as display blocks, with requirement lines marked.
 *
 * ⚠️ UNTRUSTED THIRD-PARTY TEXT (roles.description's own column comment). This
 * returns strings only; the caller renders them as text nodes, never as HTML.
 * Any tags an ATS left in are stripped here so they do not show as literals.
 */
export type JdBlock = { kind: 'heading' | 'bullet' | 'para'; text: string; requirement: boolean }

const REQUIREMENT = /\b(\d+\+?\s*(years?|yrs)|experience (in|with|of)|required|must|should have|proficien|degree|bachelor|master|qualification|knowledge of|familiar(ity)? with|hands-on|expertise)\b/i

const LONG_RUN = 350

export function formatDescription(description: string): JdBlock[] {
  const text = description
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')

  // Several boards send the whole posting as one run of text. A 3,000-character
  // paragraph cannot mark its requirement sentences, so long runs are split
  // into sentences first.
  const lines: string[] = []
  for (const raw of text.split(/\n+/)) {
    const line = raw.replace(/\s+/g, ' ').trim()
    if (!line) continue
    if (line.length <= LONG_RUN) { lines.push(line); continue }
    lines.push(...line.split(/(?<=[.!?])\s+(?=[A-Z•])/).map((x) => x.trim()).filter(Boolean))
  }

  const blocks: JdBlock[] = []
  for (const line of lines) {
    const bullet = /^([•\-*·▪●]|\d+[.)])\s+/.test(line)
    const clean = line.replace(/^([•\-*·▪●]|\d+[.)])\s+/, '')
    const heading = !bullet && clean.length <= 60 && (/:$/.test(clean) || /^[A-Z][A-Za-z &/'-]+$/.test(clean)) && clean.split(' ').length <= 7
    blocks.push({
      kind: heading ? 'heading' : bullet ? 'bullet' : 'para',
      text: heading ? clean.replace(/:$/, '') : clean,
      requirement: !heading && REQUIREMENT.test(clean),
    })
  }
  return blocks
}

/** Tracker stage names as the board shows them ('closed' reads Archived). */
export const STAGE_LABEL: Record<string, string> = {
  saved: 'Saved', applying: 'Applying', applied: 'Applied',
  interviewing: 'Interviewing', offer: 'Offer', closed: 'Archived',
}
