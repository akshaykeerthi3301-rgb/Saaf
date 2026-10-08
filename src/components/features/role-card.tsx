import { AlertCircle, Users } from 'lucide-react'
import { TrackRole } from '@/components/features/track-role'
import { QuickApply } from '@/components/features/quick-apply'
import { bandFor } from '@/components/ui/fit-ring'
import { ScoreRing, ringBand } from '@/components/ui/score-ring'
import { isEarlyPosting, isEasyApply, titleSeniority } from '@/lib/job-facts'
import { postedAgo, postedOn } from '@/lib/day'
import { scoreBars } from '@/lib/score-bars'
import type { ReactNode } from 'react'
import { whyThisMatches } from '@/lib/why-match'
import type { RepostChip } from '@/lib/repost'
import type { InterestChip } from '@/lib/interest'
import type { StageChip } from '@/lib/company-stage'
import type { ScoreBreakdown } from '@/match/score'

type Props = {
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
  /** roles.posted_at — the date the employer's board gave, never our own. */
  postedAt?: string
  /** Drawn only where the ingest recorded an earlier listing (src/lib/repost.ts). */
  repost?: RepostChip | null
  /** How many Saaf candidates track this role — only from 3 up (src/lib/interest.ts). */
  interest?: InterestChip | null
  /** "Public" or "Startup", from open company data (src/lib/company-stage.ts). */
  stage?: StageChip | null
  /** The candidate's tracker stage for this role, when tracked. */
  trackedStatus?: string
  /** The Hide / Unhide control (Phase 15), passed in so this card stays a server component. */
  hideControl?: ReactNode
  /** Pay as the posting states it (src/lib/stated-pay.ts). Never estimated. */
  statedPay?: string | null
  /** How many of the candidate's own LinkedIn connections work at this company. */
  connections?: number
  /** One or two sentences about the job, verbatim from the posting (src/lib/job-gist.ts). */
  gist?: string | null
}

const TONE = { high: 'text-score-high', mid: 'text-score-mid', low: 'text-muted-foreground' } as const
const BAR = { high: 'bg-score-high', mid: 'bg-score-mid', low: 'bg-muted-foreground/50' } as const
const chip = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium'

/**
 * A scored role in the feed — redesigned 2026-10-08 against the teardown's UI spec
 * §S3 (the job card), after the founder's verdict on the feed: "cluttered … no
 * similarity". DESIGN.md already set this card a budget of four rows of text and
 * recorded cutting it from nine; the parity passes had grown it back to about
 * twenty things, so this is a return to the rule, not a new one.
 *
 *   chips   age · reposted · early applicant · connections · (new) — quiet
 *   title   and "company · city · level · stated pay" on ONE line
 *   why     ONE paragraph — the reason line and the score's own strength and gap
 *   bars    Role · Skills · Experience, each read from the stored arithmetic
 *   actions save · hide · Quick apply, with the score ring and its word on the right
 *
 * WHAT MOVED, NOT WHAT WENT: the "Insights" disclosure, the requirement quotes, the
 * "this score looks wrong" flag and "View detailed match" now live in the detail
 * panel, one click away (a click anywhere on the card opens it). The reason line
 * stays on the face of the card in full — a score without its reason is the failure
 * this product exists to correct.
 *
 * Still a server component; the only client code is the actions.
 */
export function RoleCard({
  roleId, title, company, city, score, breakdown, reason, applyUrl,
  isNew, postedAt, repost, interest, stage, trackedStatus, hideControl, statedPay, connections, gist,
}: Props) {
  const band = ringBand(score)
  const posted = postedAgo(postedAt)
  const easy = isEasyApply(applyUrl)
  const seniority = titleSeniority(title)
  const why = whyThisMatches(breakdown, reason)
  const bars = scoreBars(breakdown)
  const facts = [company, city, seniority, statedPay].filter(Boolean)

  return (
    <article data-tour="card" className="rounded-2xl bg-card p-5">
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          {/* Quiet chips, and only the ones that are true of this role. */}
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {isNew ? (
              <span className={`${chip} bg-accent/10 text-accent`} title="First shown to you in the last 7 days">New</span>
            ) : null}
            {posted && postedAt ? (
              <span className={`${chip} bg-secondary text-muted-foreground`} title={`Posted ${postedOn(postedAt)}, as dated by the employer's job board`}>
                {posted}
              </span>
            ) : null}
            {repost ? (
              <span className={`${chip} bg-secondary text-muted-foreground`} title={repost.title}>{repost.label}</span>
            ) : null}
            {isEarlyPosting(postedAt) ? (
              <span className={`${chip} bg-score-high/10 text-score-high`} title="Posted in the last 3 days, by the employer's own date. We cannot see how many people have applied.">
                Early applicant
              </span>
            ) : null}
            {stage ? (
              <span className={`${chip} bg-secondary text-muted-foreground`} title={stage.title}>{stage.label}</span>
            ) : null}
            {interest ? (
              <span className={`${chip} bg-secondary text-muted-foreground`} title={interest.title}>
                <Users className="size-3" aria-hidden="true" />
                {interest.label}
              </span>
            ) : null}
            {connections ? (
              <span className={`${chip} bg-score-high/10 text-score-high`} title="From the LinkedIn connections you uploaded">
                <Users className="size-3" aria-hidden="true" />
                {connections === 1 ? '1 connection' : `${connections} connections`}
              </span>
            ) : null}
            {breakdown?.confidence === 'low' ? (
              <span className={`${chip} bg-secondary text-muted-foreground`} title="The posting states an experience bar we could not read confidently">
                <AlertCircle className="size-3" aria-hidden="true" />
                Bar unread
              </span>
            ) : null}
          </div>

          <h3 className="text-base font-semibold leading-snug tracking-[-0.02em] text-primary sm:text-lg">{title}</h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground" title={facts.join(' · ')}>
            {facts.map((f, i) => (
              <span key={i}>
                {i > 0 ? ' · ' : ''}
                {i === 0 ? <span className="font-medium text-primary/90">{f}</span> : f}
              </span>
            ))}
          </p>

          {/* What the job IS, in the posting's own words (TASK-218). Two lines at most; the full text is in the panel. */}
          {gist ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground" title={gist}>
              <span className="font-semibold text-primary">The job: </span>
              {gist}
            </p>
          ) : null}

          {/* The one paragraph. The reason line first, in full; then the best part of the
              score and, if there is one, the thing to check — all from the score's own
              notes (src/lib/why-match.ts), never written by a model. */}
          <p className={`${gist ? 'mt-2' : 'mt-3'} text-sm leading-6 text-muted-foreground`}>
            <span className="font-semibold text-primary">Why this matches: </span>
            {reason}
            {why.strength ? ` ${why.strength}` : ''}
            {why.gap ? <span className="text-muted-foreground"> Check first: {why.gap}</span> : null}
          </p>

          {bars.length > 0 ? (
            // Phone: the three bars live in the detail sheet one tap away (TASK-165); the reason line stays in full.
            <div className="mt-3 hidden flex-wrap gap-x-6 gap-y-2 sm:flex" aria-label="Score parts">
              {bars.map((b) => {
                const tone = b.share >= 0.7 ? 'high' : b.share >= 0.5 ? 'mid' : 'low'
                return (
                  <div key={b.label} className="w-28">
                    <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
                      <span>{b.label}</span>
                      <span className="font-mono tabular-nums">{Math.round(b.share * 100)}%</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
                      <div className={`h-full rounded-full ${BAR[tone]}`} style={{ width: `${Math.max(4, b.share * 100)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1.5 self-start">
          <ScoreRing score={score} size={64} stroke={5} />
          <span className={`max-w-[88px] text-center text-[10px] font-bold uppercase leading-3 tracking-[0.08em] ${TONE[band]}`}>{bandFor(score)}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <TrackRole roleId={roleId} company={company} title={title} applyUrl={applyUrl} trackedStatus={trackedStatus} />
        {hideControl}
        {applyUrl ? (
          <span className="ml-auto">
            <QuickApply roleId={roleId} company={company} title={title} applyUrl={applyUrl} easy={easy} />
          </span>
        ) : null}
      </div>
    </article>
  )
}
