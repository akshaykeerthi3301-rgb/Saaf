'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import { reportRefusal } from '@/app/actions/report-refusal'
import { track } from '@/lib/analytics'

/**
 * "This score looks wrong."
 *
 * The other half of success criterion 2, and the reason the report action and
 * the `refusal_reports` table were kept when the withheld section was orphaned.
 * A score that is too HIGH is the more dangerous error — a role the candidate
 * cannot get, presented as a strong fit, is the exact injury this product
 * exists to fix — so this sits on every card rather than only on weak ones.
 *
 * Optimistic: the action is idempotent on (user_id, gate_result_id), so a
 * second tap is not a second report and a failed write costs the candidate
 * nothing they can see.
 */
export function ReportScore({ gateResultId }: { gateResultId: string }) {
  const [reported, setReported] = useState(false)

  if (reported) {
    return (
      <span
        className="flex size-8 items-center justify-center text-accent"
        title="Reported. We triage these as defects."
        aria-label="Reported. We triage these as defects."
      >
        <Flag className="size-4" fill="currentColor" />
      </span>
    )
  }

  return (
    <button
      type="button"
      title="This score looks wrong"
      aria-label="This score looks wrong"
      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary"
      onClick={async () => {
        // Optimistic, then reconciled — same reason as TrackRole. The report
        // table's unique constraint is a real one rather than a partial index,
        // so this path works today; it is wired the same way so it cannot
        // start lying quietly if that ever changes.
        setReported(true)
        track('score_reported', { gate_result_id: gateResultId })
        const res = await reportRefusal({ gateResultId })
        if (!res.ok) setReported(false)
      }}
    >
      <Flag className="size-4" />
    </button>
  )
}
