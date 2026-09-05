'use client'

import { useState } from 'react'
import { trackRole } from '@/app/actions/applications'
import styles from '@/components/ui/row.module.css'

/**
 * "Track this" on a ranked role.
 *
 * The shortlist answers *which of these deserves my next forty minutes*, and
 * until now it had no answer to what happens in minute forty-one. This is the
 * hand-off from the ranking product to the candidate's own pipeline.
 *
 * Optimistic and idempotent, like the report control: the unique index on
 * (user_id, role_id) means a second tap is not a second row.
 */
export function TrackRole({ roleId, company, title, applyUrl }: {
  roleId: string
  company: string
  title: string
  applyUrl?: string
}) {
  const [tracked, setTracked] = useState(false)

  if (tracked) {
    return (
      <span className={styles.report} style={{ textDecoration: 'none' }}>
        Tracked · <a href="/applications">your applications</a>
      </span>
    )
  }

  return (
    <button
      type="button"
      className={styles.report}
      onClick={async () => {
        setTracked(true)
        await trackRole({ roleId, company, title, applyUrl })
      }}
    >
      Track this
    </button>
  )
}
