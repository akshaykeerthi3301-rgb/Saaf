import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { json, refuse, requireExtensionUser } from '@/lib/extension-session'
import { getResume, listResumes } from '@/lib/services/resume-documents'
import { readPrimaryResume } from '@/lib/services/profile-cards'
import { listEducation, listExperience } from '@/lib/profile-entries'

/**
 * What the extension's "View & Select Your Resume" picker and "Your Autofill information" pop-up show, read-only:
 *   ?view=list              the person's saved résumés (id, label, primary?)
 *   ?view=preview&id=<uuid> one résumé's text, for the preview pane
 *   ?view=profile           education, work experience and skills from the primary résumé
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

  return refuse(400, 'bad-request')
}
