import type { NextRequest } from 'next/server'
import { json, requireExtensionUser } from '@/lib/extension-session'
import { readExtensionSync } from '@/lib/services/extension-sync'
import { readPrimaryResume } from '@/lib/services/profile-cards'

/**
 * Who the extension is acting for: the profile fields it fills forms with, the answers it may use, the stage of every
 * tracked page, and which résumé it would attach. Signed-in only — see src/lib/extension-session.ts for the gate.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const gate = await requireExtensionUser(req, { scope: 'me' })
  if ('response' in gate) return gate.response
  const { userId, email } = gate.user
  const [sync, primary] = await Promise.all([readExtensionSync(userId, email), readPrimaryResume(userId)])
  return json({
    ok: true,
    ...sync,
    resume: primary ? { id: primary.resume.id, label: primary.resume.label, updatedAt: primary.resume.updatedAt } : null,
  })
}
