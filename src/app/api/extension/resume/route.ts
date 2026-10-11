import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { json, refuse, requireExtensionUser } from '@/lib/extension-session'
import { getResume } from '@/lib/services/resume-documents'
import { readPrimaryResume } from '@/lib/services/profile-cards'
import { buildFullResumeDocx } from '@/lib/resume-docx'
import { presetStyle } from '@/lib/resume-style'

/**
 * A résumé as a Word file, for the extension to attach to an application's upload box. The primary résumé by default,
 * or a specific one by `?id=` (a tailored résumé is one of the candidate's saved résumés). Built in memory from the
 * saved sections, the same builder the Export drawer uses; nothing is stored. Signed-in only.
 */
export const dynamic = 'force-dynamic'

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/**
 * A file name an employer reads: no brand, no id — "Akshay-Keerthi-Resume.docx". A résumé tailored for a job (label
 * "Tailored — Role at Company") carries the company: "Akshay-Keerthi-Resume-Acme-Robotics.docx", so the two files can
 * be told apart in a downloads folder and in an inbox.
 */
// ASCII only: the name goes in an HTTP header, which cannot carry other scripts (a Devanagari name would throw). Accents are folded (é → e).
const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
export function fileName(name: string | null, label: string): string {
  const base = slug(name || (label.startsWith('Tailored — ') ? '' : label) || 'Resume').slice(0, 50) || 'Resume'
  const m = /^Tailored — (.+?)(?: at (.+))?$/.exec(label)
  const tail = m ? slug(m[2] || m[1]).slice(0, 40) : ''
  return `${base}-Resume${tail ? `-${tail}` : ''}.docx`
}

export async function GET(req: NextRequest) {
  const gate = await requireExtensionUser(req, { scope: 'resume', limit: 20 })
  if ('response' in gate) return gate.response
  const id = req.nextUrl.searchParams.get('id')
  if (id !== null && !z.string().uuid().safeParse(id).success) return refuse(400, 'bad-request')

  const resume = id ? await getResume(gate.user.userId, id) : (await readPrimaryResume(gate.user.userId))?.resume ?? null
  if (!resume) return json({ ok: false, error: 'no-resume' }, { status: 404 })

  const buffer = await buildFullResumeDocx({ sections: { ...resume.sections, order: [] }, targetRole: resume.targetRole ?? '', style: presetStyle('standard') })
  const filename = fileName(resume.sections.contact.name, resume.label)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': DOCX,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Filename': filename,
      'Cache-Control': 'no-store',
    },
  })
}
