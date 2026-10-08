'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { writeWelcomeChoices } from '@/lib/services/workspace'
import { LEVELS, feedLevelFor, seniorityFor, type FeedLevel } from '@/lib/first-run'

const LINKEDIN = /^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/in\/[\w%-]+\/?(\?.*)?$/i

const schema = z.object({
  levels: z.array(z.enum(LEVELS.map((l) => l.key) as [string, ...string[]])).max(LEVELS.length),
  linkedinUrl: z.string().trim().max(300).refine((v) => v === '' || LINKEDIN.test(v), 'That does not look like a LinkedIn profile link.').optional(),
})

export type WelcomeResult = { ok: true; feedLevel: FeedLevel | null } | { ok: false; error: string }

/**
 * The welcome card's "Confirm & see jobs": stores the level the person is at and, if given, their LinkedIn link.
 * Re-authenticates itself — an exported action is its own entry point. Scores nothing: the profile was already
 * saved and scored on the way in, and seniority / LinkedIn do not feed the scorer.
 */
export async function saveWelcome(input: z.input<typeof schema>): Promise<WelcomeResult> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the card.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const { levels, linkedinUrl } = parsed.data
  const url = linkedinUrl ? (/^https?:\/\//i.test(linkedinUrl) ? linkedinUrl : `https://${linkedinUrl}`) : null
  // A refusal (the column is missing until its migration is applied) is not a failure of the welcome: the feed opens.
  await writeWelcomeChoices(user.id, { seniority: seniorityFor(levels), linkedinUrl: url })
  revalidatePath('/profile')
  return { ok: true, feedLevel: feedLevelFor(levels) }
}
