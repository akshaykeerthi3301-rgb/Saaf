/**
 * Prove RLS actually denies, rather than trusting that policies compiled.
 *
 * An empty table returns [] whether RLS denied the read or there were simply no
 * rows — so this seeds a row with the service role first, then compares what
 * anon can see. Re-run after any migration that touches policies.
 *
 * TWO HALVES, AND THE SECOND IS THE ONE THAT MATTERS FOR BETA.
 *
 *   1. anon vs service role — can a signed-out visitor read the registry?
 *   2. USER A vs USER B — can a signed-in candidate read another candidate's
 *      profile, shortlist, tracker or reports?
 *
 * ⚠️ ONLY THE FIRST HALF EXISTED UNTIL 2026-09-08, AND IT PROVES ALMOST
 * NOTHING ABOUT THE PRODUCT'S ACTUAL PROMISE. Every policy on a candidate table
 * is `auth.uid() = user_id`, and an anon probe never exercises that expression
 * at all — anon fails the `to authenticated` role check first and returns empty
 * for a reason that has nothing to do with ownership. A policy accidentally
 * written `using (true)` would pass half one and leak every candidate's data to
 * every other candidate. The product's third guarantee is that nothing about a
 * candidate's search is shared; half two is the only thing here that tests it.
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

  await crossUserIsolation()

  console.log(failed === 0 ? '\n  RLS verified.' : `\n  ${failed} CHECK(S) FAILED`)
  process.exit(failed === 0 ? 0 : 1)
}

/**
 * Can candidate A reach candidate B's rows? Two real users, two real sessions.
 *
 * The requests below carry a genuine user JWT rather than the anon key, so
 * PostgREST evaluates `auth.uid() = user_id` for real. That is the whole point:
 * an anon probe short-circuits on the role check and never reaches the
 * ownership expression it is supposed to be testing.
 */
async function crossUserIsolation() {
  console.log('\n  --- cross-user isolation (a signed-in candidate vs another) ---')

  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient(BASE, SVC, { auth: { persistSession: false } })
  const anonClient = createClient(BASE, ANON, { auth: { persistSession: false } })

  const mk = async (tag: string) => {
    const email = `rls-probe-${tag}-${Date.now()}@saaf.local`
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true })
    if (error) throw error
    return { id: data.user!.id, email }
  }

  let a: { id: string; email: string } | undefined
  let b: { id: string; email: string } | undefined

  try {
    a = await mk('a')
    b = await mk('b')

    // A real role to hang the FK-bearing rows off.
    const roles = await (await svc('roles?select=id&limit=1')).json()
    const roleId: string | undefined = roles?.[0]?.id
    if (!roleId) {
      check('cross-user: a role exists to probe against', false, 'roles table is empty — run the ingest first')
      return
    }

    // Seed BOTH users identically, under the service role so RLS is bypassed
    // for setup. If B has no rows, "A sees nothing of B's" proves nothing.
    for (const u of [a, b]) {
      await svc('profiles', { method: 'POST', body: JSON.stringify({ id: u.id, current_title: `probe-${u.id.slice(0, 8)}`, confirmed_at: new Date().toISOString() }) })
      await svc('gate_results', { method: 'POST', body: JSON.stringify({ user_id: u.id, role_id: roleId, outcome: 'cleared', reason: 'rls probe', score: 50 }) })
      await svc('role_first_shown', { method: 'POST', body: JSON.stringify({ user_id: u.id, role_id: roleId }) })
      await svc('applications', { method: 'POST', body: JSON.stringify({ user_id: u.id, role_id: roleId, company: 'Probe Co', title: 'Probe Role' }) })
      /**
       * ⚠️ THE FIRST TABLE IN THIS PRODUCT THAT HOLDS A DOCUMENT (migration
       * 0023). It is the row where a leak would matter most — a shortlist tells
       * you what somebody is looking for, a saved résumé tells you their name,
       * their employer and their phone number. It is seeded for BOTH users for
       * the same reason as everything else here: "A sees nothing of B's" proves
       * nothing when B has nothing.
       *
       * Skipped silently when the table does not exist, so this script keeps
       * working in the window between the code deploying and the founder
       * pasting the SQL — a verification script that fails for a reason
       * unrelated to security teaches people to ignore it.
       */
      await svc('resume_documents', {
        method: 'POST',
        body: JSON.stringify({
          user_id: u.id,
          label: `probe-${u.id.slice(0, 8)}`,
          target_role: 'Backend Engineer',
          sections: { contact: { name: 'Probe', email: null, phone: null, links: [] }, summary: null, experience: [], education: [], skills: [], other: [], unplaced: 0, order: [] },
          body: 'probe résumé body',
          score: 50,
        }),
      })
    }

    const resumeTableExists = (await svc('resume_documents?select=id&limit=1')).status < 400
    const bGate = await (await svc(`gate_results?user_id=eq.${b.id}&select=id`)).json()
    await svc('refusal_reports', { method: 'POST', body: JSON.stringify({ user_id: b.id, gate_result_id: bGate?.[0]?.id }) })

    // A genuine session for A. generateLink then verifyOtp — the same path
    // src/lib/instant-signin.ts uses, including its note that GoTrue may label
    // a first-time token 'signup' regardless of the type requested.
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email: a.email })
    if (linkErr || !link.properties?.hashed_token) {
      check('cross-user: can mint a session for user A', false, linkErr?.message ?? 'no token')
      return
    }
    const { data: session, error: otpErr } = await anonClient.auth.verifyOtp({
      token_hash: link.properties.hashed_token,
      type: link.properties.verification_type as 'magiclink',
    })
    const jwt = session?.session?.access_token
    if (otpErr || !jwt) {
      check('cross-user: can mint a session for user A', false, otpErr?.message ?? 'no session')
      return
    }
    check('cross-user: minted a real session for user A', true)

    const asA = (path: string, init: RequestInit = {}) =>
      fetch(`${BASE}/rest/v1/${path}`, {
        ...init,
        headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json', ...init.headers },
      })

    // --- reads: A must see its own rows and none of B's ---------------------
    const candidateTables = ['profiles', 'gate_results', 'role_first_shown', 'applications'] as const
    for (const table of resumeTableExists ? ([...candidateTables, 'resume_documents'] as const) : candidateTables) {
      const col = table === 'profiles' ? 'id' : 'user_id'
      const bRows = await (await asA(`${table}?${col}=eq.${b.id}&select=${col}`)).json()
      check(`${table}: A cannot read B's rows`, Array.isArray(bRows) && bRows.length === 0,
        Array.isArray(bRows) ? `${bRows.length} row(s) visible` : 'unexpected response')

      const own = await (await asA(`${table}?${col}=eq.${a.id}&select=${col}`)).json()
      check(`${table}: A CAN read its own rows`, Array.isArray(own) && own.length > 0)
    }

    const bReports = await (await asA(`refusal_reports?user_id=eq.${b.id}&select=id`)).json()
    check("refusal_reports: A cannot read B's rows", Array.isArray(bReports) && bReports.length === 0)

    // --- writes: A must not be able to touch B's pipeline -------------------
    const upd = await asA(`applications?user_id=eq.${b.id}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'closed' }),
    })
    const updRows = await upd.json()
    check("applications: A cannot UPDATE B's row", Array.isArray(updRows) && updRows.length === 0,
      `http ${upd.status}, ${Array.isArray(updRows) ? updRows.length : '?'} row(s) changed`)

    const del = await asA(`applications?user_id=eq.${b.id}`, {
      method: 'DELETE', headers: { Prefer: 'return=representation' },
    })
    const delRows = await del.json()
    check("applications: A cannot DELETE B's row", Array.isArray(delRows) && delRows.length === 0,
      `http ${del.status}, ${Array.isArray(delRows) ? delRows.length : '?'} row(s) deleted`)

    // The WITH CHECK half: A must not be able to file a row AS B.
    const forge = await asA('applications', {
      method: 'POST', body: JSON.stringify({ user_id: b.id, company: 'Forged', title: 'Forged' }),
    })
    check('applications: A cannot INSERT a row owned by B', forge.status >= 400, `http ${forge.status}`)

    /**
     * Saved résumés — the write half, and the round trip.
     *
     * ⚠️ THE ROUND TRIP IS HERE RATHER THAN IN A SEPARATE SCRIPT because it
     * needs the one expensive thing this file already builds: a real session
     * for a real user. Proving that A can save, read back and delete their OWN
     * résumé is the other half of proving they cannot touch B's — a policy set
     * that denies everything passes every denial test in this file and ships a
     * feature that does not work.
     */
    if (resumeTableExists) {
      const forgeResume = await asA('resume_documents', {
        method: 'POST',
        body: JSON.stringify({
          user_id: b.id, label: 'forged', sections: {}, body: 'x',
        }),
      })
      check('resume_documents: A cannot INSERT a résumé owned by B', forgeResume.status >= 400, `http ${forgeResume.status}`)

      const updResume = await asA(`resume_documents?user_id=eq.${b.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ label: 'hijacked' }),
      })
      const updResumeRows = await updResume.json()
      check("resume_documents: A cannot UPDATE B's résumé", Array.isArray(updResumeRows) && updResumeRows.length === 0,
        Array.isArray(updResumeRows) ? `${updResumeRows.length} row(s) changed` : 'unexpected response')

      const delResume = await asA(`resume_documents?user_id=eq.${b.id}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=representation' },
      })
      const delResumeRows = await delResume.json()
      check("resume_documents: A cannot DELETE B's résumé", Array.isArray(delResumeRows) && delResumeRows.length === 0,
        Array.isArray(delResumeRows) ? `${delResumeRows.length} row(s) deleted` : 'unexpected response')

      // --- and the feature actually works for its owner ---------------------
      const mine = await asA('resume_documents', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          user_id: a.id, label: 'round-trip', target_role: 'Backend Engineer',
          sections: { contact: { name: 'A', email: null, phone: null, links: [] }, summary: null, experience: [], education: [], skills: [], other: [], unplaced: 0, order: [] },
          body: 'round trip body', score: 71,
        }),
      })
      const mineRows = await mine.json()
      check('resume_documents: A CAN save their own', mine.status < 400 && Array.isArray(mineRows) && mineRows.length === 1,
        `http ${mine.status}`)

      const readBack = await (await asA(`resume_documents?user_id=eq.${a.id}&label=eq.round-trip&select=label,score,body`)).json()
      check('resume_documents: A can read it back with its score intact',
        Array.isArray(readBack) && readBack[0]?.score === 71 && readBack[0]?.body === 'round trip body')

      const mineDel = await asA(`resume_documents?user_id=eq.${a.id}&label=eq.round-trip`, {
        method: 'DELETE', headers: { Prefer: 'return=representation' },
      })
      const mineDelRows = await mineDel.json()
      check('resume_documents: A CAN delete their own', Array.isArray(mineDelRows) && mineDelRows.length === 1)
    } else {
      console.log('  – resume_documents: table not present, skipped (migration 0023 pending)')
    }

    // gate_results has deliberately no user-facing insert policy.
    const insGate = await asA('gate_results', {
      method: 'POST', body: JSON.stringify({ user_id: a.id, role_id: roleId, outcome: 'cleared', reason: 'forged' }),
    })
    check('gate_results: A cannot INSERT even its own row (ingest-written only)', insGate.status >= 400, `http ${insGate.status}`)
  } finally {
    // Deleting the auth user cascades through every table above.
    for (const u of [a, b]) if (u) await admin.auth.admin.deleteUser(u.id).catch(() => {})
    console.log('  probe users deleted')
  }
}

main()
