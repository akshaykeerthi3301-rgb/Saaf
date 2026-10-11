import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { json, refuse, requireExtensionUser } from '@/lib/extension-session'
import { saveProfileEntry, deleteProfileEntry, saveProfilePersonal, saveProfileSkills, saveProfileExtras } from '@/app/actions/profile-cards'
import { saveSelfId } from '@/app/actions/self-id'

/**
 * Editing the profile from the extension's "Your Autofill information" pop-up.
 *
 * ⚠️ THIS IS A GATE, NOT A SECOND SET OF RULES. Every operation calls the same server action the Profile page calls, so the
 * same validation (the Jobright-mandatory fields, length limits, Zod) and the same re-authentication apply — an input the
 * website would refuse is refused here with the same sentence. The route only adds what an action cannot know: that the
 * request really came from the Jobinko extension for the signed-in person (`requireExtensionUser`), and a whitelist of
 * operations. Extras are limited to the few the pop-up edits.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const EXTRAS_KEYS = ['authorisedToWork', 'needsSponsorship', 'willingToRelocate', 'anythingElse'] as const

const body = z.object({
  op: z.enum(['personal', 'entry', 'deleteEntry', 'skills', 'selfId', 'extras']),
  input: z.unknown(),
})

export async function POST(req: NextRequest) {
  const gate = await requireExtensionUser(req, { scope: 'profile', limit: 60 })
  if ('response' in gate) return gate.response
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return refuse(400, 'bad-request')
  const { op, input } = parsed.data

  type Result = { ok: true } | { ok: false; error: string }
  let result: Result
  switch (op) {
    case 'personal': result = await saveProfilePersonal(input as Parameters<typeof saveProfilePersonal>[0]); break
    case 'entry': result = await saveProfileEntry(input as Parameters<typeof saveProfileEntry>[0]); break
    case 'deleteEntry': result = await deleteProfileEntry(input as Parameters<typeof deleteProfileEntry>[0]); break
    case 'skills': result = await saveProfileSkills(input as Parameters<typeof saveProfileSkills>[0]); break
    case 'selfId': result = await saveSelfId(input as Parameters<typeof saveSelfId>[0]); break
    case 'extras': {
      const sent = Object.fromEntries(Object.entries((input && typeof input === 'object' ? input : {}) as Record<string, unknown>).filter(([k]) => (EXTRAS_KEYS as readonly string[]).includes(k)))
      result = await saveProfileExtras(sent as Parameters<typeof saveProfileExtras>[0]); break
    }
  }
  return json(result, { status: result.ok ? 200 : 422 })
}
