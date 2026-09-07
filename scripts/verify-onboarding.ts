/**
 * Prove the candidate's first ninety seconds actually work, end to end.
 *
 * Parse résumé → confirm fields → save profile → generate matches. Every step
 * against the live database with a throwaway user, then delete it.
 *
 * ⚠️ THIS EXISTS BECAUSE THE FLOW HAD NEVER BEEN RUN THROUGH ONCE. The parser
 * has unit tests and the scorer has unit tests, but nothing joined them to the
 * database and asked whether a new candidate ends up with a shortlist — and
 * that is the only question that matters on day one of a beta. Testing it by
 * hand meant overwriting the founder's own profile and rescoring 436 roles,
 * which is why it kept not happening.
 *
 * ⚠️ IT MIRRORS src/app/actions/confirm-profile.ts RATHER THAN CALLING IT. A
 * server action reads cookies() and cannot run outside a request, so the write
 * below is a copy of the action's upsert. That is a real drift risk: a column
 * added to the action and not here would go unverified. The mitigation is that
 * this script asserts on the RESULT (a scored shortlist), not on the columns —
 * so a field that actually matters to scoring cannot go missing silently.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pdfToText } from '../src/lib/parse/pdf'
import { extractFields } from '../src/lib/parse/extract'
import { readResumeWithModel } from '../src/lib/parse/llm'
import { evaluateUser } from '../src/lib/evaluate-user'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

let failed = 0
const check = (name: string, pass: boolean, detail = '') => {
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!pass) failed++
}

async function main() {
  const email = `onboarding-probe-${Date.now()}@saaf.local`
  const { data: created, error: cErr } = await db.auth.admin.createUser({ email, email_confirm: true })
  if (cErr) throw cErr
  const userId = created.user!.id
  console.log(`  probe user: ${userId}\n`)

  try {
    // ---- step 1: parse a real résumé file -------------------------------
    const buf = readFileSync(join(__dirname, '..', 'src/lib/parse/__tests__/fixtures/resume.pdf'))
    const text = await pdfToText(buf)
    check('1. résumé PDF yields text', text.trim().length > 200, `${text.trim().length} chars`)

    const deterministic = extractFields(text)
    const model = await readResumeWithModel(text)
    const fields = model
      ? { ...deterministic.fields, currentTitle: model.currentTitle ?? deterministic.fields.currentTitle,
          employer: model.employer ?? deterministic.fields.employer,
          city: model.city ?? deterministic.fields.city, skills: model.skills, domain: model.domain }
      : deterministic.fields
    check('2. parser reads usable fields', Boolean(fields.currentTitle || fields.city),
      `title=${fields.currentTitle ?? '—'} city=${fields.city ?? '—'} skills=${fields.skills?.length ?? 0}`)

    // ---- step 3: confirm — mirrors src/app/actions/confirm-profile.ts ----
    const preferredRole = fields.currentTitle ?? 'Product Manager'
    const { error: pErr } = await db.from('profiles').upsert({
      id: userId,
      current_title: fields.currentTitle ?? null,
      employer: fields.employer ?? null,
      years_experience: fields.yearsExperience ?? 2,
      preferred_role: preferredRole,
      city: fields.city ?? 'Bengaluru',
      skills: fields.skills ?? [],
      domain: fields.domain ?? null,
      credential: fields.credential ?? 'none',
      confirmed_at: new Date().toISOString(),
    })
    check('3. profile saves with confirmed_at', !pErr, pErr?.message ?? '')

    // ---- step 4: matches ------------------------------------------------
    const { written } = await evaluateUser(userId)
    check('4. evaluateUser writes a shortlist', written > 0, `${written} scored roles`)

    const { data: rows } = await db
      .from('gate_results').select('score, reason').eq('user_id', userId).order('score', { ascending: false })
    const scored = (rows ?? []).filter((r) => r.score !== null)
    check('5. every row carries a score', scored.length === (rows ?? []).length,
      `${scored.length}/${rows?.length ?? 0}`)
    check('6. scores span a real range, not one constant', new Set(scored.map((r) => r.score)).size > 1,
      scored.length ? `top ${scored[0].score}, bottom ${scored[scored.length - 1].score}` : 'none')
    check('7. every row states a reason', (rows ?? []).every((r) => (r.reason ?? '').length > 0))

    // ---- step 5: what /today would render -------------------------------
    const { data: firstShown } = await db.from('role_first_shown').select('role_id').eq('user_id', userId)
    check('8. first-shown records exist (the "New" badge)', (firstShown ?? []).length > 0,
      `${firstShown?.length ?? 0} rows`)
  } finally {
    await db.auth.admin.deleteUser(userId).catch(() => {})
    console.log('\n  probe user deleted (cascades through every table)')
  }

  console.log(failed === 0 ? '  ONBOARDING VERIFIED.' : `  ${failed} CHECK(S) FAILED`)
  process.exit(failed === 0 ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(1) })
