/**
 * The off-by-default switch for company career sites (founder decision
 * 2026-10-15). CAREER_SITES is a comma list of provider names — "amazon,oraclehcm"
 * — and a provider not in it fetches nothing. Unset the variable to stop all of
 * them; each then reports an INCOMPLETE empty read so run.ts keeps what is stored
 * and prunes nothing.
 */
export const careerSiteOn = (provider: string): boolean =>
  (process.env.CAREER_SITES ?? '').split(',').map((s) => s.trim()).includes(provider)
