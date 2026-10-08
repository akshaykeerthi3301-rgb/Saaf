import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Calculator, TrendingUp } from 'lucide-react'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import type { ScoreBreakdown } from '@/match/score'
import { HIGH_PRECISION_MIN } from '@/lib/score-bands'
import { AskSaaf } from '@/components/features/ask-saaf'
import { missionProgress, missions, proactive } from '@/lib/assistant'
import { readMissionFacts, readProactiveFacts } from '@/lib/services/assistant'

/**
 * The copilot diagnostic.
 *
 * ⚠️ THE "COOKIE" PERSONA WAS REMOVED FROM THIS SCREEN, 2026-09-14. It spoke in
 * the first person ("I scored 42 roles against your profile") and was the only
 * place in the product using that name, which made it the fourth name for one
 * product — the locked decision is that the name is Jobinko. Keeping it would have
 * meant introducing a character somewhere; the diagnostic does not need one to
 * report an average. The MODULE names are deliberately untouched:
 * `lib/services/cookie.ts` and the interview-prep engine keep theirs, because
 * renaming internals buys the reader nothing and loses the history.
 *
 * ⚠️ EVERY NUMBER ON THIS PAGE IS COMPUTED FROM THE CANDIDATE'S OWN SCORED
 * SHORTLIST. The reference screens for this — a category leader's, and the v0
 * mock — show
 * a "Profile Strength: 92%" dial, a weekly application allowance and a B2B
 * discoverability toggle. None of those are measurements — the first is a made-up
 * composite, the second is a feature that does not exist, and the third is
 * parked pending a consent model. A dial reading 92% out of nothing at all is
 * the exact failure this product was built to argue against, so none of them
 * are here.
 *
 * What IS here is the question a diagnostic should answer and this product can:
 * across every role we scored for you, WHERE ARE YOU LOSING POINTS? The scorer
 * already breaks each role into five weighted components and stores them, so
 * averaging those components across the shortlist is a real finding, and the
 * fix for each one is a real action.
 */
export default async function CopilotPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_role, confirmed_at, skills, city')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.confirmed_at) redirect('/start')

  const { data: rows } = await supabase
    .from('gate_results')
    .select('score, score_breakdown')
    .eq('user_id', user.id)

  const [missionFacts, proactiveFacts] = await Promise.all([readMissionFacts(user.id), readProactiveFacts(user.id)])
  const checklist = missions(missionFacts)
  const progress = missionProgress(checklist)
  const notes = proactive(proactiveFacts)

  const scored = (rows ?? []) as { score: number | null; score_breakdown: ScoreBreakdown | null }[]
  const initials = (user.email ?? 'you').slice(0, 2).toUpperCase()

  /**
   * Average share of each component actually earned, across the shortlist.
   *
   * A share, not a raw average, because the components carry different weights
   * — 28 for title against 7 for work mode — and a raw mean would read as
   * though the title component were four times the problem it is.
   */
  const totals = new Map<string, { label: string; points: number; max: number }>()
  for (const r of scored) {
    for (const c of r.score_breakdown?.components ?? []) {
      if (c.key === 'cap' || c.max <= 0) continue
      const t = totals.get(c.key) ?? { label: c.label, points: 0, max: 0 }
      t.points += c.points
      t.max += c.max
      totals.set(c.key, t)
    }
  }

  const components = [...totals.entries()]
    .map(([key, t]) => ({ key, label: t.label, share: t.max ? t.points / t.max : 0, lost: t.max - t.points }))
    .sort((a, b) => a.share - b.share)

  const skillCount = (profile.skills ?? []).length

  /** What to do about the weakest component — an action, not an adjective. */
  const ADVICE: Record<string, { what: string; href: string; cta: string }> = {
    skills: {
      // Two different findings wear the same low number, and the advice for
      // one is useless for the other. No skills on file means the component
      // cannot score at all; twenty on file means the postings are not naming
      // them, which is a signal about the ROLE being searched, not the résumé.
      what: skillCount === 0
        ? 'No skills were read from your résumé, so this component — 20 points of 100 — cannot score at all. Every role you see is being marked out of 80.'
        : `We read ${skillCount} ${skillCount === 1 ? 'skill' : 'skills'} off your résumé, and the postings you are being scored against are mostly not naming them. That is usually a sign the preferred role is reaching a different kind of posting than your experience describes, rather than anything missing from your profile.`,
      href: skillCount === 0 ? '/resume' : '/profile',
      cta: skillCount === 0 ? 'See what we read' : 'Try a different role',
    },
    seniority: {
      what: 'Most postings you are scored against state more years than your profile holds. This is the market, not a flaw in your profile — but a more specific preferred role reaches postings pitched at your level.',
      href: '/profile', cta: 'Narrow your role',
    },
    title: {
      what: 'Your preferred role is matching postings loosely. A more specific title scores fewer roles higher, which is usually the better shortlist.',
      href: '/profile', cta: 'Change your role',
    },
    location: {
      what: 'Many of the roles being scored are in other cities. Adding the city you would actually move to, or setting remote, changes which section they land in.',
      href: '/profile', cta: 'Set your location',
    },
    work_mode: {
      what: 'Your work-mode preference is not met by most of this index. It costs 7 points of 100 where it fails.',
      href: '/profile', cta: 'Review the preference',
    },
    credential: {
      what: 'Some postings state a credential your profile does not list. It is a small component and only bites where a posting actually asks.',
      href: '/profile', cta: 'Add a credential',
    },
  }

  const strong = scored.filter((r) => (r.score ?? 0) >= HIGH_PRECISION_MIN).length
  const weakest = components[0]

  return (
    <AppShell title="Copilot Diagnostic" initials={initials}>
      <div className="mx-auto max-w-3xl p-5 sm:p-8">
        {notes.length > 0 ? (
          <ul aria-label="Worth a look" className="mb-5 space-y-2">
            {notes.map((n) => (
              <li key={n.key} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-primary">
                <span>{n.text}</span>
                <Link href={n.href} className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent">{n.cta}<ArrowRight className="size-3.5" /></Link>
              </li>
            ))}
          </ul>
        ) : null}

        <AskSaaf />

        <section aria-label="Getting started" className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" data-testid="missions">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Getting started</h2>
            <p className="font-mono text-xs tabular-nums text-muted-foreground">{progress.done} of {progress.total}</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary" role="presentation">
            <div className="h-full rounded-full bg-accent" style={{ width: `${progress.total ? (100 * progress.done) / progress.total : 0}%` }} />
          </div>
          <ul className="mt-4 space-y-3">
            {checklist.map((m) => (
              <li key={m.key} className="flex items-start gap-3">
                <span aria-hidden="true" className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${m.done ? 'border-accent bg-accent text-primary-foreground' : 'border-border text-transparent'}`}>✓</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${m.done ? 'text-muted-foreground line-through' : 'text-primary'}`}>{m.label}</p>
                  {!m.done ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{m.why}</p> : null}
                </div>
                {!m.done ? <Link href={m.href} className="shrink-0 text-xs font-semibold text-accent hover:underline">{m.cta}</Link> : null}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-5 flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Calculator className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">Your shortlist, averaged</p>
            {scored.length ? (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Jobinko scored{' '}
                <span className="font-mono tabular-nums text-primary">{scored.length}</span> roles
                against your profile.{' '}
                <span className="font-mono tabular-nums text-primary">{strong}</span>{' '}
                {/* The card's own band name. "Strong match" is 60–74 on the card, so
                    "3 are a strong match" contradicted seven cards (QA-10). */}
                {strong === 1 ? 'is a high-precision match' : 'are high-precision matches'}.
                {weakest ? (
                  <>
                    {' '}The component costing you most across all of them is{' '}
                    <span className="font-semibold text-primary">{weakest.label.toLowerCase()}</span>.
                  </>
                ) : null}
              </p>
            ) : (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Nothing has been scored for you yet. Once your shortlist is built this page shows
                where the points are going.
              </p>
            )}
          </div>
        </div>

        {components.length ? (
          <>
            <h2 className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Where your points go
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Averaged across every role scored for you. Weakest first — this is the arithmetic behind
              your shortlist, not an assessment of you.
            </p>

            <div className="mt-4 space-y-3">
              {components.map((c) => {
                const pct = Math.round(c.share * 100)
                return (
                  <div key={c.key} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold text-primary">{c.label}</p>
                      <p className="font-mono text-sm tabular-nums text-muted-foreground">{pct}%</p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${pct}%` }}
                        role="presentation"
                      />
                    </div>
                    {ADVICE[c.key] ? (
                      <>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{ADVICE[c.key].what}</p>
                        <Link
                          href={ADVICE[c.key].href}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-accent"
                        >
                          {ADVICE[c.key].cta}
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </>
        ) : null}

        {/* Said plainly rather than implied by absence. A diagnostic that quietly
            omits what it cannot do invites the reader to assume it did it. */}
        <div className="mt-8 flex gap-3 rounded-2xl border border-border bg-secondary/50 p-5">
          <TrendingUp className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-5 text-muted-foreground">
            Jobinko does not score your career trajectory, your industry context or your profile
            strength. Those appear on comparable products as single numbers; none of them is measured
            here, and inventing one would make every other figure on this page worth less. What is
            above is the scorer&apos;s own arithmetic, and you can check any of it against the working
            on each role.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
