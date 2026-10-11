import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { refuse, requireExtensionUser } from '@/lib/extension-session'
import { buildCoverLetterDocx, coverLetterFilename } from '@/lib/cover-letter-docx'
import { readPrimaryResume } from '@/lib/services/profile-cards'

/**
 * The letter the person approved, as a Word file for a cover-letter upload box. The text is theirs (they read and edited it
 * in the panel); this only wraps it in a file. Built in memory, nothing stored. Signed-in only.
 */
export const dynamic = 'force-dynamic'

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const body = z.object({ text: z.string().trim().min(40).max(8000), company: z.string().trim().max(200).optional() })

export async function POST(req: NextRequest) {
  const gate = await requireExtensionUser(req, { scope: 'cover-letter-file', limit: 20 })
  if ('response' in gate) return gate.response
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return refuse(400, 'bad-request')
  const name = (await readPrimaryResume(gate.user.userId))?.resume.sections.contact.name ?? null
  const buffer = await buildCoverLetterDocx(parsed.data.text)
  const filename = coverLetterFilename(name, parsed.data.company)
  return new NextResponse(new Uint8Array(buffer), {
    headers: { 'Content-Type': DOCX, 'Content-Disposition': `attachment; filename="${filename}"`, 'X-Filename': filename, 'Cache-Control': 'no-store' },
  })
}
