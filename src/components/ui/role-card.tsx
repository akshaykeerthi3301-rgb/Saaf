import { AlertCircle, ChevronRight, MapPin, Quote } from 'lucide-react'
import { ReportScore } from '@/components/features/report-score'
import { TrackRole } from '@/components/features/track-role'
import { CONFIDENCE_THRESHOLD } from '@/gates/types'
import type { Bucket, ScoreBreakdown } from '@/match/score'

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

/** What the ring calls this role. Keyed by bucket so the card and the heading
 *  above it can never disagree; 'matches' falls through to the score bands. */
const BAND: Partial<Record<Bucket, string>> = {
  experience_short: 'Short on experience',
  experience_over: 'More experience than asked',
  experience_out: 'Experience out of range',
  location_out: 'Another city',
  worth_a_look: 'Worth a look',
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
  bucket: Bucket
}

/**
 * A scored role.
 *
 * Four rows of text, down from nine. What went, and why none of it was a fact:
 * the band tag above the title said what the ring's band already says; the
 * "Salary not stated" chip was true of all 229 roles and is now stated once on
 * the page instead of 54 times on it; the two component readouts under the ring
 * repeated the top of the working; company and city were two rows and two
 * bordered chips and are now one line. "New" and the unread-experience warning
 * became a dot and an icon, both with labels for screen readers.
 *
 * WHAT DID NOT GO: the reason line. A score without its reason is the exact
 * failure this product exists to correct, so it stays on the face of the card
 * at full length even when everything around it is cut.
 *
 * Still a server component. The disclosure is a native <details>, the only
 * client code is the two action buttons, and the breakdown is never behind a
 * request — a candidate can check the arithmetic without a round trip.
 */
export function RoleCard({
  gateResultId, roleId, title, company, city, score, breakdown, reason, applyUrl,
  isNew, requirements, profileCity, bucket,
}: Props) {
  const strong = bucket === 'matches' && score >= 75
  // The band follows the BUCKET, not the score alone. It used to read the score
  // only, so a role sitting under "Good match, short on experience" announced
  // itself as a STRONG MATCH two lines below the heading saying it wasn't —
  // the same rounding-off the buckets exist to stop, one level down.
  const band = BAND[bucket] ?? (score >= 75 ? 'Strong match' : score >= 50 ? 'Worth a look' : 'Weak match')
  const components = breakdown?.components ?? []

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="grid gap-5 sm:grid-cols-[1fr_150px]">
        <div className="flex min-w-0 flex-col">
          <div className="flex min-w-0 items-start gap-2">
            {isNew && (
              <span
                className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                title="First shown in the last 7 days"
                aria-label="New"
              />
            )}
            <div className="min-w-0">
              {applyUrl ? (
                <a
                  href={applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold leading-snug tracking-[-0.03em] text-primary hover:underline sm:text-xl"
                >
                  {title}
                </a>
              ) : (
                <h3 className="text-lg font-semibold leading-snug tracking-[-0.03em] text-primary sm:text-xl">
                  {title}
                </h3>
              )}
              {/* Company and city on one line. They were two rows and two
                  bordered chips; neither fact needs a box around it. */}
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
                {company}
                {city ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <MapPin className="size-3" aria-hidden="true" />
                    {city}
                  </>
                ) : null}
                {breakdown?.confidence === 'low' ? (
                  <AlertCircle
                    className="size-3.5 text-muted-foreground"
                    aria-label="The posting states an experience bar we could not read confidently"
                  />
                ) : null}
              </p>
            </div>
          </div>

          {/* The one line explaining the number. Never removed: a score without
              its reason is the exact failure this product exists to correct. */}
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{reason}</p>

          <div className="mt-auto flex items-center gap-1 pt-4">
            {breakdown && (
              /* ONE disclosure, not two. The score components and the sentences
                 they were read from are the same question — "where did this
                 number come from" — and asking it twice put two more lines of
                 text on every card. Still inline, still no round trip. */
              <details className="group min-w-0 flex-1" data-breakdown="score">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">
                  <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
                  Working
                  {requirements?.length ? (
                    <span className="font-mono tabular-nums">({requirements.length})</span>
                  ) : null}
                </summary>

                <dl className="mt-3 space-y-2 rounded-xl border border-border bg-secondary/40 p-4">
                  {components.map((c) => (
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

                {requirements && requirements.length > 0 && (
                  <div className="mt-2 space-y-3 rounded-xl border border-border bg-secondary/40 p-4">
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
                )}
              </details>
            )}

            <TrackRole roleId={roleId} company={company} title={title} applyUrl={applyUrl} />
            <ReportScore gateResultId={gateResultId} />
          </div>
        </div>

        <FitScore score={score} band={band} strong={strong} />
      </div>
    </article>
  )
}

/**
 * The number and its band, and nothing else.
 *
 * The export put two component readouts under the ring and a second band tag
 * above the title. Both said what the band already says or what the working
 * already shows, so both are gone — four fewer lines of text on every card, no
 * fact removed from the page.
 */
function FitScore({ score, band, strong }: { score: number; band: string; strong: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl px-4 py-5 text-center ${
        strong ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'
      }`}
    >
      <div
        className={`flex size-20 items-center justify-center rounded-full border-[6px] ${
          strong ? 'border-accent bg-primary/70' : 'border-muted-foreground/30 bg-card'
        }`}
      >
        <span className="text-3xl font-semibold tabular-nums tracking-[-0.06em]">{score}</span>
      </div>
      <p
        className={`mt-3 text-[10px] font-bold uppercase tracking-[0.16em] ${
          strong ? 'text-accent' : 'text-muted-foreground'
        }`}
      >
        {band}
      </p>
    </div>
  )
}
