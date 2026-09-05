'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { suggestRoles, type RoleSuggestion } from '@/app/actions/suggest-roles'

type Props = {
  label: string
  value: string
  provenance?: string
  helper?: string
  onChange: (value: string) => void
}

/**
 * The preferred-role field, with suggestions drawn from the live index.
 *
 * A blind text box hid two failures from the candidate until their shortlist
 * came back wrong: an over-broad term ("manager" — 228 of 650 roles) and a term
 * the registry simply doesn't carry ("Founder's Office" — none). Both are now
 * answered before they commit, and the count beside each suggestion is the
 * count they will actually get, because it comes from the same query the
 * matcher runs.
 *
 * A zero-result term is never blocked. Never turning a candidate away is a
 * locked decision — so it is reported plainly, with real alternatives offered
 * alongside, and they may still proceed with what they typed.
 */
export function RoleInput({ label, value, provenance, helper, onChange }: Props) {
  const [suggestions, setSuggestions] = useState<RoleSuggestion[]>([])
  const [checked, setChecked] = useState<string>()
  const [busy, setBusy] = useState(false)
  const seq = useRef(0)

  const term = value.trim()

  useEffect(() => {
    if (term.length < 2) return

    const mine = ++seq.current
    const t = setTimeout(async () => {
      setBusy(true)
      try {
        const next = await suggestRoles(term)
        // Out-of-order responses must not overwrite a newer query's results.
        if (mine !== seq.current) return
        setSuggestions(next)
        setChecked(term)
      } catch {
        if (mine === seq.current) setSuggestions([])
      } finally {
        if (mine === seq.current) setBusy(false)
      }
    }, 300)

    return () => clearTimeout(t)
  }, [term])

  // Derived, not stored: results only ever render against the term they were
  // fetched for, so a stale list can't sit under a half-typed replacement.
  const shown = term.length >= 2 && checked === term ? suggestions : []
  const exact = shown.find((s) => s.phrase.toLowerCase() === term.toLowerCase())
  const noneFound = !busy && term.length >= 2 && checked === term && suggestions.length === 0

  return (
    <div style={{ marginBottom: 'var(--space-md)' }}>
      <Input
        label={label}
        provenance={provenance}
        helper={helper}
        value={value}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />

      {exact ? (
        <p style={{
          margin: '0 0 var(--space-xs)', fontSize: 'var(--type-body-sm-size)',
          color: 'var(--color-on-surface-variant)',
        }}>
          {exact.count.toLocaleString('en-IN')} role{exact.count === 1 ? '' : 's'} in today&apos;s index match this.
        </p>
      ) : null}

      {noneFound ? (
        <p style={{
          margin: '0 0 var(--space-xs)', fontSize: 'var(--type-body-sm-size)',
          color: 'var(--color-on-surface-variant)',
        }}>
          Nothing in today&apos;s index matches that. You can still use it — your list
          will fill as the registry grows — or try a broader title.
        </p>
      ) : null}

      {shown.length > 0 ? (
        <div>
          <p style={{
            margin: '0 0 var(--space-xs)', fontSize: 'var(--type-label-sm-size)',
            letterSpacing: 'var(--type-label-sm-ls)', textTransform: 'uppercase',
            color: 'var(--color-on-surface-variant)',
          }}>
            In the index right now
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
            {shown.map((s) => (
              <button
                key={s.phrase}
                type="button"
                onClick={() => onChange(s.phrase)}
                style={{
                  font: 'inherit', fontSize: 'var(--type-body-sm-size)', cursor: 'pointer',
                  background: 'transparent', color: 'var(--color-on-surface)',
                  border: '1px solid var(--color-outline)',
                  borderRadius: 'var(--rounded-none)', padding: '4px 10px',
                }}
              >
                {s.phrase}
                <span style={{ color: 'var(--color-on-surface-variant)' }}> · {s.count}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
