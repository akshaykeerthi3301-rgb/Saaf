import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RoleCard } from '@/components/ui/role-card'
import type { EvidenceItem } from '@/components/ui/row'
import { Arithmetic } from '@/components/ui/arithmetic'
import { ShortlistViewed } from '@/components/features/shortlist-viewed'
import { BreakdownEngaged } from '@/components/features/breakdown-engaged'
import { functionGap } from '@/match/function-gap'
import type { ScoreBreakdown } from '@/match/score'

/** Badges "seen in the last 7 days" rather than tracking each user's actual
 *  last-visit timestamp — simpler, no write-on-every-page-load. */
const NEW_WITHIN_DAYS = 7

type RoleRequirement = {
  kind: string
  min_years: number | null
  credential: string | null
  value_text: string | null
  source_quote: string
  confidence: number
}

type MatchRow = {
  id: string
  role_id: string
  reason: string
  score: number | null
  score_breakdown: ScoreBreakdown | null
  roles: {
    title: string
    city: string | null
    apply_url: string
    company_name: string | null
    role_requirements: RoleRequirement[] | null
  } | null
}

/**
 * The ranked shortlist.
 *
 * Previously three sections — cleared, stretch, withheld — because the product
 * gated. It ranks now: every role scoped to the candidate's preferred role is
 * scored, ordered, and shown with the working behind its number. Nothing is
 * withheld, so there is no refusal to publish and no withheld section.
 */
export default async function TodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_role, confirmed_at, city')
    .eq('id', user.id)
    .single()

  // Scores never run against an unconfirmed profile, so there would be nothing
  // to show — send them back rather than rendering an empty list they would
  // reasonably read as a verdict.
  if (!profile?.confirmed_at) redirect('/start/confirm')

  const { data, error } = await supabase
    .from('gate_results')
    .select(`
      id, role_id, reason, score, score_breakdown,
      roles(title, city, apply_url, company_name,
        role_requirements(kind, min_years, credential, value_text, source_quote, confidence))
    `)
    .eq('user_id', user.id)
    .order('score', { ascending: false, nullsFirst: false })

  const rows = (data ?? []) as unknown as MatchRow[]

  const { count: indexed } = await supabase
    .from('roles').select('id', { count: 'exact', head: true }).eq('in_india', true)

  // Insert-once, survives gate_results being deleted and recreated by the
  // sweep in evaluate-user.ts. See supabase/migrations/0007_role_first_shown.sql.
  const { data: firstShownRows } = await supabase
    .from('role_first_shown')
    .select('role_id, first_shown_at')
    .eq('user_id', user.id)
  const firstShownAt = new Map((firstShownRows ?? []).map((r) => [r.role_id, r.first_shown_at]))

  const newCutoff = new Date().getTime() - NEW_WITHIN_DAYS * 86400_000
  const isNew = (r: MatchRow) => {
    const shown = firstShownAt.get(r.role_id)
    return shown ? new Date(shown).getTime() >= newCutoff : false
  }

  // Every requirement extracted for the role — a wrong score is debugged by
  // seeing what was read, not just the number it produced.
  const evidence = (r: MatchRow): EvidenceItem[] =>
    (r.roles?.role_requirements ?? []).map((q) => ({
      kind: q.kind,
      minYears: q.min_years ?? undefined,
      credential: q.credential ?? undefined,
      valueText: q.value_text ?? undefined,
      sourceQuote: q.source_quote,
      confidence: Number(q.confidence),
    }))

  const strong = rows.filter((r) => (r.score ?? 0) >= 75).length
  const gap = functionGap(profile.preferred_role)
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <main className="measure" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <ShortlistViewed cleared={strong} withheld={0} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'var(--type-headline-lg-size)', fontWeight: 400, margin: '0 0 8px' }}>
          {today}
        </h1>
        <nav style={{ display: 'flex', gap: 'var(--space-md)', fontSize: 'var(--type-label-md-size)' }}>
          <a href="/audit">Index audit</a>
          <a href="/profile">Profile</a>
        </nav>
      </div>

      <Arithmetic
        indexed={indexed ?? 0}
        matched={rows.length}
        strong={strong}
        searchTerm={profile.preferred_role ?? undefined}
      />

      <p style={{
        color: 'var(--color-on-surface-variant)',
        fontSize: 'var(--type-body-sm-size)',
        margin: '0 0 var(--space-md)',
      }}>
        Ranked by fit against your profile — every score opens to show its working.
        No employer in this index publishes a salary, so nothing here is ranked by
        pay, and we can&apos;t tell you what a role pays before you open it.
      </p>

      {/* The score presents as complete, so a requirement we don't read has to be
          named or it reads as one we checked and found nothing on. Attributed to
          our coverage, never to the candidate — the same rule as a thin list. */}
      {gap ? (
        <p style={{
          color: 'var(--color-on-surface-variant)',
          fontSize: 'var(--type-body-sm-size)',
          borderTop: '1px solid var(--color-outline-variant)',
          borderBottom: '1px solid var(--color-outline-variant)',
          padding: 'var(--space-md) 0',
          margin: '0 0 var(--space-md)',
        }}>
          Roles like yours are usually decided by {gap.decidedBy}. We don&apos;t read
          that from a posting yet, so every score below is built from title,
          seniority, skills, location and work mode only. That&apos;s a gap in what
          we read, not a judgement about you — open any score to see exactly what
          went into it.
        </p>
      ) : null}

      {/* A backend failure must never render as a verdict. If the read failed we
          say so plainly rather than showing an empty list. */}
      {error ? (
        <p style={{ color: 'var(--color-on-surface-variant)' }}>
          We couldn&apos;t load today&apos;s list. That&apos;s our problem, not a result — try again shortly.
        </p>
      ) : null}

      <BreakdownEngaged>
      {rows.map((r) => (
        <RoleCard
          key={r.id}
          gateResultId={r.id}
          title={r.roles?.title ?? ''}
          company={r.roles?.company_name ?? ''}
          city={r.roles?.city ?? undefined}
          score={r.score ?? 0}
          breakdown={r.score_breakdown}
          reason={r.reason}
          applyUrl={r.roles?.apply_url}
          isNew={isNew(r)}
          requirements={evidence(r)}
          profileCity={profile.city ?? undefined}
        />
      ))}
      </BreakdownEngaged>
    </main>
  )
}
