import type { ScoreComponent } from '@/match/score'
import { HIGH_PRECISION_MIN } from '@/lib/score-bands'

/**
 * The score, its band, and the two components carrying most of it.
 *
 * ⚠️ EXTRACTED FROM role-card.tsx SO TWO SURFACES CANNOT DRIFT. src/lib/jd-match.ts
 * argues that a candidate who pastes a JD and sees 62, then finds the same role
 * on their shortlist at 62, must be looking at one product — "two numbers for
 * one role would discredit both". The same argument applies one level up: two
 * *renderings* of one number invite the reader to wonder which is the real one.
 * The shortlist and the paste-a-JD tool therefore draw from this file, and a
 * change to the band thresholds moves both at once or neither.
 *
 * Nothing about the visual changed in the move.
 */

/**
 * What the ring calls this role.
 *
 * The band reads the SCORE, and that is safe for a reason. It used to read the
 * bucket, because a role sitting under "Good match, short on experience"
 * announced itself as a STRONG MATCH two lines below the heading saying it was
 * not.
 *
 * ⚠️ WHAT CHANGED IS THE CAP, NOT THE STANDARD. Every experience standing that
 * used to need a contradicting label now holds the score down instead: short
 * caps at 65, far_short at 50, over at 65, and — added 2026-09-07 — an unread
 * bar at 74. `score >= 75` is therefore unreachable for any role we have a
 * reservation about, so the score can carry the band honestly on its own.
 *
 * This matters because the alternative labelled almost every card with what was
 * wrong with it. A candidate opening a list where every row says "Experience
 * out of range" or "Another city" reads a verdict on themselves, which is the
 * one thing this product must never do. The reservation has not been removed —
 * it is on the reason line and inside the breakdown. It is no longer the headline.
 */
export function bandFor(score: number): string {
  // The words the reference product's score panel uses (founder, 2026-10-09: "ditto"): Great, Good, Fair, then ours for the rest.
  if (score >= HIGH_PRECISION_MIN) return 'Great match'
  if (score >= 60) return 'Good match'
  if (score >= 45) return 'Fair match'
  return 'Long shot'
}

/**
 * The two figures under the ring.
 *
 * The design put "Industry Context 9/10" and "Trajectory 8/10" here. Neither
 * component exists — they were never built and the numbers were mock data — so
 * printing them would be the product inventing a measurement, which is the one
 * thing docs/PROJECT-STATE.md forbids outright.
 *
 * The shape is kept and filled with components that ARE real: the two carrying
 * the most weight in this role's actual score, out of the five the scorer
 * computes. Same information architecture, numbers that survive being checked
 * against the breakdown one click below.
 */
export function headlineComponents(components: ScoreComponent[]) {
  return components
    .filter((c) => c.key !== 'cap' && c.max > 0)
    .sort((a, b) => b.max - a.max)
    .slice(0, 2)
}

/**
 * The score panel: a progress ring over the ink ground, as designed.
 *
 * The ring is drawn rather than approximated with a border, so the arc is the
 * score — a reader can see 88 and 41 differ without reading the number. Same
 * reason the number is monospace and tabular: it is a measurement.
 */
export function FitRing({
  score,
  components,
  className,
}: {
  score: number
  /** The full component list. The two that matter are picked here. */
  components: ScoreComponent[]
  className?: string
}) {
  const band = bandFor(score)
  const strong = score >= HIGH_PRECISION_MIN
  const headline = headlineComponents(components)

  const r = 34
  const circumference = 2 * Math.PI * r
  const filled = Math.max(0, Math.min(100, score)) / 100

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl px-4 py-6 text-center ${
        strong ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'
      } ${className ?? ''}`}
    >
      <div className="relative flex size-[92px] items-center justify-center">
        <svg viewBox="0 0 80 80" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
          <circle
            cx="40" cy="40" r={r} fill="none" strokeWidth="6"
            className={strong ? 'stroke-primary-foreground/20' : 'stroke-border'}
          />
          <circle
            cx="40" cy="40" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - filled)}
            className="stroke-accent"
          />
        </svg>
        <span className="font-mono text-2xl font-semibold tabular-nums tracking-[-0.05em]">{score}%</span>
      </div>

      <p
        className={`mt-3 text-[10px] font-bold uppercase tracking-[0.14em] ${
          strong ? 'text-accent' : 'text-muted-foreground'
        }`}
      >
        {band}
      </p>

      {headline.length ? (
        <dl
          className={`mt-4 w-full space-y-1.5 border-t pt-3 text-left text-[11px] ${
            strong ? 'border-primary-foreground/15' : 'border-border'
          }`}
        >
          {headline.map((c) => (
            <div key={c.key} className="flex items-baseline justify-between gap-2">
              <dt className={strong ? 'text-primary-foreground/70' : 'text-muted-foreground'}>{c.label}</dt>
              <dd className="font-mono tabular-nums">
                {c.points}/{c.max}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}
