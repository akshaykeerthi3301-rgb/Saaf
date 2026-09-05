/**
 * Which candidates are being ranked without the requirement their function
 * actually turns on.
 *
 * `docs/PROJECT-STATE.md` locked "gates typed per function" for a reason:
 * engineering turns on years, finance on a credential, but marketing turns on
 * channel ownership and budget scale, consulting on institute tier, and HR on a
 * recruitment-versus-generalist split. Only the first two are read from a
 * posting. The other three requirement kinds exist as members of
 * `TypedRequirement` and as labels on /audit, and nothing produces them.
 *
 * Before the pivot those candidates were told their gate was not live. Ranking
 * removed the gate and the notice went with it, which left the gap silent —
 * worse than the gap itself, because the score presents as complete. This
 * restores the telling.
 *
 * Read off the candidate's own preferred-role text, because onboarding no
 * longer asks their function: `start/gate` is one unconditional credential
 * question. Their words are retrieval; a function inferred from anything else
 * would be the guessing this product refuses to do.
 */

export type FunctionGap = {
  function: 'marketing' | 'consulting' | 'hr'
  /** What a posting in this function usually turns on, in the posting's words. */
  decidedBy: string
}

/**
 * Word-boundary matched, and deliberately narrow. A false positive tells a
 * candidate their score is missing something when it is not, which is its own
 * small dishonesty — so bare "growth" and bare "strategy" are left out. They
 * are as often an engineering or product title here as a marketing one.
 */
const PATTERNS: { function: FunctionGap['function']; decidedBy: string; re: RegExp }[] = [
  {
    function: 'marketing',
    decidedBy: 'channel ownership and budget scale — "must have run ₹50 lakh+ in paid spend"',
    re: /\b(marketing|growth marketing|performance marketing|paid media|paid social|seo|sem|demand gen(eration)?|brand manager|media buyer)\b/i,
  },
  {
    function: 'consulting',
    decidedBy: 'institute tier — "Tier-1 MBA preferred"',
    re: /\b(consultant|consulting|strategy consultant|management consultant)\b/i,
  },
  {
    function: 'hr',
    decidedBy: 'the split between recruitment and generalist HR, which postings treat as non-transferable',
    re: /\b(hr|hrbp|human resources?|people partner|people operations|recruit(er|ment)?|talent acquisition)\b/i,
  },
]

/**
 * Null for engineering, finance and anything else — those are ranked on
 * requirements the extractor actually reads, so there is nothing to disclose.
 */
export function functionGap(preferredRole: string | null | undefined): FunctionGap | null {
  if (!preferredRole) return null
  const hit = PATTERNS.find((p) => p.re.test(preferredRole))
  return hit ? { function: hit.function, decidedBy: hit.decidedBy } : null
}
