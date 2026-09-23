/**
 * Where to send a candidate after sign-in: the page they were trying to reach.
 *
 * Until 2026-09-23 src/proxy.ts sent every signed-out request to /signin with
 * nothing remembered, and /auth/callback always landed on /today — a
 * bookmarked /applications became the shortlist (docs/QA-AUDIT.md QA-22).
 *
 * ⚠️ CARRIED IN A COOKIE, NOT IN THE OAUTH redirectTo. Google sign-in returns
 * through Supabase, which only redirects to URLs on the project's allow-list;
 * a callback URL with a query string may not match it, and a mismatch lands the
 * candidate on the site root with the sign-in unfinished — a regression that
 * cannot be tested from a local session. The proxy writes this short-lived,
 * httpOnly cookie on the way to /signin; the callback reads it and clears it.
 *
 * ⚠️ AN OPEN REDIRECT IS WORSE THAN THE INCONVENIENCE, so only a same-site,
 * relative path survives: no scheme, no "//host", no backslash tricks, nothing
 * that loops back into sign-in, and nothing under /api.
 */
export const NEXT_COOKIE = 'saaf_next'

/** Ten minutes: long enough to finish a Google sign-in, short enough to go stale. */
export const NEXT_COOKIE_MAX_AGE = 600

const BASE = 'https://saaf.invalid'

export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 512) return null
  let path: string
  try {
    path = decodeURIComponent(raw)
  } catch {
    return null
  }
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null
  if (/[\u0000-\u001f\u007f]/.test(path)) return null
  let url: URL
  try {
    url = new URL(path, BASE)
  } catch {
    return null
  }
  if (url.origin !== BASE) return null
  if (/^\/(signin|auth|api)(\/|$)/.test(url.pathname)) return null
  return url.pathname + url.search
}

/** The callback's decision. An unconfirmed profile always finishes onboarding first. */
export function postSignInPath(confirmed: boolean, remembered: string | null | undefined): string {
  if (!confirmed) return '/start'
  return safeNextPath(remembered) ?? '/today'
}
