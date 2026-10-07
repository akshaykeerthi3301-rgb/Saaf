'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Combobox, type ComboGroup } from '@/components/ui/combobox'
import { checkRoleTitle, roleCatalogue, type CatalogueDomain, type RoleTitleCheck } from '@/app/actions/role-catalogue'
import { DOMAINS } from '@/lib/taxonomy/roles'
import { suggestRoles } from '@/lib/taxonomy/suggest'

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
  // What the typed title would return (TASK-173). `for` ties the answer to the
  // text it was asked about, so a slow reply for "pm" is never shown under "pmo".
  const [typedCheck, setTypedCheck] = useState<{ for: string; result: RoleTitleCheck | 'checking' }>()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const loadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(loadTimer.current) }, [])

  const load = useCallback(() => {
    if (catalogue || loading) return
    setLoading(true)
    roleCatalogue()
      .then((c) => setCatalogue(c))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [catalogue, loading])

  /** Start the count load shortly after the panel opens, unless typing begins first. */
  const scheduleLoad = useCallback(() => {
    clearTimeout(loadTimer.current)
    loadTimer.current = setTimeout(load, 700)
  }, [load])

  const rank = useCallback((q: string) => suggestRoles(q, DOMAINS.flatMap((d) => d.roles), 8).map((s) => s.role), [])

  const onQuery = useCallback((q: string) => {
    clearTimeout(timer.current)
    const typed = q.trim()
    if (typed.length < 2) { setTypedCheck(undefined); scheduleLoad(); return }
    // Someone is typing: the full count load can wait. Server actions on a page run one
    // at a time, and that load is ~90 queries — measured 36 s cold in development — so
    // started first it would hold the typed check behind it.
    clearTimeout(loadTimer.current)
    setTypedCheck({ for: typed, result: 'checking' })
    timer.current = setTimeout(() => {
      checkRoleTitle(typed)
        .then((result) => setTypedCheck((cur) => (cur && cur.for === typed ? { for: typed, result } : cur)))
        .catch(() => setTypedCheck((cur) => (cur && cur.for === typed ? undefined : cur)))
    }, 350)
  }, [scheduleLoad])

  const checked = typedCheck && typedCheck.result !== 'checking' ? typedCheck.result : undefined
  const customNote =
    typedCheck?.result === 'checking' ? 'checking…'
      : checked?.count === null || checked === undefined ? undefined
        : checked.count === 0 ? 'no live postings'
          : `${checked.count} live ${checked.count === 1 ? 'posting' : 'postings'}`

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


  return (
    <Combobox
      label={label}
      value={value}
      groups={groups}
      placeholder="Choose the role you want"
      provenance={provenance}
      helper={helper}
      onOpen={scheduleLoad}
      onChange={onChange}
      rank={rank}
      onQuery={onQuery}
      customNote={customNote}
      note={
        checked && checked.count === 0 ? (
          <>
            Nothing in the index carries that exact title yet — that is our coverage, not a verdict on the role.
            {checked.suggestions.length ? ' Closest on our list: ' + checked.suggestions.map((s) => `${s.role}${s.count !== null ? ` (${s.count})` : ''}`).join(', ') + '.' : ''}
          </>
        ) : loading ? (
          'Counting what each role returns in the live index…'
        ) : catalogue ? (
          'The number beside each role is how many live postings it returns today.'
        ) : undefined
      }
    />
  )
}
