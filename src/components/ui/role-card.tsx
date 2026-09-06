import { ChevronRight, MapPin, Quote } from 'lucide-react'
import { ReportScore } from '@/components/features/report-score'
import { TrackRole } from '@/components/features/track-role'
import { CONFIDENCE_THRESHOLD } from '@/gates/types'
import type { Bucket, ScoreBreakdown } from '@/match/score'
import type { EvidenceItem } from './row'

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
  bucket: Bucket
}

/**
 * A scored role, in the saaf-ai card design.
 *
 * The score ring is the export's FitScore, wired to the real number and the
 * real components. The export hard-codes "Industry Context 9/10, Trajectory
 * 8/10"; those two components are planned and not built, so the ring shows the
 * two highest-weighted components that actually exist rather than inventing the
 * two that don't.
 *
 * Still a server component. The disclosures are native <details>, the only
 * client code is the two action buttons, and the breakdown is never behind a
 * request — a candidate can check the arithmetic without a round trip.
 */
export function RoleCard({
  gateResultId, roleId, title, company, city, score, breakdown, reason, applyUrl,
  isNew, requirements, profileCity, bucket,
}: Props) {
  const strong = bucket === 'matches' && score >= 75
  const band = score >= 75 ? 'Strong match' : score >= 50 ? 'Worth a look' : 'Weak match'

  // Highest-weighted components first — what most moved this number.
  const top = (breakdown?.components ?? [])
    .slice()
    .sort((a, b) => b.max - a.max)
    .slice(0, 2)

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_230px]">
        <div className="flex min-h-[190px] min-w-0 flex-col">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
              {strong ? 'High-precision match' : band}
            </span>
            {isNew && (
              <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                New
              </span>
            )}
            {breakdown?.confidence === 'low' && (
              <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                Experience bar unread
              </span>
            )}
          </div>

          {applyUrl ? (
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl font-semibold tracking-[-0.045em] text-primary hover:underline sm:text-2xl"
            >
              {title}
            </a>
          ) : (
            <h3 className="text-xl font-semibold tracking-[-0.045em] text-primary sm:text-2xl">{title}</h3>
          )}
          <p className="mt-1 text-sm font-medium text-muted-foreground">{company}</p>

          <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
            {city && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5">
                <MapPin className="size-3" />
                {city}
              </span>
            )}
            {/* Stated on every card rather than discovered after the click. No
                board in the registry publishes pay, so this is true of all. */}
            <span className="rounded-lg border border-border px-2.5 py-1.5">Salary not stated</span>
          </div>

          <p className="mt-4 text-sm leading-6 text-muted-foreground">{reason}</p>

          {breakdown && (
            <>
              {/* data-breakdown is how BreakdownEngaged tells this disclosure
                  from the evidence one below it — `toggle` carries no other signal. */}
              <details className="group mt-4" data-breakdown="score">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-primary hover:text-accent">
                  <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
                  How this score is built
                </summary>
                <dl className="mt-3 space-y-2 rounded-xl border border-border bg-secondary/40 p-4">
                  {breakdown.components.map((c) => (
                    <div key={c.key} className="grid gap-1 sm:grid-cols-[140px_1fr]">
                      <dt className="text-xs font-semibold text-primary">
                        {c.label}{' '}
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {c.points}/{c.max}
                        </span>
                      </dt>
                      <dd className="text-xs leading-5 text-muted-foreground">{c.note}</dd>
                    </div>
                  ))}
                </dl>
              </details>

              {requirements && requirements.length > 0 && (
                <details className="group mt-2">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-primary hover:text-accent">
                    <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
                    What we read from this posting ({requirements.length})
                  </summary>
                  <div className="mt-3 space-y-3 rounded-xl border border-border bg-secondary/40 p-4">
                    {requirements.map((r, i) => (
                      <div key={i}>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {r.kind}
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
                </details>
              )}
            </>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-6 text-sm">
            <TrackRole roleId={roleId} company={company} title={title} applyUrl={applyUrl} />
            <ReportScore gateResultId={gateResultId} />
          </div>
        </div>

        <FitScore score={score} band={band} strong={strong} components={top} />
      </div>
    </article>
  )
}

function FitScore({
  score, band, strong, components,
}: {
  score: number
  band: string
  strong: boolean
  components: { key: string; label: string; points: number; max: number }[]
}) {
  return (
    <div
      className={`flex min-h-[190px] flex-col items-center justify-center rounded-2xl px-5 py-6 text-center ${
        strong ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'
      }`}
    >
      <div
        className={`flex size-28 items-center justify-center rounded-full border-[7px] ${
          strong ? 'border-accent bg-primary/70' : 'border-muted-foreground/30 bg-card'
        }`}
      >
        <span className="text-4xl font-semibold tabular-nums tracking-[-0.08em]">{score}</span>
      </div>
      <p
        className={`mt-4 text-[10px] font-bold uppercase tracking-[0.18em] ${
          strong ? 'text-accent' : 'text-muted-foreground'
        }`}
      >
        {band}
      </p>
      {components.length > 0 && (
        <div
          className={`mt-4 flex w-full justify-center gap-4 border-t pt-3 text-[10px] ${
            strong ? 'border-primary-foreground/10 text-primary-foreground/65' : 'border-border text-muted-foreground'
          }`}
        >
          {components.map((c) => (
            <span key={c.key}>
              {c.label}{' '}
              <strong className={`tabular-nums ${strong ? 'text-primary-foreground' : 'text-primary'}`}>
                {c.points}/{c.max}
              </strong>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
