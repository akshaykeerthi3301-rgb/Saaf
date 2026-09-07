'use client'

import { useState } from 'react'
import { ChevronDown, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { REGIONS, CLUSTER_LABEL, resolveCity } from '@/lib/taxonomy/locations'

type Props = {
  label: string
  value: string
  provenance?: string
  onChange: (value: string) => void
}

/** The cities that carry most of India's hiring. Saves a candidate opening the
 *  full list for the answer they were going to give anyway. */
const QUICK = ['Bengaluru', 'Delhi', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai']

/**
 * Where the candidate wants to work, chosen from a taxonomy of Indian cities.
 *
 * This field decides a real score component, and the free-text version of it
 * was quietly losing roles: matching was a substring test, so "Bengaluru"
 * scored 84 Bangalore-spelled postings as "In another city." Picking from the
 * list resolves to a canonical name that carries its aliases into matching —
 * see src/lib/taxonomy/locations.ts.
 *
 * TYPING SOMETHING NOT ON THE LIST IS STILL ALLOWED. Never turning a candidate
 * away is a locked decision, and a city we have not got to yet is our gap, not
 * theirs. What they lose is alias and cluster matching, and the panel below
 * tells them that rather than letting them find out from a bad shortlist.
 */
export function LocationInput({ label, value, provenance, onChange }: Props) {
  const resolved = resolveCity(value)

  /**
   * The list opens itself when what is in the box is not a city we carry.
   *
   * ⚠️ THIS FIELD WAS BEING BYPASSED, NOT IGNORED. It is prefilled from the
   * résumé parser, which produces "Bangalore, India" — correct-looking, so the
   * candidate accepts it and never opens the picker. That string is not in the
   * taxonomy, so alias and commute-cluster matching were silently off and the
   * commonest location in the index scored as ANOTHER CITY.
   *
   * confirmProfile() now canonicalises on save, so the damage is fixed either
   * way. This is the other half: the candidate should be able to SEE that the
   * value they were handed is not one we recognise, at the moment they can do
   * something about it, rather than being quietly corrected behind them.
   */
  const [open, setOpen] = useState(() => value.trim().length > 0 && !resolveCity(value))
  const typed = value.trim()

  return (
    <div className="mb-6">
      <Input
        label={label}
        provenance={provenance}
        value={value}
        autoComplete="address-level2"
        onChange={(e) => onChange(e.target.value)}
      />

      <div className="-mt-4 mb-3 flex flex-wrap items-center gap-2">
        {QUICK.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              resolved?.name === c
                ? 'border-accent bg-accent/5 text-primary'
                : 'border-border bg-card text-primary hover:border-accent/60 hover:bg-accent/5'
            }`}
          >
            {c}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
        >
          All cities
          <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open ? (
        <div className="mb-3 max-h-72 overflow-y-auto rounded-xl border border-border bg-card p-3">
          {REGIONS.map(({ region, cities }) => (
            <div key={region} className="mb-3 last:mb-0">
              <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {region}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cities.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => { onChange(c.name); setOpen(false) }}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                      resolved?.name === c.name
                        ? 'border-accent bg-accent/5 font-semibold text-primary'
                        : 'border-transparent text-primary hover:bg-secondary'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Show the working: which spellings this choice will actually match. */}
      {resolved ? (
        <p className="mb-3 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
          <MapPin className="mt-0.5 size-3 shrink-0 text-accent" />
          <span>
            {resolved.state}
            {resolved.aliases?.length
              ? ` · also matches postings saying ${resolved.aliases.join(', ')}`
              : ''}
            {resolved.cluster
              ? `. Roles elsewhere in ${CLUSTER_LABEL[resolved.cluster]} count, one tier below an exact match.`
              : ''}
          </span>
        </p>
      ) : typed.length > 1 ? (
        <p className="mb-3 text-xs leading-5 text-muted-foreground">
          Not a city we hold yet — you can still use it, but we can only match that exact
          spelling in a posting.
        </p>
      ) : null}
    </div>
  )
}
