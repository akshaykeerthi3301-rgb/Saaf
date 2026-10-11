import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { json, refuse, requireExtensionUser } from '@/lib/extension-session'
import { fileQueuedRoles } from '@/lib/services/extension-sync'

/**
 * "Save job" from the page: puts the role on the candidate's tracker NOW. A stage only moves forward — a second
 * "Save" never demotes a card that is already Applying or Applied (fileQueuedRoles). Signed-in only.
 */
export const dynamic = 'force-dynamic'

const body = z.object({
  url: z.string().url().max(2000).refine((u) => /^https?:\/\//i.test(u)),
  title: z.string().trim().min(1).max(300),
  company: z.string().trim().min(1).max(200),
  status: z.enum(['saved', 'applying', 'applied']).default('saved'),
})

export async function POST(req: NextRequest) {
  const gate = await requireExtensionUser(req, { scope: 'save' })
  if ('response' in gate) return gate.response
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return refuse(400, 'bad-request')
  const res = await fileQueuedRoles(gate.user.userId, [parsed.data])
  return json({ ok: true, filed: res.filed, onTracker: res.handled.length > 0 })
}
