import { HIGH_PRECISION_MIN } from '@/lib/score-bands'

/**
 * The gradient match ring.
 *
 * Coloured by band, from tokens: high (emerald into the brand indigo) from
 * HIGH_PRECISION_MIN, mid (amber) from 60, low (red) below.
 *
 * ⚠️ GREEN STARTS AT 75, NOT THE BRIEF'S 85, ON PURPOSE. The brief's example
 * was ">85% green, 60–84 yellow". Built that way, an 81 drew an amber ring
 * under a "High-precision match" label — two verdicts on one card. 75 is the
 * product's one definition of high precision (src/lib/score-bands.ts), so the
 * colour and the label now agree everywhere they appear.
 *
 * A server-safe component (no hooks). Gradient ids are per band rather than per
 * instance: every ring of one band draws the identical gradient, so duplicate
 * ids resolve to the same definition.
 */
export type RingBand = 'high' | 'mid' | 'low'

export function ringBand(score: number): RingBand {
  if (score >= HIGH_PRECISION_MIN) return 'high'
  if (score >= 60) return 'mid'
  return 'low'
}

const STOPS: Record<RingBand, [string, string]> = {
  high: ['var(--score-high)', 'var(--brand)'],
  mid: ['var(--score-mid)', 'var(--score-high)'],
  low: ['var(--score-low)', 'var(--score-mid)'],
}

const TEXT: Record<RingBand, string> = {
  high: 'text-score-high',
  mid: 'text-score-mid',
  low: 'text-score-low',
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
  const id = `ring-${band}`

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(score)}%${label ? ` ${label}` : ''}`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: STOPS[band][0] }} />
            <stop offset="100%" style={{ stopColor: STOPS[band][1] }} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-secondary" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          stroke={`url(#${id})`}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - filled)}
        />
      </svg>
      <div className="flex flex-col items-center leading-none">
        <span className={`font-mono font-semibold tabular-nums tracking-[-0.05em] ${TEXT[band]} ${size >= 88 ? 'text-2xl' : size >= 64 ? 'text-lg' : 'text-sm'}`}>
          {Math.round(score)}%
        </span>
        {label ? <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</span> : null}
      </div>
    </div>
  )
}
