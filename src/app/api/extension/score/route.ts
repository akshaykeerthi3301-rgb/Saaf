import { createHash } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  matchJdToResume, JdMatchError,
  MIN_JD_CHARS, MIN_RESUME_CHARS, MAX_JD_CHARS, MAX_RESUME_CHARS,
} from '@/lib/jd-match'
import { extractSkillPhrases } from '@/lib/interview-prep'

/**
 * Score a job posting the candidate is looking at, from the browser extension.
 *
 * ⚠️ A DELIBERATE FOURTH EXCEPTION TO THE `src/app/api/` INVARIANT.
 * CLAUDE.md reserves this directory for requests that arrive WITHOUT a session
 * and names exactly three: cron, the public audit read, and the dev sign-in.
 * This is a fourth of that kind and qualifies on the same grounds — a request
 * from an extension service worker carries no cookie and cannot carry one.
 * Following the precedent in src/app/actions/tailor-docx.ts, the argument is
 * made here rather than assumed.
 *
 * ⚠️ IT IS A ROUTE AND NOT A SERVER ACTION FOR A STRUCTURAL REASON. Next
 * enforces an Origin/Host match on every Server Action POST, so `scorePastedJd`
 * — which does exactly this job — is unreachable from a third-party page or an
 * extension. There is no CORS layer anywhere in this repo and adding one to the
 * app would widen a surface that does not need widening.
 *
 * ⚠️ UNAUTHENTICATED, ON THE SAME FOUR GROUNDS AS `scorePastedJd`, AND THAT IS
 * WHY THERE IS NO TOKEN TABLE. It reads no database — src/lib/jd-match.ts holds
 * no Supabase client and a test asserts it never acquires one. It writes and
 * logs nothing. Its input is bounded by Zod. It is rate limited. The résumé
 * lives in the extension's own chrome.storage.local and is sent per request, so
 * the server holds no candidate state between calls and an account buys the
 * user nothing here. That also sidesteps a real trap: `/api/*` sits outside the
 * proxy matcher, so a cookie-authenticated route here would never refresh a
 * session and would start failing silently when the access token expired.
 *
 * ⚠️ THE EXTENSION MUST NOT RUN ON linkedin.com OR naukri.com. That is enforced
 * in the manifest's host list, not here — but it is worth stating at the server
 * too, because this endpoint is what would make a violation useful. LinkedIn's
 * User Agreement §8.2 prohibits software that overlays or modifies the service,
 * and the consequence lands on the candidate's own account.
 */

const schema = z.object({
  jdText: z.string().trim().min(MIN_JD_CHARS).max(MAX_JD_CHARS),
  resumeText: z.string().trim().min(MIN_RESUME_CHARS).max(MAX_RESUME_CHARS),
  jdTitle: z.string().trim().max(200).optional(),
  jdLocation: z.string().trim().max(200).optional(),
  yearsExperience: z.coerce.number().min(0).max(50).optional(),
  preferredRole: z.string().trim().max(200).optional(),
})

/**
 * Lower than the web form's 10. An extension scores a posting on every page a
 * candidate opens, so the same number would be a much heavier default — and
 * `src/lib/rate-limit.ts` is per-instance and IP-keyed, which extension traffic
 * shares across NAT far more than web traffic does. It is a cost brake, not a
 * security control, and it is a blunter one here than anywhere else.
 */
const LIMIT = { limit: 20, windowMs: 10 * 60_000 }

/**
 * `*` is correct here and nowhere else in this app. The caller is an extension
 * whose origin is `chrome-extension://<id>`, and the id differs per install and
 * per browser, so no allowlist can be written. It is acceptable only because
 * this endpoint reads nothing, writes nothing and holds no session: there is no
 * user data for a hostile origin to reach by calling it, and nothing it could
 * do that a plain HTTP client could not already do.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Max-Age': '86400',
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS })
}

function callerKey(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!checkRateLimit(callerKey(request), LIMIT).ok) {
    return NextResponse.json(
      { ok: false, error: 'Scored a few postings just now. Try again in a few minutes.' },
      { status: 429, headers: CORS },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Expected JSON.' }, { status: 400, headers: CORS })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Could not read that posting.' },
      { status: 400, headers: CORS },
    )
  }

  try {
    /**
     * ⚠️ TWO INTEGRITY TRAPS LIVE IN THIS CALL, AND BOTH COST REAL ACCURACY.
     * `preferredRole` must default to the candidate's CURRENT TITLE and never
     * to the posting's title — matchJdToResume falls back correctly on its own,
     * so this route passes the field straight through and must never helpfully
     * fill it from `jdTitle`, or every posting collects a free 28/28 on the
     * heaviest component in the model.
     *
     * And this path omits work mode, so it is FIVE components, not seven. No
     * copy in the extension may state a component count.
     */
    const result = await matchJdToResume(parsed.data)

    /**
     * Missing keywords — the one thing every tool in this category shows and
     * this endpoint did not. Both lists come from the SAME measured vocabulary
     * the interview-prep engine uses (src/lib/taxonomy/skills.json, mined by
     * employer-dispersion), so a term appears here only because at least twelve
     * distinct employers in our own index name it. That is what stops this
     * degenerating into "your résumé is missing the word synergy".
     */
    const held = new Set((result.facts.skills ?? []).map((k) => k.toLowerCase()))
    const named = extractSkillPhrases(`${parsed.data.jdTitle ?? ''}\n${parsed.data.jdText}`)
    const missing = named.filter((t) => !held.has(t.toLowerCase())).slice(0, 8)
    const matched = named.filter((t) => held.has(t.toLowerCase())).slice(0, 8)

    return NextResponse.json(
      {
        ok: true,
        total: result.breakdown.total,
        matched,
        missing,
        components: result.breakdown.components,
        confidence: result.breakdown.confidence,
        reason: result.reason,
        // Each requirement carries the sentence it was read from. That is the
        // product, not a detail: a score the candidate cannot check is the
        // thing this whole repository argues against.
        requirements: result.requirements.map((r) => ({
          kind: r.kind, sourceQuote: r.sourceQuote, confidence: r.confidence,
        })),
        warnings: result.warnings,
      },
      { headers: CORS },
    )
  } catch (e) {
    if (e instanceof JdMatchError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 400, headers: CORS })
    }
    return NextResponse.json(
      { ok: false, error: 'Could not score that posting.' },
      { status: 500, headers: CORS },
    )
  }
}
