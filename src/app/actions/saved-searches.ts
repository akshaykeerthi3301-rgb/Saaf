'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { evaluateUser } from '@/lib/evaluate-user'
import { MAX_SEARCHES } from '@/lib/saved-searches'
import { applySearchToProfile, deleteSearch, saveCurrentSearch, type SaveSearchResult } from '@/lib/services/saved-searches'

/**
 * Saved searches (TASK-157): keep the profile's current roles under a name,
 * switch to another set, delete one. Each export re-authenticates — an exported
 * action is its own entry point — and takes the user from the session, never
 * from the caller.
 */
const MISSING = 'Saved searches need a database update (0037) that has not been applied yet.'
const nameSchema = z.object({ name: z.string().trim().min(1, 'Give the search a name.').max(40) })

async function sessionUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

const reason = (r: Extract<SaveSearchResult, { ok: false }>['reason']) =>
  r === 'missing-update' ? MISSING : r === 'full' ? `You can keep ${MAX_SEARCHES} searches — delete one first.` : 'That did not save. Try again in a moment.'

export async function saveSearch(input: z.input<typeof nameSchema>) {
  const parsed = nameSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Give the search a name.' }
  const user = await sessionUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  const res = await saveCurrentSearch(user.id, parsed.data.name)
  if (!res.ok) return { ok: false as const, error: reason(res.reason) }
  revalidatePath('/today')
  return { ok: true as const }
}

export async function removeSearch(input: z.input<typeof nameSchema>) {
  const parsed = nameSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'That search could not be found.' }
  const user = await sessionUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  const res = await deleteSearch(user.id, parsed.data.name)
  if (!res.ok) return { ok: false as const, error: reason(res.reason) }
  revalidatePath('/today')
  return { ok: true as const }
}

/** Per user: a switch re-scores the whole list, which is the expensive thing here. */
const SWITCH_LIMIT = { scope: 'search-switch', limit: 12, windowMs: 10 * 60 * 1000 }

export async function switchSearch(input: z.input<typeof nameSchema>) {
  const parsed = nameSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'That search could not be found.' }
  const user = await sessionUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  const limit = checkRateLimit(user.id, SWITCH_LIMIT)
  if (!limit.ok) return { ok: false as const, error: `Switching re-scores your list — try again in ${limit.retryAfterSeconds} s.` }

  if (!(await applySearchToProfile(user.id, parsed.data.name))) return { ok: false as const, error: 'That search could not be found.' }
  const { written } = await evaluateUser(user.id)
  revalidatePath('/today')
  return { ok: true as const, scored: written }
}
