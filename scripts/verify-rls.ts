/**
 * Prove RLS actually denies, rather than trusting that policies compiled.
 *
 * An empty table returns [] whether RLS denied the read or there were simply no
 * rows — so this seeds a row with the service role first, then compares what
 * anon can see. Re-run after any migration that touches policies.
 */
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const svc = (p: string, init: RequestInit = {}) =>
  fetch(`${BASE}/rest/v1/${p}`, {
    ...init,
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...init.headers },
  })
const anon = (p: string, init: RequestInit = {}) =>
  fetch(`${BASE}/rest/v1/${p}`, {
    ...init,
    headers: { apikey: ANON, 'Content-Type': 'application/json', ...init.headers },
  })

let failed = 0
const check = (name: string, pass: boolean, detail = '') => {
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!pass) failed++
}

async function main() {
  await svc('boards', { method: 'POST', body: JSON.stringify({ provider: 'greenhouse', token: '__rls_probe__', company_name: 'RLS Probe' }) })
  await svc('audit_daily', { method: 'POST', body: JSON.stringify({ day: '1999-01-01', roles_indexed: 1, roles_withheld: 0, boards_active: 1, by_reason: {} }) })

  const svcBoards = await (await svc('boards?select=token')).json()
  const anonBoards = await (await anon('boards?select=token')).json()
  check('boards: service role can read', Array.isArray(svcBoards) && svcBoards.length > 0)
  check('boards: anon is DENIED (the registry is the moat)', Array.isArray(anonBoards) && anonBoards.length === 0)

  const anonWrite = await anon('boards', { method: 'POST', body: JSON.stringify({ provider: 'lever', token: '__anon_write__', company_name: 'x' }) })
  check('boards: anon cannot write', anonWrite.status >= 400, `http ${anonWrite.status}`)

  const anonAudit = await (await anon('audit_daily?select=day')).json()
  check('audit_daily: anon CAN read (landing page renders pre-signup)', Array.isArray(anonAudit) && anonAudit.length > 0)

  const anonProfiles = await anon('profiles', { method: 'POST', body: JSON.stringify({ id: '00000000-0000-0000-0000-000000000000' }) })
  check('profiles: anon cannot insert a profile it does not own', anonProfiles.status >= 400, `http ${anonProfiles.status}`)

  await svc('boards?token=eq.__rls_probe__', { method: 'DELETE' })
  await svc('audit_daily?day=eq.1999-01-01', { method: 'DELETE' })

  console.log(failed === 0 ? '\n  RLS verified.' : `\n  ${failed} CHECK(S) FAILED`)
  process.exit(failed === 0 ? 0 : 1)
}
main()
