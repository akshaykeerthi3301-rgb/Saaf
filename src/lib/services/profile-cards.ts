import { createClient } from '@/lib/supabase/server'
import { extrasSchema, mergeFavouriteKeywords, readExtras, type Extras } from '@/lib/profile-extras'
import { getResume, listResumes, type SavedResumeDetail } from '@/lib/services/resume-documents'

/**
 * What the profile screen reads and writes that is not already behind another service: the extras column (0052), the
 * handful of profile columns its cards edit, and the primary résumé its experience and education are read from.
 *
 * The caller's own client throughout — the owner-only profiles and resume_documents policies are the security; the
 * `id` filters are belt and braces (the same reasoning as services/resume-documents.ts).
 */

/** `stored: false` means migration 0052 is not applied — the screen says so rather than failing silently. */
export async function readProfileExtras(userId: string): Promise<{ extras: Extras; stored: boolean }> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('profiles').select('profile_extras').eq('id', userId).maybeSingle()
  if (error) return { extras: readExtras(null), stored: false }
  return { extras: readExtras((data as { profile_extras?: unknown } | null)?.profile_extras), stored: true }
}

/** Merge a patch into what is stored and write it back. False when the column is missing or the write failed. */
export async function writeProfileExtras(userId: string, patch: Partial<Extras>): Promise<{ ok: boolean }> {
  const read = await readProfileExtras(userId)
  if (!read.stored) return { ok: false }
  const merged = extrasSchema.safeParse({ ...read.extras, ...patch })
  if (!merged.success) return { ok: false }
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ profile_extras: merged.data, updated_at: new Date().toISOString() }).eq('id', userId)
  return { ok: !error }
}

export async function writeProfileLinks(userId: string, links: { linkedinUrl: string; portfolioUrl: string }): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ linkedin_url: links.linkedinUrl || null, portfolio_url: links.portfolioUrl || null, updated_at: new Date().toISOString() })
    .eq('id', userId)
  return { ok: !error }
}

/**
 * Write the skills and which of them are hearted. Hearts live in `keywords` (migration 0022), written as a second,
 * best-effort update exactly as confirmProfile does — a database without 0022 still saves the skills.
 */
export async function writeProfileSkills(userId: string, skills: string[], favourites: string[]): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('skills, keywords').eq('id', userId).maybeSingle()
  const row = data as { skills?: string[] | null; keywords?: string[] | null } | null
  const { error } = await supabase.from('profiles').update({ skills, updated_at: new Date().toISOString() }).eq('id', userId)
  if (error) return { ok: false }
  if (row && 'keywords' in row) {
    const keywords = mergeFavouriteKeywords(row.keywords ?? [], row.skills ?? [], skills, favourites)
    await supabase.from('profiles').update({ keywords }).eq('id', userId)
  }
  return { ok: true }
}

/**
 * The primary role and the extras. `preferred_role` always saves; `preferred_roles` (0022) is a best-effort second write,
 * the same shape confirmProfile uses, so a database without 0022 keeps the single-role behaviour.
 */
export async function writeProfileRoles(userId: string, primary: string, extras: string[]): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { error } = await supabase.from('profiles').update({ preferred_role: primary, updated_at: now }).eq('id', userId)
  if (error) return { ok: false }
  await supabase.from('profiles').update({ preferred_roles: [primary, ...extras] }).eq('id', userId)
  return { ok: true }
}

export async function writeProfilePersonal(
  userId: string,
  p: { fullName: string; phone: string; city: string },
): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: p.fullName || null, phone: p.phone || null, city: p.city, updated_at: new Date().toISOString() })
    .eq('id', userId)
  return { ok: !error }
}

/** The résumé the profile's experience and education come from: the one marked primary, else the newest. Null when none is saved. */
export async function readPrimaryResume(userId: string): Promise<{ resume: SavedResumeDetail; isPrimary: boolean } | null> {
  const all = await listResumes(userId).catch(() => [])
  const pick = all.find((r) => r.isPrimary) ?? all[0]
  if (!pick) return null
  const resume = await getResume(userId, pick.id).catch(() => null)
  return resume ? { resume, isPrimary: Boolean(pick.isPrimary) } : null
}
