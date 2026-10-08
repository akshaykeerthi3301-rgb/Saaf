import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Compass } from 'lucide-react'
import { AppShell } from '@/components/features/app-shell'
import { RoleCard } from '@/components/features/role-card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { readAccountSummary } from '@/lib/services/workspace'
import { exploreIndex } from '@/lib/services/explore'
import { parseFeedQuery, viewFromParams } from '@/lib/feed-query'
import { describeView } from '@/lib/search-history'
import { EXPLORE_SCAN } from '@/lib/explore'
import { displayCity, displayEmployer } from '@/lib/display-names'

export const metadata = { title: 'Search all roles — Saaf' }

/**
 * Search the WHOLE index, not just your matches (TASK-217, F-201).
 *
 * The box on /today answers inside the ~395 roles already scored for your saved roles, so a role outside
 * them — "data analyst" for a customer-success candidate — found nothing while thousands sat in the index.
 * Here the same sentence goes through the same parser, the whole index is searched, and the first 200 roles
 * that fit are scored on the spot with the scorer the nightly run uses. The page says plainly that these are
 * OUTSIDE the saved preferences, how many fit, how many were scored, and which filters it could not apply.
 * Nothing is saved: a role joins your matches only when you track it.
 */
export default async function ExplorePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const raw = await searchParams
  const one = (k: string): string | undefined => (Array.isArray(raw[k]) ? (raw[k] as string[])[0] : (raw[k] as string | undefined))
  const sentence = (one('s') ?? '').replace(/\s+/g, ' ').trim().slice(0, 200)
  // A typed sentence wins; otherwise the filters carried over from /today.
  const view = sentence ? parseFeedQuery(sentence) : viewFromParams(Object.fromEntries(Object.keys(raw).map((k) => [k, one(k)])))
  const readAs = describeView(view)

  const [result, account] = await Promise.all([
    exploreIndex(user.id, view),
    readAccountSummary(user.id, user.email ?? ''),
  ])
  if (result.kind === 'unconfirmed') redirect('/start/confirm')

  return (
    <AppShell title="Search all roles" eyebrow="Beyond your matches" initials={account.initials}>
      <div className="mx-auto max-w-3xl space-y-5 p-5 sm:p-8">
        <p className="text-sm leading-6 text-muted-foreground">
          <Compass className="mr-1.5 inline size-4 align-text-bottom" aria-hidden="true" />
          Your feed shows roles for the jobs you saved. This searches <span className="font-semibold text-primary">every open role we index</span>, including ones outside those jobs, and scores what it finds against your profile as you search.{' '}
          <Link href="/today" className="font-semibold text-primary underline underline-offset-4">Back to your matches</Link>
        </p>

        <form action="/today/explore" method="get" className="flex flex-col gap-2 sm:flex-row">
          <input
            name="s"
            defaultValue={sentence}
            placeholder="Describe the job — e.g. remote data analyst in Pune, posted this week"
            aria-label="Describe the job you want"
            className="min-w-0 flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm text-primary placeholder:text-muted-foreground"
          />
          <Button type="submit">Search all roles</Button>
        </form>

        {readAs.length ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {sentence ? <>You said “{sentence}” — read as </> : <>Searching for </>}
            <span className="font-semibold text-primary">{readAs.join(' · ')}</span>
          </p>
        ) : null}

        {result.kind === 'failed' ? (
          <p className="rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
            The search could not be read just now. Nothing is wrong with your matches — try again in a moment.
          </p>
        ) : result.kind === 'open-ended' ? (
          <p className="rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
            Say what you are after — a word from the job title, a city, “remote”, or how recent. Searching with nothing to go on would just show the newest roles of every kind.
          </p>
        ) : (
          <>
            <p className="text-sm leading-6 text-muted-foreground">
              <span className="font-semibold text-primary">{result.total.toLocaleString('en-IN')}</span> open {result.total === 1 ? 'role' : 'roles'} in the index {result.total === 1 ? 'fits' : 'fit'} this.
              {result.total > result.scanned
                ? <> The newest {result.scanned.toLocaleString('en-IN')} (of {EXPLORE_SCAN} read at a time) were scored against your profile; narrow the search to reach the older {(result.total - result.scanned).toLocaleString('en-IN')}.</>
                : <> All {result.scanned.toLocaleString('en-IN')} were scored against your profile.</>}
              {result.removedAfterScoring > 0 ? ` ${result.removedAfterScoring} more ${result.removedAfterScoring === 1 ? 'was' : 'were'} set aside by Match 80+, Easy Apply or the staffing-agency filter.` : ''}
            </p>
            {result.plan.notApplied.length ? (
              <p className="rounded-xl border border-border bg-secondary/60 p-3 text-xs leading-5 text-muted-foreground">
                Not applied here: {result.plan.notApplied.join('; ')}.
              </p>
            ) : null}

            {result.shown.length === 0 ? (
              <p className="rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
                No open role in the whole index fits that. That is the search, not you — try fewer words, or take off the city or the date.
              </p>
            ) : (
              <div className="space-y-4">
                {result.shown.map((r) => (
                  <div key={r.roleId}>
                    <RoleCard
                      roleId={r.roleId}
                      title={r.title}
                      company={displayEmployer(r.company)}
                      city={displayCity(r.city) || undefined}
                      score={r.score}
                      breakdown={r.breakdown}
                      reason={r.reason}
                      applyUrl={r.applyUrl ?? undefined}
                      postedAt={r.postedAt ?? undefined}
                      statedPay={r.statedPay}
                      gist={r.gist}
                    />
                    <p className="mt-1.5 px-1 text-xs text-muted-foreground">
                      Outside your saved roles ·{' '}
                      <Link href={`/jobs/${r.roleId}`} className="font-semibold text-primary underline underline-offset-4">Read the posting</Link>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
