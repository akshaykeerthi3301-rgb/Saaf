import { HIGH_PRECISION_MIN } from '@/lib/score-bands'

/**
 * The match ring.
 *
 * ONE FLAT COLOUR PER BAND, from tokens. Until 2026-11-10 each ring was a
 * gradient that ran INTO its neighbour's colour (amber into green, red into
 * amber), which blurred the one distinction the bands exist to make. The bands
 * are now teal-green / ochre / slate and are measured to stay apart with the
 * red–green axis removed (src/app/__tests__/theme-contrast.test.ts).
 *
 * COLOUR IS THE THIRD CUE, NOT THE ONLY ONE. The arc's length is the score,
 * the number is printed in ink at full contrast, and every surface that shows
 * a ring prints the band word beside it. A low score is slate, never the error
 * red: it describes the role's fit, and is not a failure.
 *
 * ⚠️ GREEN STARTS AT 75, NOT 85, ON PURPOSE. Built at 85, an 81 drew an amber
 * ring under a "High-precision match" label — two verdicts on one card. 75 is
 * the product's one definition of high precision (src/lib/score-bands.ts).
 *
 * A server-safe component (no hooks).
 */
export type RingBand = 'high' | 'mid' | 'low'

export function ringBand(score: number): RingBand {
  if (score >= HIGH_PRECISION_MIN) return 'high'
  if (score >= 60) return 'mid'
  return 'low'
}

const STROKE: Record<RingBand, string> = {
  high: 'stroke-score-high',
  mid: 'stroke-score-mid',
  low: 'stroke-score-low',
}

export function ScoreRing({
  score,
  size = 72,
  stroke = 6,
  label,
}: {
  score: number
  size?: number
  stroke?: number
  /** A word under the number, e.g. "match". Omitted on the smallest rings. */
  label?: string
}) {
  const band = ringBand(score)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const filled = Math.max(0, Math.min(100, score)) / 100

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(score)}%${label ? ` ${label}` : ''}`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-secondary" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          className={STROKE[band]}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - filled)}
        />
      </svg>
      <div className="flex flex-col items-center leading-none">
        <span className={`font-mono font-semibold tabular-nums tracking-[-0.05em] text-foreground ${size >= 88 ? 'text-2xl' : size >= 64 ? 'text-lg' : 'text-sm'}`}>
          {Math.round(score)}%
        </span>
        {label ? <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</span> : null}
      </div>
    </div>
  )
}
