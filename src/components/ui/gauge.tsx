/**
 * The score gauge — a half-ring.
 *
 * ⚠️ EXTRACTED, NOT WRITTEN. This is `report-rail.tsx`'s private `Gauge`, moved
 * out unchanged. There were already TWO score rings in the codebase drawn to
 * different geometry — this half-ring on the ATS surfaces and the full circle in
 * `ui/fit-ring.tsx` on the job-match surfaces — and `fit-ring.tsx` carries its
 * own header comment about exactly that drift. A third copy is how two becomes
 * three, so the Résumé Studio reuses this one rather than drawing its own.
 *
 * ⚠️ THE ARC CARRIES THE VALUE. HUE NEVER DOES. `docs/DESIGN.md:397` — "never
 * reach for a Tailwind default green/red/amber trio" — and `:212-217`, where
 * the single accent "never carries a match outcome" and a low score "is a
 * correct answer, not a failure". A competitor's red-to-green gauge reads a 3.5
 * as an alarm; ours reads it as a short arc and a sentence. That is the
 * difference the product is arguing for, drawn.
 */
export function Gauge({
  score,
  baseline,
  label,
  caption,
  size = 'md',
}: {
  score: number
  /** When present, renders `{baseline} → {score}` instead of the caption. */
  baseline?: number
  /** Eyebrow above the arc. Omit to draw the arc alone. */
  label?: string
  /** Replaces the default "out of 100". */
  caption?: string
  size?: 'md' | 'lg'
}) {
  const r = 52
  const circumference = Math.PI * r
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference
  const width = size === 'lg' ? 'w-[210px]' : 'w-[150px]'

  return (
    <div className="text-center">
      {label ? (
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
      ) : null}
      <svg
        viewBox="0 0 130 74"
        className={`mx-auto mt-2 ${width}`}
        role="img"
        aria-label={`${score} out of 100`}
      >
        <path
          d="M13 65 A 52 52 0 0 1 117 65"
          fill="none"
          stroke="currentColor"
          strokeOpacity=".12"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M13 65 A 52 52 0 0 1 117 65"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
        <text
          x="65"
          y="60"
          textAnchor="middle"
          className="fill-primary font-mono"
          fontSize={size === 'lg' ? 30 : 26}
          fontWeight="500"
        >
          {score}
        </text>
      </svg>
      {baseline !== undefined && baseline !== score ? (
        <p className="font-mono text-xs tabular-nums text-accent">
          {baseline} → {score}
        </p>
      ) : (
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          {caption ?? 'out of 100'}
        </p>
      )}
    </div>
  )
}
