import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RoleRow, type EvidenceItem } from '@/components/ui/row'
import { Arithmetic } from '@/components/ui/arithmetic'
import { WithheldSection, type WithheldRow } from '@/components/features/withheld-section'
import { ShortlistViewed } from '@/components/features/shortlist-viewed'

/** The withheld list is capped so a thin day does not read as a wall of rejection. */
const WITHHELD_CAP = 50

// Badges "seen in the last 7 days" rather than tracking each user's actual
// last-visit timestamp — simpler, no write-on-every-page-load, and answers
// "what's new" just as well for this product's weekly-ish cadence.
const NEW_WITHIN_DAYS = 7

type RoleRequirement = {
  kind: string
  min_years: number | null
  credential: string | null
  value_text: string | null
  source_quote: string
  confidence: number
}

type GateRow = {
  id: string
  role_id: string
  outcome: 'cleared' | 'withheld' | 'stretch'
  refused_on: string | null
  reason: string
  score: number | null
  gap_years: number | null
  roles: {
    title: string
    city: string | null
    apply_url: string
    company_name: string | null
    role_requirements: RoleRequirement[] | null
  } | null
}

export default async function TodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('function, confirmed_at, city')
    .eq('id', user.id)
    .single()

  // Gates never run against an unconfirmed profile, so there would be nothing
  // to show — send them back rather than rendering an empty list they would
  // reasonably read as a verdict.
  if (!profile?.confirmed_at) redirect('/start/confirm')

  const { data, error } = await supabase
    .from('gate_results')
    .select(`
      id, role_id, outcome, refused_on, reason, score, gap_years,
      roles(title, city, apply_url, company_name,
        role_requirements(kind, min_years, credential, value_text, source_quote, confidence))
    `)
    .eq('user_id', user.id)
    .order('score', { ascending: false, nullsFirst: false })

  const rows = (data ?? []) as unknown as GateRow[]
  const cleared = rows.filter((r) => r.outcome === 'cleared')
  const stretch = rows.filter((r) => r.outcome === 'stretch')
  const withheld = rows.filter((r) => r.outcome === 'withheld')

  const { count: indexed } = await supabase
    .from('roles').select('id', { count: 'exact', head: true }).eq('in_india', true)

  // Insert-once, survives gate_results being deleted and recreated by the
  // sweep in evaluate-user.ts — gate_results.first_shown_at itself resets on
  // that cycle, since its freeze trigger only covers UPDATE, not INSERT.
  // See supabase/migrations/0007_role_first_shown.sql.
  const { data: firstShownRows } = await supabase
    .from('role_first_shown')
    .select('role_id, first_shown_at')
    .eq('user_id', user.id)
  const firstShownAt = new Map((firstShownRows ?? []).map((r) => [r.role_id, r.first_shown_at]))

  const company = (r: GateRow) => r.roles?.company_name ?? ''

  const newCutoff = new Date().getTime() - NEW_WITHIN_DAYS * 86400_000
  const isNew = (r: GateRow) => {
    const shown = firstShownAt.get(r.role_id)
    return shown ? new Date(shown).getTime() >= newCutoff : false
  }

  // Every requirement extracted for the role, gated or not — a wrong verdict
  // is debugged by seeing what was read, not just what fired.
  const evidence = (r: GateRow): EvidenceItem[] =>
    (r.roles?.role_requirements ?? []).map((q) => ({
      kind: q.kind,
      minYears: q.min_years ?? undefined,
      credential: q.credential ?? undefined,
      valueText: q.value_text ?? undefined,
      sourceQuote: q.source_quote,
      confidence: Number(q.confidence),
    }))

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <main className="measure" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <ShortlistViewed cleared={cleared.length} withheld={withheld.length} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'var(--type-headline-lg-size)', fontWeight: 400, margin: '0 0 8px' }}>
          {today}
        </h1>
        <nav style={{ display: 'flex', gap: 'var(--space-md)', fontSize: 'var(--type-label-md-size)' }}>
          <a href="/audit">Gate audit</a>
          <a href="/profile">Profile</a>
        </nav>
      </div>

      <Arithmetic
        indexed={indexed ?? 0}
        inFunction={rows.length}
        cleared={cleared.length}
        withheld={withheld.length}
      />

      {/* A backend failure must never render as a verdict. If the read failed we
          say so plainly rather than showing an empty list. */}
      {error ? (
        <p style={{ color: 'var(--color-on-surface-variant)' }}>
          We couldn&apos;t load today&apos;s list. That&apos;s our problem, not a result — try again shortly.
        </p>
      ) : null}

      {/* Marketing, consulting and HR have no typed gate yet. Saying so is the
          whole point: silently applying the years gate to everyone is the bug
          this product exists to fix. */}
      {['marketing', 'consulting', 'hr'].includes(profile.function ?? '') ? (
        <p style={{
          border: '1px solid var(--color-outline-variant)', padding: 'var(--space-md)',
          fontSize: 'var(--type-body-sm-size)', color: 'var(--color-on-surface-variant)',
          margin: '0 0 var(--space-md)',
        }}>
          Your function&apos;s own gate isn&apos;t live yet — {profile.function === 'marketing'
            ? 'marketing usually gates on channel ownership and budget scale'
            : profile.function === 'consulting'
              ? 'consulting often gates on institute tier'
              : 'HR often gates on a recruitment-versus-generalist split'}, and we
          don&apos;t have that working reliably. Only location and stated seniority applied to
          this list. We&apos;d rather tell you than quietly use the wrong gate.
        </p>
      ) : null}

      {cleared.map((r) => (
        <RoleRow
          key={r.id}
          outcome="cleared"
          title={r.roles?.title ?? ''}
          company={company(r)}
          city={r.roles?.city ?? undefined}
          score={r.score ?? undefined}
          reason={r.reason}
          applyUrl={r.roles?.apply_url}
          isNew={isNew(r)}
          requirements={evidence(r)}
          refusedOn={r.refused_on}
          profileCity={profile.city ?? undefined}
        />
      ))}

      {stretch.map((r) => (
        <RoleRow
          key={r.id}
          outcome="stretch"
          title={r.roles?.title ?? ''}
          company={company(r)}
          city={r.roles?.city ?? undefined}
          score={r.score ?? undefined}
          gapYears={r.gap_years ?? undefined}
          reason={r.reason}
          applyUrl={r.roles?.apply_url}
          isNew={isNew(r)}
          requirements={evidence(r)}
          refusedOn={r.refused_on}
          profileCity={profile.city ?? undefined}
        />
      ))}

      <WithheldSection
        total={withheld.length}
        rows={withheld.slice(0, WITHHELD_CAP).map<WithheldRow>((r) => ({
          id: r.id,
          title: r.roles?.title ?? '',
          company: company(r),
          city: r.roles?.city ?? undefined,
          reason: r.reason,
          isNew: isNew(r),
          requirements: evidence(r),
          refusedOn: r.refused_on,
          profileCity: profile.city ?? undefined,
        }))}
      />
    </main>
  )
}
