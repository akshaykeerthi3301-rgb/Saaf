import { redirect } from 'next/navigation'
import { ShieldCheck, Target, Wallet } from 'lucide-react'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { RoleCard } from '@/components/ui/role-card'
import type { EvidenceItem } from '@/components/ui/row'
import { ShortlistViewed } from '@/components/features/shortlist-viewed'
import { BreakdownEngaged } from '@/components/features/breakdown-engaged'
import { functionGap } from '@/match/function-gap'
import { bucketFor, BUCKET_META, type Bucket, type ScoreBreakdown } from '@/match/score'

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

  // Buckets are derived from the stored breakdown, not from a column, so they
  // can never fall out of step with the scorer. See src/match/score.ts.
  const byBucket = new Map<Bucket, MatchRow[]>()
  for (const r of rows) {
    const b = bucketFor(r.score_breakdown)
    if (!byBucket.has(b)) byBucket.set(b, [])
    byBucket.get(b)!.push(r)
  }
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  // From the signed-in address, matching /applications — a job title makes for
  // confusing initials ("PM" is not who you are).
  const initials = (user.email ?? 'you').slice(0, 2).toUpperCase()

  return (
    <AppShell title="Jobs" initials={initials}>
      <ShortlistViewed cleared={strong} withheld={0} />

      <div className="mx-auto grid max-w-[1500px] gap-6 p-5 sm:p-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{today}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-primary sm:text-3xl">
                Sorted by what fits, and what doesn&apos;t.
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Target className="size-3.5 text-accent" />
              {rows.length} matching your search
            </span>
          </div>

          {/* A backend failure must never render as a verdict. If the read failed we
              say so plainly rather than showing an empty list. */}
          {error ? (
            <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              We couldn&apos;t load today&apos;s list. That&apos;s our problem, not a result — try again shortly.
            </p>
          ) : null}

          <BreakdownEngaged>
            {BUCKET_META.map(({ key, title, blurb }) => {
              const inBucket = byBucket.get(key) ?? []
              if (inBucket.length === 0) return null
              return (
                <section key={key} className="mb-10" aria-labelledby={`bucket-${key}`}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-border pb-3">
                    <h3
                      id={`bucket-${key}`}
                      className="text-xs font-bold uppercase tracking-[0.16em] text-primary"
                    >
                      {title}
                    </h3>
                    <span className="font-mono text-sm tabular-nums text-muted-foreground">
                      {inBucket.length}
                    </span>
                  </div>
                  <p className="mb-4 max-w-2xl text-xs leading-5 text-muted-foreground">{blurb}</p>

                  <div className="space-y-4">
                    {inBucket.map((r) => (
                      <RoleCard
                        key={r.id}
                        gateResultId={r.id}
                        roleId={r.role_id}
                        bucket={key}
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
                  </div>
                </section>
              )
            })}
          </BreakdownEngaged>
        </section>

        {/* The rail carries only figures that are real. The saaf-ai export also
            has a profile-strength meter, a weekly application limit and a B2B
            discoverability toggle: the first two are invented numbers, and
            employer access is parked, so none of the three ship. */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Today&apos;s index
            </p>
            <p className="mt-3 font-mono text-sm leading-6 tabular-nums text-muted-foreground">
              <strong className="text-2xl font-semibold tracking-[-0.04em] text-primary">
                {(indexed ?? 0).toLocaleString('en-IN')}
              </strong>
              <br />
              roles indexed
            </p>
            <div className="mt-4 space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
              <p>
                <strong className="font-mono tabular-nums text-primary">{rows.length}</strong> matched your search
              </p>
              <p>
                <strong className="font-mono tabular-nums text-primary">{strong}</strong> scored 75 or above
              </p>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
              A thin day is our coverage, not a verdict on you.
            </p>
          </div>

          <div className="flex gap-3 rounded-2xl border border-border bg-secondary/60 p-4">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-[11px] leading-5 text-muted-foreground">
              <strong className="font-semibold text-primary">We never apply for you.</strong> Every score
              opens to show its working, and no employer is contacted about you.
            </p>
          </div>

          <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
            <Wallet className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-[11px] leading-5 text-muted-foreground">
              No employer in this index publishes a salary, so nothing here is ranked by pay — and we
              can&apos;t tell you what a role pays before you open it.
            </p>
          </div>

          {/* The score presents as complete, so a requirement we don't read has to
              be named or it reads as one we checked and found nothing on.
              Attributed to our coverage, never to the candidate. */}
          {gap ? (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[11px] leading-5 text-muted-foreground">
                Roles like yours are usually decided by {gap.decidedBy}. We don&apos;t read that from a
                posting yet, so every score here is built from title, seniority, skills, location and
                work mode only — a gap in what we read, not a judgement about you.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </AppShell>
  )
}
