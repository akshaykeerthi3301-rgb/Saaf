import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RoleRow } from '@/components/ui/row'
import { Arithmetic } from '@/components/ui/arithmetic'
import { WithheldSection, type WithheldRow } from '@/components/features/withheld-section'
import { ShortlistViewed } from '@/components/features/shortlist-viewed'

/** The withheld list is capped so a thin day does not read as a wall of rejection. */
const WITHHELD_CAP = 50

type GateRow = {
  id: string
  outcome: 'cleared' | 'withheld' | 'stretch'
  reason: string
  score: number | null
  gap_years: number | null
  roles: { title: string; city: string | null; apply_url: string; company_name: string | null } | null
}

export default async function TodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('function, confirmed_at')
    .eq('id', user.id)
    .single()

  // Gates never run against an unconfirmed profile, so there would be nothing
  // to show — send them back rather than rendering an empty list they would
  // reasonably read as a verdict.
  if (!profile?.confirmed_at) redirect('/start/confirm')

  const { data, error } = await supabase
    .from('gate_results')
    .select('id, outcome, reason, score, gap_years, roles(title, city, apply_url, company_name)')
    .eq('user_id', user.id)
    .order('score', { ascending: false, nullsFirst: false })

  const rows = (data ?? []) as unknown as GateRow[]
  const cleared = rows.filter((r) => r.outcome === 'cleared')
  const stretch = rows.filter((r) => r.outcome === 'stretch')
  const withheld = rows.filter((r) => r.outcome === 'withheld')

  const { count: indexed } = await supabase
    .from('roles').select('id', { count: 'exact', head: true }).eq('in_india', true)

  const company = (r: GateRow) => r.roles?.company_name ?? ''
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
          don&apos;t have that working reliably. Only location, work authorisation and stated
          seniority applied to this list. We&apos;d rather tell you than quietly use the wrong gate.
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
        }))}
      />
    </main>
  )
}
