'use client'

import { X } from 'lucide-react'
import { RoleInput } from '@/components/features/role-input'

/**
 * Roles the candidate will ALSO consider, beyond their primary one.
 *
 * ⚠️ IT IS A LIST OF EXTRAS, NOT A REPLACEMENT FOR THE PRIMARY PICKER, and that
 * shape is deliberate. `preferred_role` (singular) is still written and still
 * read — migrations here are applied by hand, so a build can be live against a
 * database without migration 0022. Keeping one required primary means the
 * profile is always valid, and the extras are additive on top.
 *
 * It reuses RoleInput rather than building a multi-select combobox: RoleInput
 * already shows the LIVE COUNT of postings behind each option, which is the
 * single most useful thing on this screen. A candidate adding a second role
 * sees "HR Business Partner (15)" next to "Product Manager (436)" and learns
 * something true about our coverage before they rely on it.
 *
 * Capped at four extras. Past that the shortlist stops being a shortlist, and
 * every added role dilutes what the ranking means.
 */
const MAX_EXTRA = 4

export function ExtraRolesField({
  roles,
  onChange,
}: {
  /** Extras only — the primary role is held separately. */
  roles: string[]
  onChange: (next: string[]) => void
}) {
  const add = (value: string) => {
    const v = value.trim()
    if (!v) return
    if (roles.some((r) => r.toLowerCase() === v.toLowerCase())) return
    if (roles.length >= MAX_EXTRA) return
    onChange([...roles, v])
  }

  return (
    <div>
      <p className="text-sm font-medium text-primary">
        Other roles you would take{' '}
        <span className="font-normal text-muted-foreground">— optional</span>
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Your shortlist becomes one merged list across all of them, best match first.
        A role is scored against whichever of your choices it fits best — adding a
        second never lowers the score of the first.
      </p>

      {roles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {roles.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-medium text-primary"
            >
              {r}
              <button
                type="button"
                onClick={() => onChange(roles.filter((x) => x !== r))}
                aria-label={`Remove ${r}`}
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {roles.length < MAX_EXTRA ? (
        <div className="mt-3">
          <RoleInput
            label="Add another role"
            value=""
            onChange={add}
            helper="Pick from the list or type your own. The number beside each is how many postings we hold for it today."
          />
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          That is {MAX_EXTRA} extra roles — enough. Past this the shortlist stops being short.
        </p>
      )}
    </div>
  )
}
