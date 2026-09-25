'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { readCompanyFacts, readCompanyNews, type CompanyFacts, type CompanyNews } from '@/lib/services/company-facts'

/**
 * Company facts for the job panel, loaded after the panel so two open-data
 * look-ups (Wikidata, GDELT) never delay the match analysis. Signed-in and
 * limited per user: each call can make our server fetch four external URLs.
 */
const LIMIT = { scope: 'company-facts', limit: 60, windowMs: 10 * 60 * 1000 }
const schema = z.object({ company: z.string().trim().min(1).max(200) })

export type CompanyFactsResult = { ok: true; facts: CompanyFacts | null; news: CompanyNews } | { ok: false }

export async function getCompanyFacts(input: z.input<typeof schema>): Promise<CompanyFactsResult> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  if (!checkRateLimit(user.id, LIMIT).ok) return { ok: false }
  const facts = await readCompanyFacts(parsed.data.company)
  // News only for a company we positively identified — otherwise "Zeta" pulls in Catherine Zeta-Jones.
  const news = facts ? await readCompanyNews(facts.label) : []
  return { ok: true, facts, news }
}
