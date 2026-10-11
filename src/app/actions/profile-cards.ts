'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { evaluateUser } from '@/lib/evaluate-user'
import { resolveCity } from '@/lib/taxonomy/locations'
import { checkResume } from '@/lib/ats-check'
import { sectionsToText } from '@/lib/parse/sections'
import { saveResume, setPrimaryResume, updateResume } from '@/lib/services/resume-documents'
import {
  readPrimaryResume, writeProfileExtras, writeProfileKeywords, writeProfileLinks, writeProfilePersonal, writeProfileRoles, writeProfileSkills,
} from '@/lib/services/profile-cards'
import { dateProblem, emptySections, formatRange, removeEntry, textToBullets, upsertEntry } from '@/lib/profile-entries'
import { extrasSchema } from '@/lib/profile-extras'

/**
 * The profile screen's writes. Every export re-authenticates (CLAUDE.md invariant 2): an exported action is its own
 * entry point, and the user id comes from the session, never from the caller.
 *
 * Work experience, projects and education are written INTO THE PRIMARY RÉSUMÉ — see src/lib/profile-entries.ts for why
 * there is no second copy of a career. The score on that résumé is recomputed here, never taken from the browser.
 */

type Fail = { ok: false; error: string }
const NOT_SIGNED_IN: Fail = { ok: false, error: 'Sign in to save changes.' }
const CONNECTION: Fail = { ok: false, error: 'We could not save that just now. Check your connection and try again.' }
const EXTRAS_MISSING = 'This needs a database update that has not been applied yet, so it could not be saved.'

async function whoAmI(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// ---- work experience, projects, education ----------------------------------------------------------------------------

const dateFields = {
  startMonth: z.number().int().min(1).max(12).nullable(),
  startYear: z.number().int().min(1950).max(2100).nullable(),
  endMonth: z.number().int().min(1).max(12).nullable(),
  endYear: z.number().int().min(1950).max(2100).nullable(),
  current: z.boolean(),
}
const job = z.object({
  kind: z.enum(['experience', 'project']),
  index: z.number().int().min(0).max(40).nullable(),
  title: z.string().trim().min(1, 'Add a title.').max(200),
  employer: z.string().trim().max(200),
  location: z.string().trim().max(120),
  employmentType: z.string().trim().max(30),
  description: z.string().max(12000),
  ...dateFields,
})
const school = z.object({
  kind: z.literal('education'),
  index: z.number().int().min(0).max(40).nullable(),
  institution: z.string().trim().min(1, 'Add the school.').max(200),
  qualification: z.string().trim().max(300),
  ...dateFields,
})
const entrySchema = z.discriminatedUnion('kind', [job, school])

export async function saveProfileEntry(input: z.input<typeof entrySchema>): Promise<{ ok: true } | Fail> {
  const parsed = entrySchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the fields.' }
  const userId = await whoAmI()
  if (!userId) return NOT_SIGNED_IN

  const v = parsed.data
  const parts = { startMonth: v.startMonth, startYear: v.startYear, endMonth: v.endMonth, endYear: v.endYear, current: v.current }
  const problem = dateProblem(parts)
  if (problem) return { ok: false, error: problem }
  const dates = formatRange(parts) || null

  let entry
  if (v.kind === 'education') {
    entry = { qualification: v.qualification, institution: v.institution, dates }
  } else {
    const bullets = textToBullets(v.description)
    if (bullets.some((b) => b.length > 600)) return { ok: false, error: 'One line is longer than 600 characters. Split it into two.' }
    if (bullets.length > 30) return { ok: false, error: 'Keep it to 30 lines.' }
    entry = {
      title: v.title, employer: v.employer || null, dates, location: v.location || null, bullets,
      ...(v.employmentType ? { employmentType: v.employmentType } : {}),
    }
  }

  const found = await readPrimaryResume(userId)
  const resume = found?.resume ?? null
  const base = resume?.sections ?? emptySections()
  const sections = upsertEntry(base, v.kind, v.index, entry)
  if (sections === base) return { ok: false, error: 'That entry no longer exists. Reload the page.' }
  return writeSections(userId, resume?.id ?? null, sections)
}

export async function deleteProfileEntry(input: { kind: 'experience' | 'project' | 'education'; index: number }): Promise<{ ok: true } | Fail> {
  const parsed = z.object({ kind: z.enum(['experience', 'project', 'education']), index: z.number().int().min(0).max(40) }).safeParse(input)
  if (!parsed.success) return { ok: false, error: 'That entry no longer exists.' }
  const userId = await whoAmI()
  if (!userId) return NOT_SIGNED_IN

  const resume = (await readPrimaryResume(userId))?.resume
  if (!resume) return { ok: false, error: 'That entry no longer exists.' }
  const sections = removeEntry(resume.sections, parsed.data.kind, parsed.data.index)
  if (sections === resume.sections) return { ok: false, error: 'That entry no longer exists. Reload the page.' }
  return writeSections(userId, resume.id, sections)
}

async function writeSections(userId: string, resumeId: string | null, sections: ReturnType<typeof emptySections>): Promise<{ ok: true } | Fail> {
  const body = sectionsToText(sections)
  let score: number | null = null
  try { score = checkResume(body).readability.score } catch { /* too short to assess — still saved */ }
  try {
    if (resumeId) {
      if (!(await updateResume({ userId, id: resumeId, sections, body, score }))) return CONNECTION
    } else {
      // Their first entry, before any résumé is saved: keep it as the résumé so it is not lost, and make it the main one.
      const saved = await saveResume({ userId, label: 'My résumé', targetRole: null, sections, body, score })
      await setPrimaryResume(userId, saved.id)
    }
  } catch {
    return CONNECTION
  }
  revalidatePath('/profile')
  revalidatePath('/resume')
  return { ok: true }
}

// ---- links, skills, personal info, preferences ------------------------------------------------------------------------

const url = z.string().trim().max(300)
const linksSchema = z.object({ linkedinUrl: url, portfolioUrl: url, githubUrl: url, otherUrl: url })

export async function saveProfileLinks(input: z.input<typeof linksSchema>): Promise<{ ok: true } | Fail> {
  const parsed = linksSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'One of those links is too long.' }
  const userId = await whoAmI()
  if (!userId) return NOT_SIGNED_IN
  const { githubUrl, otherUrl, ...main } = parsed.data
  const core = await writeProfileLinks(userId, main)
  if (!core.ok) return CONNECTION
  const extra = await writeProfileExtras(userId, { githubUrl, otherUrl })
  revalidatePath('/profile')
  return extra.ok ? { ok: true } : { ok: false, error: `LinkedIn and portfolio saved. GitHub and other: ${EXTRAS_MISSING}` }
}

/** Skills change which jobs score well for you, so the list is rebuilt after the write — the same as the full form's Save. */
export async function saveProfileSkills(input: { skills: string[]; favourites: string[] }): Promise<{ ok: true } | Fail> {
  const word = z.string().trim().min(1).max(40)
  const parsed = z.object({ skills: z.array(word).max(40), favourites: z.array(word).max(40) }).safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Skills can be up to 40 characters each, 40 in all.' }
  const userId = await whoAmI()
  if (!userId) return NOT_SIGNED_IN
  const skills = [...new Set(parsed.data.skills)]
  if (!(await writeProfileSkills(userId, skills, parsed.data.favourites)).ok) return CONNECTION
  await evaluateUser(userId).catch(() => undefined)
  revalidatePath('/profile')
  return { ok: true }
}

/** Their own words for what they care about. A role naming them ranks higher; nothing is hidden. Re-ranks the list. */
export async function saveProfileKeywords(input: { keywords: string[] }): Promise<{ ok: true } | Fail> {
  const parsed = z.object({ keywords: z.array(z.string().trim().min(1).max(40)).max(20) }).safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Keywords can be up to 40 characters each, 20 in all.' }
  const userId = await whoAmI()
  if (!userId) return NOT_SIGNED_IN
  const keywords = [...new Map(parsed.data.keywords.map((k) => [k.toLowerCase(), k])).values()]
  if (!(await writeProfileKeywords(userId, keywords)).ok) return { ok: false, error: 'Keywords need a database update that has not been applied yet, so they could not be saved.' }
  await evaluateUser(userId).catch(() => undefined)
  revalidatePath('/profile')
  return { ok: true }
}

/** The role the candidate is looking for, and up to four they would also take. The primary decides which postings are scored at all. */
export async function saveProfileRoles(input: { primary: string; extras: string[] }): Promise<{ ok: true } | Fail> {
  const role = z.string().trim().min(1).max(120)
  const parsed = z.object({ primary: role, extras: z.array(role).max(4) }).safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Choose the role you are looking for.' }
  const userId = await whoAmI()
  if (!userId) return NOT_SIGNED_IN
  const extras = parsed.data.extras.filter((r) => r.toLowerCase() !== parsed.data.primary.toLowerCase())
  if (!(await writeProfileRoles(userId, parsed.data.primary, [...new Set(extras)])).ok) return CONNECTION
  await evaluateUser(userId).catch(() => undefined)
  revalidatePath('/profile')
  return { ok: true }
}

const personalSchema = z.object({
  firstName: z.string().trim().min(1, 'Add your first name.').max(60),
  lastName: z.string().trim().max(60),
  phone: z.string().trim().max(40),
  city: z.string().trim().min(1, 'Add your city — it decides which jobs are near you.').max(120),
  preferredName: z.string().trim().max(60),
  suffixName: z.string().trim().max(30),
  birthday: extrasSchema.shape.birthday,
  address1: z.string().trim().max(160),
  address2: z.string().trim().max(160),
  address3: z.string().trim().max(160),
  postalCode: z.string().trim().max(20),
  middleName: z.string().trim().max(60),
  phoneType: extrasSchema.shape.phoneType,
  country: z.string().trim().max(60),
  state: z.string().trim().max(60),
  county: z.string().trim().max(60),
})

export async function saveProfilePersonal(input: z.input<typeof personalSchema>): Promise<{ ok: true; note?: string } | Fail> {
  const parsed = personalSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the fields.' }
  const userId = await whoAmI()
  if (!userId) return NOT_SIGNED_IN
  const { firstName, lastName, phone, city, ...extras } = parsed.data

  const canonical = resolveCity(city)?.name ?? city
  const core = await writeProfilePersonal(userId, { fullName: [firstName, lastName].filter(Boolean).join(' '), phone, city: canonical })
  if (!core.ok) return CONNECTION
  await evaluateUser(userId).catch(() => undefined)
  const extra = await writeProfileExtras(userId, extras)
  revalidatePath('/profile')
  return extra.ok ? { ok: true } : { ok: false, error: `Name, phone and city saved. The rest: ${EXTRAS_MISSING}` }
}

/** Any subset of the extras — languages, the preference answers. Fields left out are kept as they are. */
export async function saveProfileExtras(input: z.input<ReturnType<typeof extrasSchema.partial>>): Promise<{ ok: true } | Fail> {
  const parsed = extrasSchema.partial().safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Some of those answers could not be read.' }
  const userId = await whoAmI()
  if (!userId) return NOT_SIGNED_IN
  // Zod 4 applies a field's default even under .partial(), which would blank every answer this call did not mention.
  const sent = Object.fromEntries(Object.entries(parsed.data).filter(([k]) => k in (input as object)))
  const r = await writeProfileExtras(userId, sent)
  revalidatePath('/profile')
  return r.ok ? { ok: true } : { ok: false, error: EXTRAS_MISSING }
}
