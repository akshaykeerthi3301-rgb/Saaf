'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { PROVIDER_LABEL } from '@/lib/parse/llm'
import {
  matchJdToResume,
  JdMatchError,
  MIN_JD_CHARS,
  MIN_RESUME_CHARS,
  MAX_JD_CHARS,
  MAX_RESUME_CHARS,
  type JdMatchResult,
} from '@/lib/jd-match'

/**
 * Score a pasted job description against a pasted résumé. TASK-060, step 2.
 *
 * ⚠️ THIS IS THE FIRST DELIBERATELY UNAUTHENTICATED SERVER ACTION IN THE
 * CODEBASE, AND THAT IS THE WHOLE POINT OF THE SURFACE. Every other action in
 * this directory calls getUser() first; this one must not, because the tool
 * exists to be useful before anybody signs up. Three things make that safe:
 *
 *  1. IT READS NO DATABASE. src/lib/jd-match.ts holds no Supabase client and a
 *     test asserts it never acquires one, so there is no row this can reach and
 *     no RLS decision for it to get wrong. Everything it returns was pasted in
 *     by the caller a moment earlier.
 *  2. IT WRITES NOTHING AND LOGS NOTHING. A résumé arrives, is scored, and is
 *     dropped in the same request — the same guarantee the upload flow makes.
 *     Contact details are stripped inside readResumeWithModel() before any text
 *     leaves the server.
 *  3. INPUT IS BOUNDED. See the caps in src/lib/jd-match.ts.
 *
 *  4. IT IS RATE LIMITED (step 4, landed). A Server Action is a real public
 *     endpoint — Next generates an ID for it and anything can POST to it, so
 *     this is reachable without ever loading the page. The Zod caps below bound
 *     the cost of ONE call; the limiter bounds the NUMBER of them.
 *
 * ⚠️ THE LIMITER IS PER-INSTANCE, NOT DISTRIBUTED. src/lib/rate-limit.ts says
 * so at length: on serverless the real ceiling is (instances × LIMIT). It stops
 * one caller looping against one instance, which is the realistic abuse here,
 * and it does not stop a distributed one. If this surface ever gets popular
 * enough to attract that, a shared store is the fix — the call site below does
 * not change.
 */

const schema = z.object({
  jdText: z
    .string()
    .trim()
    .min(MIN_JD_CHARS, 'Paste the full job description — this looks too short to read.')
    .max(MAX_JD_CHARS, 'That job description is longer than we can read. Paste the role and requirements.'),
  resumeText: z
    .string()
    .trim()
    .min(MIN_RESUME_CHARS, 'Paste your full résumé — this looks too short to read.')
    .max(MAX_RESUME_CHARS, 'That résumé is longer than we can read. Paste the most recent few roles.'),
  // Optional, and both materially change the score — see JdMatchInput.
  jdTitle: z.string().trim().max(200).optional(),
  jdLocation: z.string().trim().max(200).optional(),
  yearsExperience: z.coerce.number().min(0).max(50).optional(),
  preferredRole: z.string().trim().max(200).optional(),
})

export type JdMatchResponse =
  | ({ ok: true } & JdMatchResult & {
      /**
       * The provider's display name, resolved HERE rather than on the client.
       * Same pattern as tailor.ts: PROVIDER_LABEL lives in src/lib/parse/llm.ts
       * next to the fetch logic and the API-key reads, and the form that shows
       * this string is a client component — so the server sends the string and
       * the module stays out of the browser bundle.
       */
      providerLabel: string | null
    })
  | { ok: false; error: string }

/**
 * Ten scores per ten minutes per caller.
 *
 * Sized from what the surface is FOR rather than from a round number: a
 * candidate pastes a JD, reads the warnings, corrects the title and their years
 * — the two fields the result itself tells them to check — and re-runs. Three
 * or four calls is a normal, honest session. Ten leaves room to try a second
 * posting without ever meeting the wall, and still caps one caller at sixty
 * model reads an hour.
 */
const JD_MATCH_LIMIT = { limit: 10, windowMs: 10 * 60_000 }

/**
 * Who is calling, as a hash.
 *
 * The address is hashed immediately and the digest truncated, so nothing that
 * lives longer than this function holds an IP — the limiter's Map sees 16 hex
 * characters. That is not decoration: this surface's whole claim is that it
 * stores nothing about the person using it, and an in-memory table of visitor
 * IPs would quietly contradict it.
 *
 * `x-forwarded-for` is set by the platform edge, and its FIRST entry is the
 * client; later entries are proxies. A caller can forge the header, which is
 * the ordinary limit of IP-keyed limiting and one more reason this is a cost
 * brake rather than a control. With no header at all — local dev — every caller
 * shares one bucket, which is the safe direction to be wrong.
 */
async function callerKey(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || h.get('x-real-ip')?.trim() || 'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

export async function scorePastedJd(input: z.input<typeof schema>): Promise<JdMatchResponse> {
  // Before validation, so a flood of malformed input is braked too.
  const limit = checkRateLimit(await callerKey(), JD_MATCH_LIMIT)
  if (!limit.ok) {
    const mins = Math.ceil(limit.retryAfterSeconds / 60)
    return {
      ok: false,
      error:
        `You have scored a lot of postings in a short while. Try again in ` +
        `${mins === 1 ? 'a minute' : `${mins} minutes`} — nothing you pasted was stored.`,
    }
  }

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    // The first issue only. A candidate who pasted one thing wrong does not
    // need a list — and the schema's messages are already written for them
    // rather than describing the field that failed.
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'We could not read that.' }
  }

  try {
    const result = await matchJdToResume(parsed.data)
    return {
      ok: true,
      ...result,
      providerLabel: result.provider ? PROVIDER_LABEL[result.provider] : null,
    }
  } catch (e) {
    // JdMatchError carries a message written for the candidate. Anything else
    // is ours and is not described to them — but it must still not throw
    // across the action boundary, because an unhandled server error on a
    // public tool renders as a blank failure with nothing to do next.
    if (e instanceof JdMatchError) return { ok: false, error: e.message }
    return {
      ok: false,
      error: 'We could not score that just now. Try again, or check what you pasted.',
    }
  }
}
