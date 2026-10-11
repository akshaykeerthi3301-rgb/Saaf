import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { EXTENSION_ID } from '@/lib/extension-client'

/**
 * The gate for the extension's SIGNED-IN endpoints (/api/extension/me, /save, /resume, /tailor).
 *
 * ⚠️ WHY A SESSION AT ALL — THIS REVERSES THE EXTENSION'S "HOLDS NO SESSION" DESIGN (founder, 2026-10-11: "clone
 * the Jobright extension"). The reference extension acts on the person's own account — it saves a job, makes a
 * tailored résumé and attaches a file straight from the page. Ours could not: every save waited in the extension
 * until a Jobinko tab happened to be open. The extension's background code can send the site's own login cookie
 * (host_permissions on jobinko.in), measured 2026-10-11 in a real Chromium: signed in → 200, without cookies → redirect.
 *
 * ⚠️ A COOKIE-AUTHENTICATED ENDPOINT THAT ANY WEB PAGE COULD CALL IS A CSRF HOLE. A page on another site can make
 * the browser attach your jobinko.in cookie to a request. Two checks close it, both required:
 *  1. Proof the request comes from this extension and not a page. MEASURED 2026-10-11 in Chromium: the extension's
 *     background POST carries `Origin: chrome-extension://<id>`; its GET carries NO Origin but `Sec-Fetch-Site: none`.
 *     A web page can forge neither (`Origin` and `Sec-*` are set by the browser; a page's cross-site request says
 *     `cross-site`/`same-site`). So: Origin equals this extension, OR there is no Origin and Sec-Fetch-Site is `none`.
 *     Any other Origin is refused outright.
 *  2. A custom header, `x-jobinko-extension`. A web page cannot send a custom header cross-origin without a CORS
 *     pre-flight, and this app answers none.
 * There is deliberately NO CORS layer: the extension's background context needs none (host_permissions).
 *
 * ⚠️ /api IS OUTSIDE THE PROXY MATCHER (src/proxy.ts), SO NOTHING REFRESHES THE SESSION HERE. The server client
 * still refreshes an expired access token and rewrites the cookies on the response; and the signed-in web app (the
 * only place a person starts) keeps the session fresh. A stale session answers 401 `signed-out` and the extension
 * says "Sign in to Jobinko" — it never pretends.
 */

/** Derived from the `key` in extension/manifest.json (src/lib/__tests__/extension-session.test.ts recomputes it and fails on drift). */
export { EXTENSION_ID }
export const EXTENSION_ORIGIN = `chrome-extension://${EXTENSION_ID}`

export type ExtensionUser = { userId: string; email: string }

const noStore = { 'Cache-Control': 'no-store' }
export const refuse = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status, headers: noStore })

/** Returns the signed-in user, or the response to send instead. `scope` names this endpoint's own rate allowance. */
export async function requireExtensionUser(
  req: NextRequest,
  { scope, limit = 60, windowMs = 60_000 }: { scope: string; limit?: number; windowMs?: number },
): Promise<{ user: ExtensionUser } | { response: NextResponse }> {
  const origin = req.headers.get('origin')
  const fromExtension = origin === EXTENSION_ORIGIN || (origin === null && req.headers.get('sec-fetch-site') === 'none')
  if (!fromExtension || req.headers.get('x-jobinko-extension') !== '1') return { response: refuse(403, 'forbidden') }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: refuse(401, 'signed-out') }
  const rate = checkRateLimit(user.id, { scope: `extension:${scope}`, limit, windowMs })
  if (!rate.ok) return { response: NextResponse.json({ ok: false, error: 'slow-down', retryAfterSeconds: rate.retryAfterSeconds }, { status: 429, headers: noStore }) }
  return { user: { userId: user.id, email: user.email ?? '' } }
}

export const json = (body: unknown, init?: ResponseInit) =>
  NextResponse.json(body, { ...init, headers: { ...noStore, ...(init?.headers ?? {}) } })
