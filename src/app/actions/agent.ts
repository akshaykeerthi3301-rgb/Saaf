'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { MIN_SCORES, TARGETS } from '@/lib/agent'
import { markQueued, proposeForCandidate, writeAgentSettings, readAgentSettings } from '@/lib/services/agent'

/**
 * The agent's three server calls. Each re-authenticates — an exported action is its own entry point. None of
 * them submits anything: they decide what to put on the Apply-for-me queue and remember what was put there.
 */
async function sessionUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

const settingsSchema = z.object({
  mode: z.enum(['off', 'suggest', 'queue']),
  weeklyTarget: z.number().refine((n) => (TARGETS as readonly number[]).includes(n)),
  minScore: z.number().refine((n) => (MIN_SCORES as readonly number[]).includes(n)),
})

/** Save the mode, weekly target and minimum score. The list of roles already queued is kept as it is. */
export async function saveAgentSettings(input: z.input<typeof settingsSchema>) {
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Those settings could not be read.' }
  const user = await sessionUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  const { settings, stored } = await readAgentSettings(user.id)
  if (!stored) return { ok: false as const, error: 'This needs a database update (0048) that has not been applied yet.' }
  const res = await writeAgentSettings(user.id, { ...settings, ...parsed.data })
  return res.ok ? { ok: true as const } : { ok: false as const, error: 'Could not save that. Try again.' }
}

export type QueueJob = { roleId: string; url: string; title: string; company: string }

/**
 * What Jobinko would auto-queue now. Only in 'queue' mode — in any other mode the answer is nothing, whatever the
 * browser asks. Nothing is remembered yet: the browser queues the jobs and then confirms them below.
 */
export async function proposeAutoQueue(): Promise<{ ok: true; jobs: QueueJob[] } | { ok: false }> {
  const user = await sessionUser()
  if (!user) return { ok: false }
  const r = await proposeForCandidate(user.id, { onlyMode: 'queue' })
  if (!r.stored || r.settings.mode !== 'queue') return { ok: true, jobs: [] }
  return { ok: true, jobs: r.picks.map((c) => ({ roleId: c.roleId, url: c.applyUrl, title: c.title, company: c.company })) }
}

const idsSchema = z.array(z.string().uuid()).max(20)

/** The browser reports which of those it actually queued; only those are remembered. */
export async function confirmAutoQueued(roleIds: z.input<typeof idsSchema>) {
  const parsed = idsSchema.safeParse(roleIds)
  if (!parsed.success) return { ok: false as const }
  const user = await sessionUser()
  if (!user) return { ok: false as const }
  return { ...(await markQueued(user.id, parsed.data)) }
}
