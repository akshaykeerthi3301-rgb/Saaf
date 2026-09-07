'use client'

import { useMemo, useState } from 'react'
import { Combobox, type ComboGroup } from '@/components/ui/combobox'
import { roleCatalogue, type CatalogueDomain } from '@/app/actions/role-catalogue'
import { DOMAINS } from '@/lib/taxonomy/roles'

type Props = {
  label: string
  value: string
  provenance?: string
  helper?: string
  onChange: (value: string) => void
}

/**
 * The preferred role, chosen from a dropdown of the taxonomy with live counts.
 *
 * ⚠️ THIS WAS A TEXT BOX WITH A COLLAPSED "BROWSE BY DOMAIN" ACCORDION. The
 * field is prefilled from the résumé's current title — whatever the person's
 * employer chose to call them, "Associate Consultant II", "Member of Technical
 * Staff" — and a candidate who accepts the prefill gets a shortlist built on a
 * term the index barely carries, having never been shown that a taxonomy
 * existed. A picker that has to be discovered is one most people never find.
 *
 * THE COUNT BESIDE EACH ROLE IS THE COUNT THEY WILL ACTUALLY GET. It comes from
 * the same websearch_to_tsquery the matcher runs, per role, so an over-broad
 * term and a term the registry does not carry are both answered before the
 * candidate commits rather than after an empty shortlist. See role-catalogue.ts.
 *
 * Loaded when the dropdown opens, not on mount: it is one count query per role,
 * and it is cached for an hour because the index only changes once a day.
 * Until it arrives the taxonomy shows without counts, so the list is never
 * empty while the numbers are in flight.
 *
 * A role off the list is still accepted and offered explicitly — never turning
 * a candidate away is a locked decision.
 */
export function RoleInput({ label, value, provenance, helper, onChange }: Props) {
  const [catalogue, setCatalogue] = useState<CatalogueDomain[]>()
  const [loading, setLoading] = useState(false)

  const groups: ComboGroup[] = useMemo(() => {
    if (catalogue) {
      return catalogue
        .filter((d) => d.roles.length > 0)
        .map((d) => ({
          label: d.label,
          options: d.roles.map((r) => ({ value: r.role, count: r.count })),
        }))
    }
    // Before the counts land, the taxonomy itself. Same roles, same order.
    return DOMAINS.map((d) => ({ label: d.label, options: d.roles.map((r) => ({ value: r })) }))
  }, [catalogue])

  function load() {
    if (catalogue || loading) return
    setLoading(true)
    roleCatalogue()
      .then((c) => setCatalogue(c))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  return (
    <Combobox
      label={label}
      value={value}
      groups={groups}
      placeholder="Choose the role you want"
      provenance={provenance}
      helper={helper}
      onOpen={load}
      onChange={onChange}
      note={
        loading
          ? 'Counting what each role returns in the live index…'
          : catalogue
            ? 'The number beside each role is how many live postings it returns today.'
            : undefined
      }
    />
  )
}
