import { AlertCircle, BarChart3, ChevronRight, Clock, MapPin, Quote, Sparkles, Zap } from 'lucide-react'
import { ReportScore } from '@/components/features/report-score'
import { TrackRole } from '@/components/features/track-role'
import { QuickApply } from '@/components/features/quick-apply'
import { ViewMatchButton } from '@/components/features/feed-selection'
import { bandFor } from '@/components/ui/fit-ring'
import { ScoreRing } from '@/components/ui/score-ring'
import { factorHighlight } from '@/lib/job-insight'
import { isEasyApply, titleSeniority } from '@/lib/job-facts'
import { CONFIDENCE_THRESHOLD } from '@/gates/types'
import { postedAgo, postedOn } from '@/lib/day'
import { HIGH_PRECISION_MIN } from '@/lib/score-bands'
import type { ReactNode } from 'react'
import type { ScoreBreakdown } from '@/match/score'
import { requirementLabel } from '@/lib/display-names'

/** One requirement the extractor read out of a posting, with the sentence it
 *  came from. Lived in the retired `row.tsx` alongside the three-outcome role
 *  row; the row went with gating, this stayed. */
export type EvidenceItem = {
  kind: string
  minYears?: number
  credential?: string
  valueText?: string
  /** The literal sentence from the posting. Rendered as plain text — never
   *  dangerouslySetInnerHTML — since it's untrusted third-party content. */
  sourceQuote: string
  confidence: number
}

type Props = {
  /** gate_results.id — what a score report is filed against. */
  gateResultId: string
  /** roles.id — what an application is tracked against. */
  roleId: string
  title: string
  company: string
  city?: string
  score: number
  breakdown?: ScoreBreakdown | null
  reason: string
  applyUrl?: string
  isNew?: boolean
  requirements?: EvidenceItem[]
  profileCity?: string
  /** roles.posted_at — the date the employer's board gave, never our own. */
  postedAt?: string
  /** The candidate's tracker stage for this role, when tracked. */
  trackedStatus?: string
  /** The Hide / Unhide control (Phase 15), passed in so this card stays a server component. */
  hideControl?: ReactNode
}

/**
 * A scored role, in the feed's split view (2026-09-23 parity pass).
 *
 * Monogram, title, company, fact chips, the gradient ring coloured by band,
 * a factor highlight, the reason line, and three actions: Save job, Quick
 * Apply, View detailed match. Clicking the card body selects it into the
 * right-hand panel (SelectableCard, in the page), which carries the skill gap,
 * fit/risk lists, company snapshot and the formatted description.
 *
 * WHAT DID NOT GO: the reason line. A score without its reason is the exact
 * failure this product exists to correct, so it stays on the face of the card
 * at full length even when everything around it is cut.
 *
 * Still a server component. The disclosure is a native <details>, the only
 * client code is the action buttons, and the breakdown is never behind a
 * request — a candidate can check the arithmetic without a round trip.
 */
export function RoleCard({
  gateResultId, roleId, title, company, city, score, breakdown, reason, applyUrl,
  isNew, requirements, profileCity, postedAt, trackedStatus, hideControl,
}: Props) {
  const band = bandFor(score)
  const posted = postedAgo(postedAt)
  const easy = isEasyApply(applyUrl)
  const seniority = titleSeniority(title)
  const highlight = factorHighlight(breakdown)

  /**
   * One quote, shown once.
   *
   * A single sentence often yields two legitimate readings — "Exp should be in
   * between 2 - 4 years, out of which minimum 2 years in product management"
   * produces both a 2–4 band and a bare 2-year floor. Both are correct, and the
   * card displays only the quote, so they render as the identical line twice.
   * A candidate reads that as a bug in the product that is telling them it
   * shows its working, which is the worst possible place to look sloppy.
   *
   * Keeps the better-informed reading of each quote: higher confidence first,
   * then the one that also captured a ceiling. Nothing is lost that the
   * candidate could have acted on — the discarded row quotes the same sentence.
   */
  const shownRequirements = Object.values(
    (requirements ?? []).reduce<Record<string, EvidenceItem>>((acc, r) => {
      const key = `${r.kind}||${r.sourceQuote}`
      const prev = acc[key]
      if (
        !prev ||
        r.confidence > prev.confidence ||
        (r.confidence === prev.confidence && r.minYears !== undefined && prev.minYears === undefined)
      ) {
        acc[key] = r
      }
      return acc
    }, {}),
  )
  const components = breakdown?.components ?? []
  const strongBand = score >= HIGH_PRECISION_MIN

  return (
    <article className="rounded-2xl bg-card p-5 sm:p-6">
      <div className="flex gap-4">
        {/* A monogram, not a logo: no licensed logo source is wired, and a
            fetched favicon would be a third-party request per card. */}
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-lg font-semibold text-primary"
        >
          {(company || title).trim().charAt(0).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${
                strongBand ? 'bg-brand/15 text-accent' : 'bg-secondary text-muted-foreground'
              }`}
            >
              {band}
            </span>
            {isNew ? (
              <span
                className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
                title="First shown to you in the last 7 days"
              >
                New
              </span>
            ) : null}
            {easy ? (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-score-high/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-score-high"
                title="One-page application form, no account needed. Saaf’s extension can fill it; you submit."
              >
                <Zap className="size-3" aria-hidden="true" />
                Easy Apply
              </span>
            ) : null}
            {breakdown?.confidence === 'low' ? (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
                title="The posting states an experience bar we could not read confidently"
              >
                <AlertCircle className="size-3" aria-hidden="true" />
                Bar unread
              </span>
            ) : null}
          </div>

          <h3 className="text-lg font-semibold leading-snug tracking-[-0.03em] text-primary sm:text-xl">{title}</h3>
          <p className="mt-0.5 text-sm font-medium text-muted-foreground">{company}</p>

          {/* Fact chips: only values actually read — location, the seniority the
              TITLE states, the board's own posting date. No salary chip: 2.2%
              of postings state pay and nothing extracts it (Stage T). */}
          <div className="mt-3 flex flex-wrap gap-2">
            {city ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-xs text-primary">
                <MapPin className="size-3" aria-hidden="true" />
                {city}
              </span>
            ) : null}
            {seniority ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-xs text-primary" title="As stated in the job title">
                <BarChart3 className="size-3" aria-hidden="true" />
                {seniority}
              </span>
            ) : null}
            {posted && postedAt ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-xs text-primary"
                title={`Posted ${postedOn(postedAt)}, as dated by the employer's job board`}
              >
                <Clock className="size-3" aria-hidden="true" />
                {posted}
              </span>
            ) : null}
          </div>
        </div>

        <ScoreRing score={score} size={76} label="match" />
      </div>

      {highlight ? (
        <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-accent">
          <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
          {highlight}
        </p>
      ) : null}
      {/* The one line explaining the number. Never removed: a score without
          its reason is the exact failure this product exists to correct. */}
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{reason}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <TrackRole roleId={roleId} company={company} title={title} applyUrl={applyUrl} labelled trackedStatus={trackedStatus} />
        {applyUrl ? <QuickApply roleId={roleId} company={company} title={title} applyUrl={applyUrl} easy={easy} /> : null}
        <ViewMatchButton roleId={roleId} />
        {hideControl}
        <ReportScore gateResultId={gateResultId} />
      </div>

      {breakdown && (
        /* The working, still inline and still without a round trip — the panel
           carries the fuller analysis, but a candidate on a phone can check
           the arithmetic here without opening it. */
        <details className="group mt-3" data-breakdown="score">
          <summary className="inline-flex min-h-6 cursor-pointer list-none items-center gap-1 whitespace-nowrap py-1 text-xs font-semibold text-muted-foreground hover:text-primary">
            <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
            Insights
            {shownRequirements.length ? (
              <span className="font-mono tabular-nums">({shownRequirements.length})</span>
            ) : null}
          </summary>

          <ul className="mt-3 space-y-2 rounded-xl border border-border bg-secondary/40 p-4">
            {components.map((c) => (
              <li key={c.key} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {c.note}
              </li>
            ))}
          </ul>

          {shownRequirements.length > 0 && (
            <div className="mt-2 space-y-3 rounded-xl border border-border bg-secondary/40 p-4">
              {shownRequirements.map((r, i) => (
                <div key={i}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {requirementLabel(r.kind)}
                    {r.confidence < CONFIDENCE_THRESHOLD ? ' · read with low confidence' : ''}
                  </p>
                  {r.kind === 'location' && profileCity && (
                    <p className="mt-1 text-xs text-muted-foreground">Your city on file: {profileCity}</p>
                  )}
                  <blockquote className="mt-1 flex gap-2 text-xs leading-5 text-muted-foreground">
                    <Quote className="mt-0.5 size-3 shrink-0 text-accent" />
                    <span>{r.sourceQuote}</span>
                  </blockquote>
                </div>
              ))}
            </div>
          )}
        </details>
      )}
    </article>
  )
}
