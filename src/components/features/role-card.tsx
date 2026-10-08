import { Briefcase, Calendar, MapPin, Signal, Users, Wallet, Wifi } from 'lucide-react'
import { TrackRole } from '@/components/features/track-role'
import { QuickApply } from '@/components/features/quick-apply'
import { bandFor } from '@/components/ui/fit-ring'
import { ScoreRing, ringBand } from '@/components/ui/score-ring'
import { isEarlyPosting, isEasyApply, titleSeniority } from '@/lib/job-facts'
import { postedAgo, postedOn } from '@/lib/day'
import { scoreBars } from '@/lib/score-bars'
import type { ReactNode } from 'react'
import type { RepostChip } from '@/lib/repost'
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
  /** Kept on the props for the callers that still pass it; the card no longer prints it (the detail view does). */
  reason?: string
  applyUrl?: string
  isNew?: boolean
  /** roles.posted_at — the date the employer's board gave, never our own. */
  postedAt?: string
  /** Drawn only where the ingest recorded an earlier listing (src/lib/repost.ts). */
  repost?: RepostChip | null
  /** "Public" or "Startup", from open company data (src/lib/company-stage.ts). */
  stage?: StageChip | null
  /** The candidate's tracker stage for this role, when tracked. */
  trackedStatus?: string
  /** The Hide / Unhide control, passed in so this card stays a server component. */
  hideControl?: ReactNode
  /** Pay as the posting states it (src/lib/stated-pay.ts). Never estimated. */
  statedPay?: string | null
  /** How many of the candidate's own LinkedIn connections work at this company. */
  connections?: number
  /** One sentence about the job, verbatim from the posting (src/lib/job-gist.ts). */
  gist?: string | null
  /** What the employer's own system states (migration 0041). */
  workMode?: 'remote' | 'hybrid' | 'onsite' | null
  employmentType?: 'fulltime' | 'parttime' | 'contract' | 'intern' | 'temporary' | null
  /** The years the posting asks for, when it states them with confidence. */
  minYears?: number | null
  // Accepted and ignored — callers that still pass them need not change.
  interest?: unknown
}

const TONE = { high: 'text-score-high', mid: 'text-score-mid', low: 'text-muted-foreground' } as const
const chip = 'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium'
const WORK_MODE = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' } as const
const EMPLOYMENT = { fulltime: 'Full-time', parttime: 'Part-time', contract: 'Contract', intern: 'Internship', temporary: 'Temporary' } as const

/**
 * A scored role in the feed — rebuilt on 2026-10-09 to the reference product's card, after the founder's verdict on the
 * feed ("cluttered, not even close"): the card used to carry a paragraph of reasoning, a second paragraph, three bars,
 * a line of facts and three buttons. Now:
 *
 *   left   logo · quiet chips · title · "company / one line about the job" · a grid of facts · the actions
 *   right  a score panel: the ring, its word, and up to two ticks for what is strong
 *
 * Nothing was deleted from the product: the reasoning, the three bars and the arithmetic open in the job's detail
 * (a click anywhere on the card), where there is room to read them. Still a server component.
 */
export function RoleCard({
  roleId, title, company, city, score, breakdown, applyUrl,
  isNew, postedAt, repost, stage, trackedStatus, hideControl, statedPay, connections, gist,
  workMode, employmentType, minYears,
}: Props) {
  const band = ringBand(score)
  const posted = postedAgo(postedAt)
  const easy = isEasyApply(applyUrl)
  const seniority = titleSeniority(title)
  const bars = scoreBars(breakdown)
  const share = (label: string) => bars.find((b) => b.label === label)?.share ?? 0

  // Up to two ticks, only for what the stored arithmetic says is strong.
  const ticks = [
    share('Role') >= 0.9 ? 'Title match' : null,
    share('Skills') >= 0.7 ? 'Skills fit' : null,
    share('Experience') >= 0.9 ? 'Experience fits' : null,
    stage?.label ?? null,
  ].filter((t): t is string => Boolean(t)).slice(0, 2)

  const facts: { icon: typeof MapPin; text: string }[] = [
    city ? { icon: MapPin, text: city } : null,
    employmentType ? { icon: Briefcase, text: EMPLOYMENT[employmentType] } : null,
    workMode ? { icon: Wifi, text: WORK_MODE[workMode] } : null,
    seniority ? { icon: Signal, text: seniority } : null,
    minYears !== null && minYears !== undefined ? { icon: Calendar, text: `${minYears}+ years exp` } : null,
    statedPay ? { icon: Wallet, text: statedPay } : null,
  ].filter((f): f is { icon: typeof MapPin; text: string } => Boolean(f))

  return (
    <article data-tour="card" className="flex overflow-hidden rounded-2xl bg-card">
      <div className="min-w-0 flex-1 p-5">
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-xl font-semibold text-primary">
            {(company || title).trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              {isNew ? <span className={`${chip} bg-accent/10 text-accent`} title="First shown to you in the last 7 days">New</span> : null}
              {posted && postedAt ? (
                <span className={`${chip} bg-secondary text-muted-foreground`} title={`Posted ${postedOn(postedAt)}, as dated by the employer's job board`}>{posted}</span>
              ) : null}
              {isEarlyPosting(postedAt) ? (
                <span className={`${chip} bg-score-high/10 text-score-high`} title="Posted in the last 3 days, by the employer's own date. We cannot see how many people have applied.">Early applicant</span>
              ) : null}
              {repost ? <span className={`${chip} bg-secondary text-muted-foreground`} title={repost.title}>{repost.label}</span> : null}
              {connections ? (
                <span className={`${chip} bg-score-high/10 text-score-high`} title="From the LinkedIn connections you uploaded">
                  <Users className="size-3" aria-hidden="true" />
                  {connections === 1 ? '1 connection' : `${connections} connections`}
                </span>
              ) : null}
            </div>
            <h3 className="text-lg font-semibold leading-snug tracking-[-0.025em] text-primary sm:text-xl">{title}</h3>
            <p className="mt-0.5 truncate text-sm text-muted-foreground" title={gist ? `${company} / ${gist}` : company}>
              <span className="font-semibold text-primary">{company}</span>
              {gist ? <span> / {gist}</span> : null}
            </p>
          </div>
          {/* Phone: the panel on the right is hidden, so the ring rides beside the title. */}
          <div className="flex shrink-0 flex-col items-center gap-1 sm:hidden">
            <ScoreRing score={score} size={48} stroke={4} />
          </div>
        </div>

        {facts.length ? (
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 border-t border-border pt-4 text-sm text-primary lg:grid-cols-3">
            {facts.map(({ icon: Icon, text }) => (
              <li key={text} className="flex min-w-0 items-center gap-2"><Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="truncate">{text}</span></li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {hideControl}
          <TrackRole roleId={roleId} company={company} title={title} applyUrl={applyUrl} trackedStatus={trackedStatus} />
          {applyUrl ? <QuickApply roleId={roleId} company={company} title={title} applyUrl={applyUrl} easy={easy} /> : null}
        </div>
      </div>

      <div className="hidden w-44 shrink-0 flex-col items-center justify-center gap-2 border-l border-border bg-secondary/50 p-4 sm:flex" aria-label="Match score">
        <ScoreRing score={score} size={76} stroke={6} />
        <span className={`text-center text-xs font-bold uppercase leading-4 tracking-[0.08em] ${TONE[band]}`}>{bandFor(score)}</span>
        {ticks.length ? (
          <ul className="mt-1 w-full space-y-1 border-t border-border pt-2.5 text-xs font-medium text-primary">
            {ticks.map((t) => <li key={t} className="flex items-center gap-1.5"><span className="text-score-high" aria-hidden="true">✓</span>{t}</li>)}
          </ul>
        ) : null}
      </div>
    </article>
  )
}
