import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, Eye, Laptop, ShieldCheck, Wallet } from 'lucide-react'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { RoleCard, type EvidenceItem } from '@/components/ui/role-card'
import { ShortlistViewed } from '@/components/features/shortlist-viewed'
import { BreakdownEngaged } from '@/components/features/breakdown-engaged'
import { functionGap } from '@/match/function-gap'
import { bucketFor, locationRank, BUCKET_META, type Bucket, type ScoreBreakdown } from '@/match/score'

/** Badges "seen in the last 7 days" rather than tracking each user's actual
 *  last-visit timestamp — simpler, no write-on-every-page-load. */
const NEW_WITHIN_DAYS = 7

/** How many cards of a bucket are rendered before the "show all" link.
 *
 *  NOT a limit on what the candidate can see — every role stays one click away
 *  and every bucket states its full count above the cards, so nothing is
 *  hidden. It is a limit on what we make them download to find out.
 *
 *  Measured on a real 229-role list: rendering all of it produced 4.27MB of
 *  HTML (1.8MB markup and 2.4MB of hydration data for the same tree a second
 *  time) and took 6.8s to render, against 0.3s for the query that fed it. The
 *  page was slow because of how much of it existed, not because of the
 *  database. 20 a bucket is roughly what a person scans before deciding to
 *  narrow their search instead of scrolling further. */
const CARDS_PER_BUCKET = 20

type RoleRequirement = {
  kind: string
  min_years: number | null
  max_years?: number | null
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
export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; tab?: string }>
}) {
  const { show, tab } = await searchParams
  // Everything we hold for this candidate is the default view. "New" is the
  // narrower question — what has appeared since they last looked — and it is a
  // tab rather than the whole page, which is what it used to be by framing: the
  // list was never date-filtered, but a page called Today with a date across
  // the top reads as though it were.
  const onlyNew = tab === 'new'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_role, confirmed_at, city, work_mode_preference')
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
      roles(title, city, apply_url, company_name, role_requirements(*))
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

  // A work-mode preference is a filter wearing a score component's clothes. Set
  // to "remote" against this index it fails almost everywhere, which put the
  // identical line — "You asked for remote." — on all 246 cards as the reason
  // for every score. The line is true and stays; what was missing is the fact
  // that makes it actionable, which belongs here once rather than there 246
  // times. Counted from the stored breakdowns, so it is the real number.
  const wantsMode = profile.work_mode_preference && profile.work_mode_preference !== 'no_preference'
  const modeMatches = wantsMode
    ? rows.filter((r) => {
        const c = r.score_breakdown?.components?.find((x) => x.key === 'work_mode')
        return c ? c.points === c.max : false
      }).length
    : 0

  // Buckets are derived from the stored breakdown, not from a column, so they
  // can never fall out of step with the scorer. See src/match/score.ts.
  const newCount = rows.filter(isNew).length
  const visibleRows = onlyNew ? rows.filter(isNew) : rows

  const byBucket = new Map<Bucket, MatchRow[]>()
  for (const r of visibleRows) {
    const b = bucketFor(r.score_breakdown)
    if (!byBucket.has(b)) byBucket.set(b, [])
    byBucket.get(b)!.push(r)
  }
  // Rows arrive score-ordered from the database. Re-sort each bucket so the
  // city the candidate actually asked for comes first — a commute-cluster role
  // is worth showing, but never above an exact-city one. See locationRank().
  for (const list of byBucket.values()) {
    list.sort(
      (a, b) =>
        locationRank(a.score_breakdown) - locationRank(b.score_breakdown) ||
        (b.score ?? 0) - (a.score ?? 0),
    )
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
          {/* The headline used to read "Sorted by what fits, and what doesn't."
              The bucket headings below say that by existing, so it went. */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
              {[
                { key: 'all', label: 'All matches', count: rows.length, href: '/today' },
                { key: 'new', label: `New in ${NEW_WITHIN_DAYS} days`, count: newCount, href: '/today?tab=new' },
              ].map((t) => {
                const active = (t.key === 'new') === onlyNew
                return (
                  <Link
                    key={t.key}
                    href={t.href}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-primary'
                    }`}
                  >
                    {t.label}
                    <span className="font-mono tabular-nums opacity-70">{t.count}</span>
                  </Link>
                )
              })}
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{today}</p>
          </div>

          {/* A backend failure must never render as a verdict. If the read failed we
              say so plainly rather than showing an empty list. */}
          {error ? (
            <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              We couldn&apos;t load today&apos;s list. That&apos;s our problem, not a result — try again shortly.
            </p>
          ) : null}

          {onlyNew && visibleRows.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
              Nothing new in the last {NEW_WITHIN_DAYS} days. Your {rows.length} matches are all
              still there under <Link href="/today" className="font-semibold text-primary underline underline-offset-4">All matches</Link> —
              a quiet few days is our coverage, not a verdict on you.
            </p>
          ) : null}

          <BreakdownEngaged>
            {BUCKET_META.map(({ key, title, blurb }) => {
              const inBucket = byBucket.get(key) ?? []
              if (inBucket.length === 0) return null
              // ?show=<bucket> renders that bucket whole. A plain link, so this
              // costs no client JavaScript and the expanded view is its own
              // shareable URL.
              const expanded = show === key || show === 'all'
              const visible = expanded ? inBucket : inBucket.slice(0, CARDS_PER_BUCKET)
              return (
                <section key={key} className="mb-10" aria-labelledby={`bucket-${key}`}>
                  {/* The blurb was a sentence under every heading. It is on the
                      heading's title now — still there for anyone who wants it,
                      no longer four lines of prose between them and the roles. */}
                  <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-border pb-3">
                    <h3
                      id={`bucket-${key}`}
                      title={blurb}
                      className="text-xs font-bold uppercase tracking-[0.16em] text-primary"
                    >
                      {title}
                    </h3>
                    <span className="font-mono text-sm tabular-nums text-muted-foreground">
                      {inBucket.length}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {visible.map((r) => (
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

                  {/* The count above is always the whole bucket, so this reads
                      as "there is more", never as "there was a cut". */}
                  {visible.length < inBucket.length ? (
                    <Link
                      href={`/today?show=${key}${onlyNew ? '&tab=new' : ''}#bucket-${key}`}
                      className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-accent"
                    >
                      Show all {inBucket.length}
                      <ChevronRight className="size-3.5" />
                    </Link>
                  ) : null}
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
            <dl className="space-y-3">
              {[
                [(indexed ?? 0).toLocaleString('en-IN'), 'indexed'],
                [rows.length.toLocaleString('en-IN'), 'matched'],
                [strong.toLocaleString('en-IN'), 'strong'],
              ].map(([value, label]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-mono text-lg font-semibold tabular-nums tracking-[-0.03em] text-primary">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {/* The honest empty state, and only when it applies. It used to sit
                here on every visit, including days with 165 matches, where it
                answered a worry nobody had. */}
            {rows.length < 10 ? (
              <p className="mt-4 border-t border-border pt-4 text-[11px] leading-5 text-muted-foreground">
                A thin day is our coverage, not a verdict on you.
              </p>
            ) : null}
          </div>

          {/* Three standing promises, one line each. They were three paragraphs.
              Nothing is withdrawn — the clauses that went were restatements:
              "every score opens to show its working" is what the working button
              on every card already does, and what a salary-less index means for
              ranking follows from the sentence that remains. */}
          <div className="space-y-3 rounded-2xl border border-border bg-secondary/60 p-4 text-[11px] leading-5 text-muted-foreground">
            <p className="flex items-center gap-2.5">
              <ShieldCheck className="size-4 shrink-0" />
              <span className="font-semibold text-primary">We never apply for you.</span>
            </p>
            <p className="flex items-center gap-2.5">
              <Wallet className="size-4 shrink-0" />
              No employer here publishes a salary.
            </p>
            {/* The score presents as complete, so a requirement we don't read has
                to be named or it reads as one we checked and found nothing on.
                Attributed to our coverage, never to the candidate. */}
            {/* Only when it is actually biting. A preference that most roles
                meet needs no announcement. */}
            {wantsMode && rows.length > 0 && modeMatches <= rows.length / 4 ? (
              <p className="flex items-start gap-2.5">
                <Laptop className="mt-0.5 size-4 shrink-0" />
                <span>
                  You asked for <strong className="font-semibold text-primary">{profile.work_mode_preference}</strong>.{' '}
                  <strong className="font-mono tabular-nums text-primary">{modeMatches}</strong> of{' '}
                  <strong className="font-mono tabular-nums text-primary">{rows.length}</strong>{' '}
                  match that — the rest lose those points on every card.
                </span>
              </p>
            ) : null}
            {gap ? (
              <p className="flex items-center gap-2.5">
                <Eye className="size-4 shrink-0" />
                <span>
                  We don&apos;t read {gap.decidedBy} yet.
                </span>
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </AppShell>
  )
}
