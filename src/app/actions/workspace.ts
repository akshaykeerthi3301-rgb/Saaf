'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { writePreferences, writeSearchStatus } from '@/lib/services/workspace'

/**
 * Writes for the fields migration 0028 adds: the sidebar's job-search status
 * and the onboarding preference matrix.
 *
 * Each re-authenticates (CLAUDE.md invariant 2) and leans on the "own profile"
 * policy. A write against a column that does not exist yet returns a sentence
 * naming that, so the UI can roll back instead of pretending it saved.
 */

const NOT_YET = 'Saved on this screen only — the database update for this field has not been applied yet.'

const statusSchema = z.object({ status: z.enum(['active', 'open', 'closed']) })

export async function setSearchStatus(input: z.input<typeof statusSchema>) {
  const parsed = statusSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Unknown status.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }

  const { ok } = await writeSearchStatus(user.id, parsed.data.status)
  return ok ? { ok: true as const } : { ok: false as const, error: NOT_YET }
}

const prefsSchema = z.object({
  seniority: z.enum(['entry', 'mid', 'senior', 'lead', 'executive']).nullable(),
  targetCities: z.array(z.string().trim().min(1).max(80)).max(10),
  salaryMin: z.number().int().min(0).max(1_000_000_000).nullable(),
  salaryCurrency: z.enum(['INR', 'USD', 'EUR']),
  workMode: z.enum(['remote', 'hybrid', 'onsite', 'no_preference']).optional(),
})

export async function savePreferences(input: z.input<typeof prefsSchema>) {
  const parsed = prefsSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Some of those preferences could not be read.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }

  const res = await writePreferences(user.id, parsed.data)
  revalidatePath('/profile')
  if (res.ok) return { ok: true as const }
  return { ok: false as const, error: res.which === 'work-mode' ? 'Could not save your work-mode preference.' : NOT_YET }
}

