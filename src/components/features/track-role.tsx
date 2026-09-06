'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
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

  // An icon, not a label. It repeated on all 54 cards; the tooltip and the
  // aria-label carry the same words to anyone who needs them.
  if (tracked) {
    return (
      <a
        href="/applications"
        title="Tracked — open your applications"
        aria-label="Tracked. Open your applications"
        className="flex size-8 items-center justify-center rounded-lg text-accent hover:bg-secondary"
      >
        <BookmarkCheck className="size-4" />
      </a>
    )
  }

  if (error) {
    return (
      <span className="flex size-8 items-center justify-center text-muted-foreground" title={error}>
        <Bookmark className="size-4" />
      </span>
    )
  }

  return (
    <button
      type="button"
      title="Track this role"
      aria-label="Track this role"
      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary"
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
      <Bookmark className="size-4" />
    </button>
  )
}
