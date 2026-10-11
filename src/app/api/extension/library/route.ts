import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { json, refuse, requireExtensionUser } from '@/lib/extension-session'
import { getResume, listResumes } from '@/lib/services/resume-documents'
import { readPrimaryResume, readProfileExtras } from '@/lib/services/profile-cards'
import { readSelfId } from '@/lib/services/self-id'
import { createClient } from '@/lib/supabase/server'
import { SELF_ID_FIELDS } from '@/lib/self-id'
import { EMPLOYMENT_TYPES, PHONE_TYPES, favouriteSkills } from '@/lib/profile-extras'
import { bulletsToText, listEducation, listExperience, parseDates } from '@/lib/profile-entries'

/**
 * What the extension's "View & Select Your Resume" picker and "Your Autofill information" pop-up show, read-only:
 *   ?view=list              the person's saved résumés (id, label, primary?)
 *   ?view=preview&id=<uuid> one résumé's text, for the preview pane
 *   ?view=profile           education, work experience and skills from the primary résumé (display)
 *   ?view=editor            everything the pop-up lets the person edit, with indexes and date parts
 * Signed-in only (src/lib/extension-session.ts). Nothing is written here.
 */
export const dynamic = 'force-dynamic'

const MAX_TEXT = 20_000

export async function GET(req: NextRequest) {
  const gate = await requireExtensionUser(req, { scope: 'library', limit: 40 })
  if ('response' in gate) return gate.response
  const { userId } = gate.user
  const view = req.nextUrl.searchParams.get('view')

  if (view === 'list') {
    const all = await listResumes(userId)
    return json({ ok: true, resumes: all.map((r) => ({ id: r.id, label: r.label, isPrimary: r.isPrimary === true, updatedAt: r.updatedAt })) })
  }

  if (view === 'preview') {
    const id = req.nextUrl.searchParams.get('id')
    if (!z.string().uuid().safeParse(id).success) return refuse(400, 'bad-request')
    const resume = await getResume(userId, id as string)
    if (!resume) return json({ ok: false, error: 'no-resume' }, { status: 404 })
    return json({ ok: true, id: resume.id, label: resume.label, text: resume.body.slice(0, MAX_TEXT) })
  }

  if (view === 'profile') {
    const primary = await readPrimaryResume(userId)
    const s = primary?.resume.sections
    if (!s) return json({ ok: true, education: [], experience: [], skills: [] })
    return json({
      ok: true,
      education: listEducation(s).map((e) => ({ school: e.institution ?? '', degree: e.qualification, major: e.major ?? '', gpa: e.gpa ?? '', dates: e.dates ?? '' })),
      experience: listExperience(s).map((e) => ({ title: e.title ?? '', company: e.employer ?? '', location: e.location ?? '', type: e.employmentType ?? '', dates: e.dates ?? '', summary: e.summary ?? '' })),
      skills: s.skills.slice(0, 80),
    })
  }

  if (view === 'editor') {
    const supabase = await createClient()
    const [{ data: p }, extrasRead, selfId, primary] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      readProfileExtras(userId), readSelfId(userId), readPrimaryResume(userId),
    ])
    const row = (p ?? {}) as Record<string, unknown>
    const str = (v: unknown) => (typeof v === 'string' ? v : '')
    const [firstName = '', ...rest] = str(row.full_name).trim().split(/\s+/).filter(Boolean)
    const x = extrasRead.extras
    const skills = Array.isArray(row.skills) ? (row.skills as string[]) : []
    const keywords = Array.isArray(row.keywords) ? (row.keywords as string[]) : []
    const s = primary?.resume.sections
    return json({
      ok: true,
      email: gate.user.email,
      personal: {
        firstName, lastName: rest.join(' '), middleName: x.middleName, preferredName: x.preferredName, suffixName: x.suffixName, birthday: x.birthday,
        phone: str(row.phone), phoneType: x.phoneType, address1: x.address1, address2: x.address2, address3: x.address3,
        country: x.country, state: x.state, city: str(row.city), county: x.county, postalCode: x.postalCode,
        linkedinUrl: str(row.linkedin_url), githubUrl: x.githubUrl, portfolioUrl: str(row.portfolio_url), otherUrl: x.otherUrl,
      },
      education: s ? listEducation(s).map((e) => ({ index: e.index, institution: e.institution ?? '', major: e.major ?? '', qualification: e.qualification, gpa: e.gpa ?? '', ...parseDates(e.dates) })) : [],
      experience: s ? listExperience(s).map((e) => ({ index: e.index, title: e.title ?? '', employer: e.employer ?? '', location: e.location ?? '', employmentType: e.employmentType ?? '', summary: e.summary ?? '', description: bulletsToText(e.bullets), ...parseDates(e.dates) })) : [],
      skills, favourites: favouriteSkills(skills, keywords),
      selfId: selfId.answers, selfIdFields: SELF_ID_FIELDS,
      work: { authorisedToWork: x.authorisedToWork, needsSponsorship: x.needsSponsorship, willingToRelocate: x.willingToRelocate },
      anythingElse: x.anythingElse,
      choices: { employmentTypes: EMPLOYMENT_TYPES, phoneTypes: PHONE_TYPES },
    })
  }

  return refuse(400, 'bad-request')
}
