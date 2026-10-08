'use client'

/**
 * A half-circle gauge, 0 to 10, drawn from tokens; the number and its word sit under the arc. The same one in step 1
 * of "Customize your résumé" (where it scores the saved résumé) and in the result (where it scores the new one), so
 * the two numbers are read on one scale.
 */
export const GAUGE_LABEL = (v: number) => (v >= 8.5 ? 'Strong' : v >= 7 ? 'Good' : v >= 5 ? 'Fair' : 'Low')
const GAUGE_COLOR = (v: number) => (v >= 7 ? 'var(--score-high)' : v >= 5 ? 'var(--score-mid)' : 'var(--score-low)')

export function Gauge({ value, small = false }: { value: number | null; small?: boolean }) {
  const v = value ?? 0
  const R = 52, C = Math.PI * R
  return (
    <div className={`flex shrink-0 flex-col items-center ${small ? 'w-28' : 'w-40'}`} role="img" aria-label={value === null ? 'Not enough text to score' : `${value.toFixed(1)} out of 10, ${GAUGE_LABEL(v)}`}>
      <svg viewBox="0 0 120 70" className="w-full">
        <path d="M 8 62 A 52 52 0 0 1 112 62" fill="none" stroke="var(--secondary)" strokeWidth="10" strokeLinecap="round" />
        {value !== null ? (
          <path d="M 8 62 A 52 52 0 0 1 112 62" fill="none" stroke={GAUGE_COLOR(v)} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(v / 10) * C} ${C}`} />
        ) : null}
      </svg>
      <p className={`-mt-9 font-mono font-bold tabular-nums text-primary ${small ? 'text-2xl' : 'text-3xl'}`}>{value === null ? '—' : value.toFixed(1)}</p>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">{value === null ? 'Too short to score' : GAUGE_LABEL(v)}</p>
    </div>
  )
}
