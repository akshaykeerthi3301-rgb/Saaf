'use client'

import { useState } from 'react'
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
      <p className="text-xs text-muted-foreground">Reported. We triage these as defects.</p>
    )
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
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
      This score looks wrong
    </button>
  )
}
