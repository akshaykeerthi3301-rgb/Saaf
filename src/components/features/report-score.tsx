'use client'

import { useState } from 'react'
import { reportRefusal } from '@/app/actions/report-refusal'
import { track } from '@/lib/analytics'
import styles from '@/components/ui/row.module.css'

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
      <p style={{
        fontSize: 'var(--type-body-sm-size)',
        color: 'var(--color-on-surface-variant)',
        margin: 'var(--space-xs) 0 0',
      }}>
        Reported. We triage these as defects.
      </p>
    )
  }

  return (
    <button
      type="button"
      className={styles.report}
      onClick={async () => {
        setReported(true)
        track('score_reported', { gate_result_id: gateResultId })
        await reportRefusal({ gateResultId })
      }}
    >
      This score looks wrong
    </button>
  )
}
