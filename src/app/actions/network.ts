'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { normaliseCompany } from '@/lib/company-name'
import { readConnectionsExport } from '@/lib/linkedin-connections'
import { connectionsAt, deleteConnections, replaceConnections } from '@/lib/services/network'

/**
 * The candidate's own LinkedIn connections: upload, delete, and "who do I know
 * at this company". Each action re-authenticates.
 */
const MISSING_0031 = 'This needs a database update (0031) that has not been applied yet.'

async function sessionUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ~150 bytes a row. Capped under next.config's 4.5 MB server-action body limit:
// about 29,000 connections, above LinkedIn's own 30,000-connection ceiling in practice.
const uploadSchema = z.string().min(20).max(4_400_000)

export async function importConnections(csv: string) {
  const parsed = uploadSchema.safeParse(csv)
  if (!parsed.success) return { ok: false as const, error: 'That file is empty or too large.' }
  const user = await sessionUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  if (!checkRateLimit(user.id, { scope: 'connections-import', limit: 5, windowMs: 60 * 60 * 1000 }).ok) {
    return { ok: false as const, error: 'Too many uploads — try again in an hour.' }
  }
  const read = readConnectionsExport(parsed.data)
  if (!read.ok) return { ok: false as const, error: read.reason }
  const saved = await replaceConnections(user.id, read.connections)
  if (saved === null) return { ok: false as const, error: MISSING_0031 }
  revalidatePath('/today')
  revalidatePath('/profile')
  return { ok: true as const, count: saved, companies: new Set(read.connections.map((c) => c.companyNorm).filter(Boolean)).size }
}

export async function removeConnections() {
  const user = await sessionUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  if (!(await deleteConnections(user.id))) return { ok: false as const, error: MISSING_0031 }
  revalidatePath('/today')
  revalidatePath('/profile')
  return { ok: true as const }
}

const atSchema = z.object({ company: z.string().trim().min(1).max(200) })

export async function getConnectionsAt(input: z.input<typeof atSchema>) {
  const parsed = atSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, people: [] }
  const user = await sessionUser()
  if (!user) return { ok: false as const, people: [] }
  return { ok: true as const, people: await connectionsAt(user.id, normaliseCompany(parsed.data.company)) }
}
