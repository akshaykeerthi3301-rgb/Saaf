'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { fileQueuedRoles, readExtensionSync } from '@/lib/services/extension-sync'

/**
 * The two server calls behind the web app ↔ extension bridge
 * (src/components/features/extension-bridge.tsx). Both re-authenticate: an
 * exported action is its own entry point, reachable without the layout that
 * mounts the bridge ever running.
 */

async function sessionUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getExtensionSync() {
  const user = await sessionUser()
  if (!user) return { ok: false as const }
  return { ok: true as const, ...(await readExtensionSync(user.id, user.email ?? '')) }
}

/**
 * Items come from the extension's local storage, which the candidate's own
 * browser wrote — but anything crossing into a server action is untrusted, so
 * the shape, the scheme and the sizes are checked here, not assumed.
 */
const queueSchema = z.array(z.object({
  url: z.string().url().max(2000).refine((u) => /^https?:\/\//i.test(u)),
  title: z.string().min(1).max(300),
  company: z.string().min(1).max(200),
  status: z.enum(['saved', 'applying', 'applied']),
  via: z.enum(['apply-for-me', 'manual']).optional(),
})).max(50)

export async function fileFromExtension(input: z.input<typeof queueSchema>) {
  const parsed = queueSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, handled: [] as string[], filed: 0 }
  const user = await sessionUser()
  if (!user) return { ok: false as const, handled: [] as string[], filed: 0 }

  const res = await fileQueuedRoles(user.id, parsed.data)
  if (res.filed || res.handled.length) revalidatePath('/applications')
  return { ok: true as const, ...res }
}
