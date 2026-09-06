/** Onboarding progress. Starts at 10%, never 0 — momentum from screen one. */
export function Progress({ pct }: { pct: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Onboarding progress"
      style={{ height: 2, background: 'var(--color-outline-variant)', marginBottom: 'var(--space-lg)' }}
    >
      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--legacy-ink)' }} />
    </div>
  )
}
