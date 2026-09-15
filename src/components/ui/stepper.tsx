/**
 * Where the candidate is in a multi-step flow.
 *
 * ⚠️ EXTRACTED FROM `onboarding-shell.tsx`, which has shipped the only real
 * stepper in this product since Stage E — `role="progressbar"` with proper
 * `aria-valuenow`, and a single `STEPS` array as the source of truth for the
 * flow's length. `docs/PROJECT-STATE.md:240` records why that centralisation
 * happened: "the screens no longer each carry a hard-coded percentage."
 *
 * ⚠️ THE PERCENTAGES ARE THE CALLER'S, NOT A DIVISION OF 100 BY THE STEP COUNT.
 * Onboarding uses [12, 30, 55, 80] because its steps are not equal work, and a
 * bar that jumps in even quarters through uneven stages lies about how much is
 * left. Pass what each stage is actually worth.
 */
export function Stepper({
  step,
  marks,
  label = 'Progress',
  names,
}: {
  /** 1-based. */
  step: number
  /** Percentage complete AT each step. Length defines the step count. */
  marks: readonly number[]
  label?: string
  /** Optional stage names. When given, the current one is shown beside the count. */
  names?: readonly string[]
}) {
  const total = marks.length
  const clamped = Math.max(1, Math.min(total, step))
  const pct = marks[clamped - 1] ?? 0
  const name = names?.[clamped - 1]

  return (
    <div>
      <p className="mb-3 flex items-baseline gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
        <span>
          Step {clamped} of {total}
        </span>
        {/* The stage name sits beside the counter rather than repeating as a
            heading below it — DESIGN.md:404, "don't caption a screen three
            times". */}
        {name ? <span className="font-normal normal-case tracking-normal text-muted-foreground">{name}</span> : null}
      </p>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-1 w-full overflow-hidden rounded-full bg-secondary"
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
