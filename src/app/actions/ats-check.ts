'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  checkResume,
  AtsCheckError,
  MIN_RESUME_CHARS,
  MAX_RESUME_CHARS,
  type AtsReport,
} from '@/lib/ats-check'

/**
 * TASK-061 — the ATS résumé checker's entry point.
 *
 * Public and unauthenticated for the same reason as scorePastedJd: the tool has
 * to be useful before anybody signs up. What makes that safe here is stronger
 * than it is there — this path calls NO model at all, so there is no per-call
 * cost to drain and the limiter below is protecting CPU rather than a bill.
 *
 * It still reads no database, writes nothing and logs nothing. A résumé arrives
 * as text, is assessed, and is dropped when the request ends.
 */

const schema = z.object({
  resumeText: z
    .string()
    .trim()
    .min(MIN_RESUME_CHARS, 'Paste your full résumé — this looks too short to check.')
    .max(MAX_RESUME_CHARS, 'That résumé is longer than we can read. Paste the most recent few roles.'),
})

export type AtsCheckResponse = ({ ok: true } & AtsReport) | { ok: false; error: string }

/**
 * Thirty checks per ten minutes — looser than scorePastedJd's ten.
 *
 * Sized from what each surface costs and what each is for. A JD score calls a
 * paid model; this is pure string work, so the ceiling exists to stop a loop
 * from occupying a serverless instance, not to protect a budget. And the loop
 * here is honest: the tool tells you to fix your résumé, so re-running it after
 * each edit is exactly the intended use. Ten would have punished the candidate
 * who actually followed the advice.
 */
const ATS_LIMIT = { limit: 30, windowMs: 10 * 60_000 }

/**
 * Who is calling, as a hash. Identical treatment to src/app/actions/jd-match.ts:
 * the address is hashed immediately and truncated, so nothing outliving this
 * function holds an IP. On a surface promising it stores nothing about you, an
 * in-memory table of visitor addresses would be a quiet contradiction.
 */
async function callerKey(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || h.get('x-real-ip')?.trim() || 'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

export async function checkResumeForAts(input: z.input<typeof schema>): Promise<AtsCheckResponse> {
  // Before validation, so a flood of malformed input is braked too.
  const limit = checkRateLimit(await callerKey(), ATS_LIMIT)
  if (!limit.ok) {
    const mins = Math.ceil(limit.retryAfterSeconds / 60)
    return {
      ok: false,
      error:
        `You have run a lot of checks in a short while. Try again in ` +
        `${mins === 1 ? 'a minute' : `${mins} minutes`} — nothing you pasted was stored.`,
    }
  }

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'We could not read that.' }
  }

  try {
    return { ok: true, ...checkResume(parsed.data.resumeText) }
  } catch (e) {
    if (e instanceof AtsCheckError) return { ok: false, error: e.message }
    return { ok: false, error: 'We could not check that just now. Try again, or check what you pasted.' }
  }
}
