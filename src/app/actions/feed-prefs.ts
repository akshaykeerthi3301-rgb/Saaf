'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { evaluateUser } from '@/lib/evaluate-user'
import { feedViewSchema, viewFromParams, viewToParams } from '@/lib/feed-query'
import {
  MAX_SAVED, correctSkill, readFeedPrefs, readRoleScore, setRoleHidden, writeSavedFilters,
} from '@/lib/services/feed-prefs'

/**
 * Feed preferences (Phase 15, 2026-09-25): hide a job, saved filters, and
 * correcting a skill from the job page. Each re-authenticates — an exported
 * action is its own entry point.
 */

const MISSING_0030 = 'This needs a database update (0030) that has not been applied yet.'

async function sessionUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

const hideSchema = z.object({ roleId: z.string().uuid(), hidden: z.boolean() })

export async function hideRole(input: z.input<typeof hideSchema>) {
  const parsed = hideSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'That job could not be hidden.' }
  const user = await sessionUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  const res = await setRoleHidden(user.id, parsed.data.roleId, parsed.data.hidden)
  if (!res.ok) return { ok: false as const, error: MISSING_0030 }
  revalidatePath('/today')
  return { ok: true as const }
}

const saveSchema = z.object({ name: z.string().trim().min(1).max(40), view: feedViewSchema })

export async function saveFilter(input: z.input<typeof saveSchema>) {
  const parsed = saveSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Give the filter a name (up to 40 characters).' }
  const user = await sessionUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  const prefs = await readFeedPrefs(user.id)
  if (!prefs.stored) return { ok: false as const, error: MISSING_0030 }
  // Through the whitelist again, so the stored view is exactly what the URL would carry.
  const view = viewFromParams(viewToParams(parsed.data.view))
  const others = prefs.saved.filter((f) => f.name.toLowerCase() !== parsed.data.name.toLowerCase())
  if (others.length >= MAX_SAVED) return { ok: false as const, error: `You can keep ${MAX_SAVED} saved filters — delete one first.` }
  const res = await writeSavedFilters(user.id, [...others, { name: parsed.data.name, view }])
  if (!res.ok) return { ok: false as const, error: MISSING_0030 }
  revalidatePath('/today')
  return { ok: true as const }
}

const deleteSchema = z.object({ name: z.string().min(1).max(40) })

export async function deleteFilter(input: z.input<typeof deleteSchema>) {
  const parsed = deleteSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Unknown filter.' }
  const user = await sessionUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  const prefs = await readFeedPrefs(user.id)
  const res = await writeSavedFilters(user.id, prefs.saved.filter((f) => f.name !== parsed.data.name))
  if (!res.ok) return { ok: false as const, error: MISSING_0030 }
  revalidatePath('/today')
  return { ok: true as const }
}

/**
 * "I have this" / "I don't have this" on a skill in the Match Analysis tab.
 *
 * Writes the profile, then recomputes every score — the same evaluateUser the
 * profile page runs — so the feed and this job's number move together.
 * Limited per user: a recompute scores up to 500 roles.
 */
const SKILL_LIMIT = { scope: 'skill-correct', limit: 15, windowMs: 10 * 60 * 1000 }
const skillSchema = z.object({ roleId: z.string().uuid(), skill: z.string().trim().min(1).max(40), have: z.boolean() })

export async function correctSkillFromJob(input: z.input<typeof skillSchema>) {
  const parsed = skillSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'That skill could not be changed.' }
  const user = await sessionUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  const limit = checkRateLimit(user.id, SKILL_LIMIT)
  if (!limit.ok) return { ok: false as const, error: `Too many changes in a row — try again in ${limit.retryAfterSeconds} s, or edit skills on your profile.` }

  const { roleId, skill, have } = parsed.data
  const before = await readRoleScore(user.id, roleId)
  const skills = await correctSkill(user.id, skill, have)
  if (!skills) return { ok: false as const, error: 'Could not save that to your profile.' }
  const { written } = await evaluateUser(user.id)
  const after = await readRoleScore(user.id, roleId)
  revalidatePath('/today')
  return { ok: true as const, before, after, rescored: written, skills: skills.length }
}
