import { getLatestAudit } from '@/lib/services/audit'
import { istDay } from '@/lib/day'

/**
 * Above-the-fold proof, first-party.
 *
 * This replaces the canonical logo bar. Saaf has no customers to show, and the
 * reference playbook's own rule is "either show the logos or remove the
 * section" — so instead of borrowing credibility it publishes its own figures.
 *
 * Never renders zeros. If no run has completed it renders nothing at all —
 * a zero would read as a result rather than as missing data.
 *
 * The query lives in @/lib/services/audit. This component builds no database
 * client of its own: it was the only component in the codebase that did, and
 * the same question was being asked here, on /audit and in the JSON endpoint
 * with three subtly different column lists.
 */
export async function AuditStrip() {
  const audit = await getLatestAudit()

  if (!audit || audit.rolesIndexed === 0) return <div className="h-11" />

  const fmt = (n: number) => n.toLocaleString('en-IN')
  // IST, not UTC — this strip is on the public landing page and called its
  // own freshest figures stale for 21.5 hours out of every 24.
  const today = istDay()
  const when = audit.day === today ? 'today' : `on ${audit.day}`

  return (
    <div className="mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl border border-border bg-card px-6 py-4 text-center">
      <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
      <p className="font-mono text-sm tabular-nums text-muted-foreground">
        <strong className="font-semibold text-foreground">{fmt(audit.rolesIndexed)}</strong>{' '}
        roles indexed {when} &middot;{' '}
        <strong className="font-semibold text-foreground">{fmt(audit.boardsActive)}</strong>{' '}
        company boards &middot; every score shows its working
      </p>
    </div>
  )
}
