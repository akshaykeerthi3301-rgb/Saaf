'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { applyAsCoach } from '@/lib/services/coaching'

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  headline: z.string().trim().min(5).max(200),
  experience: z.string().trim().min(40, 'Tell us a little more — at least 40 characters.').max(2000),
  bookingUrl: z.string().trim().url().max(500).refine((u) => u.startsWith('https://'), 'Use an https:// booking link.').or(z.literal('')),
})

export async function submitCoachApplication(input: z.input<typeof schema>) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Check the form.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  if (!checkRateLimit(user.id, { scope: 'coach-apply', limit: 3, windowMs: 24 * 3600 * 1000 }).ok) {
    return { ok: false as const, error: 'You have already applied today.' }
  }
  const ok = await applyAsCoach(user.id, { ...parsed.data, bookingUrl: parsed.data.bookingUrl || null })
  return ok ? { ok: true as const } : { ok: false as const, error: 'This needs a database update (0031) that has not been applied yet.' }
}
