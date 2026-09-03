/**
 * Create a clearly-labelled TEST user and confirmed profile, so the shortlist
 * can be built and verified before magic-link sign-in works (that needs Resend).
 *
 * Delete with: npm run db:drop-test-user
 */
import { createClient } from '@supabase/supabase-js'
import { evaluateUser } from '../src/lib/evaluate-user'

const EMAIL = 'test+rohan@saaf.local'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

async function main() {
  const { data: existing } = await db.auth.admin.listUsers()
  let user = existing?.users.find((u) => u.email === EMAIL)

  if (!user) {
    const { data, error } = await db.auth.admin.createUser({
      email: EMAIL, email_confirm: true,
      user_metadata: { note: 'TEST FIXTURE — delete before launch' },
    })
    if (error) throw error
    user = data.user
  }
  console.log(`  test user: ${user!.id}`)

  const { error: pErr } = await db.from('profiles').upsert({
    id: user!.id,
    current_title: 'Systems Engineer',
    employer: 'Infosys',
    years_experience: 2,
    preferred_role: 'Systems Engineer',
    city: 'Bengaluru',
    work_authorisation: 'Indian citizen',
    credential: 'none',
    portals_used: ['naukri', 'linkedin'],
    confirmed_at: new Date().toISOString(),
  })
  if (pErr) throw pErr

  const { written } = await evaluateUser(user!.id)
  console.log(`  gate results written: ${written}`)

  const { data: counts } = await db
    .from('gate_results')
    .select('outcome')
    .eq('user_id', user!.id)
  const tally: Record<string, number> = {}
  for (const r of counts ?? []) tally[r.outcome] = (tally[r.outcome] ?? 0) + 1
  console.log(`  outcomes:`, tally)
  console.log(`\n  TEST_USER_ID=${user!.id}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
