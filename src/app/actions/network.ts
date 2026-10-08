'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { normaliseCompany } from '@/lib/company-name'
import { manualContact, readAnyContactsFile } from '@/lib/contacts'
import { addManualContact, connectionsAt, deleteConnections, MAX_MANUAL, replaceConnections } from '@/lib/services/network'

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
  const read = readAnyContactsFile(parsed.data)
  if (!read.ok) return { ok: false as const, error: read.reason }
  const saved = await replaceConnections(user.id, read.contacts, read.source)
  if (saved === null) return { ok: false as const, error: read.source === 'linkedin' ? MISSING_0031 : 'Importing a contacts file needs a database update (0043) that has not been applied yet.' }
  revalidatePath('/today')
  revalidatePath('/profile')
  return {
    ok: true as const, count: saved, source: read.source,
    companies: new Set(read.contacts.map((c) => c.companyNorm).filter(Boolean)).size,
    withEmail: read.contacts.filter((c) => c.email).length,
  }
}

const removeSchema = z.enum(['linkedin', 'google', 'manual']).optional()

export async function removeConnections(source?: 'linkedin' | 'google' | 'manual') {
  const parsedSource = removeSchema.safeParse(source)
  if (!parsedSource.success) return { ok: false as const, error: 'That could not be removed.' }
  const user = await sessionUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  if (!(await deleteConnections(user.id, parsedSource.data))) return { ok: false as const, error: MISSING_0031 }
  revalidatePath('/today')
  revalidatePath('/profile')
  return { ok: true as const }
}

const addSchema = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(200),
  position: z.string().trim().max(200).optional(),
  email: z.string().trim().max(254).optional(),
})

/** One person the candidate already knows. Owner-only; never used to find anyone else's address. */
export async function addContact(input: z.input<typeof addSchema>) {
  const parsed = addSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Add a name and a company.' }
  const user = await sessionUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  if (!checkRateLimit(user.id, { scope: 'contact-add', limit: 60, windowMs: 60 * 60 * 1000 }).ok) return { ok: false as const, error: 'Too many in an hour — try again later.' }
  const c = manualContact(parsed.data)
  if (!c) return { ok: false as const, error: 'That needs a name and a company name we can recognise.' }
  const r = await addManualContact(user.id, c)
  if (r === 'full') return { ok: false as const, error: `You can keep ${MAX_MANUAL} people by hand — delete some first, or upload a file.` }
  if (r === 'missing-update') return { ok: false as const, error: 'Adding people by hand needs a database update (0043) that has not been applied yet.' }
  if (r === 'failed') return { ok: false as const, error: 'That did not save. Try again in a moment.' }
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
