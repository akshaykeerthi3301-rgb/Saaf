'use client'

import { useEffect, useRef, useState } from 'react'
import { RoleRow, type EvidenceItem } from '@/components/ui/row'
import { reportRefusal } from '@/app/actions/report-refusal'
import { track } from '@/lib/analytics'

export type WithheldRow = {
  id: string
  title: string
  company: string
  city?: string
  reason: string
  isNew?: boolean
  requirements?: EvidenceItem[]
  refusedOn?: string | null
  profileCity?: string
}

/**
 * The withheld section — the magic moment.
 *
 * Open by default and never collapsed: if the user has to expand it, the aha
 * does not fire. It also emits `withheld_section_engaged` once per session,
 * which is half of success criterion 2 — engagement alone would look like
 * success even while the gate was quietly wrong, so the report rate is the
 * other half.
 */
export function WithheldSection({ rows, total }: { rows: WithheldRow[]; total: number }) {
  const ref = useRef<HTMLElement>(null)
  const fired = useRef(false)
  const [reported, setReported] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !fired.current) {
            fired.current = true
            track('withheld_section_engaged', { shown: rows.length, total })
            io.disconnect()
          }
        }
      },
      { threshold: 0.25 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rows.length, total])

  async function onReport(id: string) {
    setReported((r) => ({ ...r, [id]: true })) // optimistic; the action is idempotent
    track('refusal_reported', { gate_result_id: id })
    await reportRefusal({ gateResultId: id })
  }

  if (total === 0) return null

  return (
    <section ref={ref} aria-labelledby="withheld-heading">
      <h2
        id="withheld-heading"
        style={{
          fontSize: 'var(--type-label-sm-size)', fontWeight: 600,
          letterSpacing: 'var(--type-label-sm-ls)', textTransform: 'uppercase',
          color: 'var(--color-on-surface-variant)', margin: '32px 0 8px',
        }}
      >
        {total} role{total === 1 ? '' : 's'} withheld today
      </h2>

      {rows.map((r) => (
        <div key={r.id}>
          <RoleRow
            outcome="withheld"
            title={r.title}
            company={r.company}
            city={r.city}
            reason={r.reason}
            onReport={reported[r.id] ? undefined : () => onReport(r.id)}
            isNew={r.isNew}
            requirements={r.requirements}
            refusedOn={r.refusedOn}
            profileCity={r.profileCity}
          />
          {reported[r.id] ? (
            <p style={{ fontSize: 'var(--type-body-sm-size)', color: 'var(--color-on-surface-variant)', margin: '4px 0 0' }}>
              Reported. We triage these as defects.
            </p>
          ) : null}
        </div>
      ))}

      {total > rows.length ? (
        <p style={{ fontSize: 'var(--type-body-sm-size)', color: 'var(--color-on-surface-variant)', marginTop: 16 }}>
          and {total - rows.length} more, all for stated reasons.
        </p>
      ) : null}
    </section>
  )
}
