'use client'

import { useState } from 'react'
import { trackRole } from '@/app/actions/applications'

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
  const [error, setError] = useState<string>()

  if (tracked) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
        Tracked ·{' '}
        <a href="/applications" className="underline underline-offset-4 hover:text-primary">
          your applications
        </a>
      </span>
    )
  }

  if (error) {
    return <span className="text-xs font-semibold text-muted-foreground">{error}</span>
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
      onClick={async () => {
        // Optimistic, then RECONCILED. This used to set tracked=true and drop
        // the result on the floor, so a failing write looked exactly like a
        // successful one — which is how a broken conflict target went unnoticed
        // through an entire release. An optimistic update that cannot be
        // rolled back is not optimistic, it is a lie.
        setTracked(true)
        const res = await trackRole({ roleId, company, title, applyUrl })
        if (!res.ok) {
          setTracked(false)
          setError(res.error)
        }
      }}
    >
      Track this
    </button>
  )
}
