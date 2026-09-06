'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { suggestRoles, type RoleSuggestion } from '@/app/actions/suggest-roles'
import { roleCatalogue, type CatalogueDomain } from '@/app/actions/role-catalogue'

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

  // The domain browser. Loaded on first open rather than on mount: it is one
  // count query per role and most candidates type a title they already know.
  const [catalogue, setCatalogue] = useState<CatalogueDomain[]>()
  const [openDomain, setOpenDomain] = useState<string>()
  const [browsing, setBrowsing] = useState(false)

  async function openBrowser() {
    const next = !browsing
    setBrowsing(next)
    if (next && !catalogue) {
      const c = await roleCatalogue()
      setCatalogue(c)
      setOpenDomain(c.find((d) => d.total > 0)?.key ?? c[0]?.key)
    }
  }

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
    <div className="mb-6">
      <Input
        label={label}
        provenance={provenance}
        helper={helper}
        value={value}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />

      {exact ? (
        <p className="-mt-4 mb-3 text-xs leading-5 text-muted-foreground">
          {exact.count.toLocaleString('en-IN')} in today&apos;s index.
        </p>
      ) : null}

      {noneFound ? (
        <p className="-mt-4 mb-3 text-xs leading-5 text-muted-foreground">
          Nothing in today&apos;s index matches that. You can still use it, or try a broader title.
        </p>
      ) : null}

      {shown.length > 0 ? (
        <div className="mb-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            In the index
          </p>
          <div className="flex flex-wrap gap-2">
            {shown.map((s) => (
              <button
                key={s.phrase}
                type="button"
                onClick={() => onChange(s.phrase)}
                className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:border-accent/60 hover:bg-accent/5"
              >
                {s.phrase}
                <span className="ml-1 font-mono tabular-nums text-muted-foreground">
                  · {s.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={openBrowser}
        aria-expanded={browsing}
        className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
      >
        Browse by domain
        <ChevronDown className={`size-3.5 transition-transform ${browsing ? 'rotate-180' : ''}`} />
      </button>

      {browsing ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
          {!catalogue ? (
            <p className="p-4 text-xs text-muted-foreground">Counting the index…</p>
          ) : (
            <div className="grid max-h-80 grid-cols-[minmax(130px,0.8fr)_minmax(0,1.2fr)]">
              <div className="overflow-y-auto border-r border-border bg-secondary/35 p-2">
                {catalogue.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onMouseEnter={() => setOpenDomain(d.key)}
                    onFocus={() => setOpenDomain(d.key)}
                    onClick={() => setOpenDomain(d.key)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                      openDomain === d.key
                        ? 'bg-card text-primary shadow-sm'
                        : 'text-muted-foreground hover:bg-card/70 hover:text-primary'
                    }`}
                  >
                    {d.label}
                    <span className="font-mono tabular-nums text-[10px] text-muted-foreground">
                      {d.total}
                    </span>
                  </button>
                ))}
              </div>

              <div className="overflow-y-auto p-2">
                {(catalogue.find((d) => d.key === openDomain)?.roles ?? []).map(({ role, count }) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => { onChange(role); setBrowsing(false) }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-secondary"
                  >
                    <span className={count > 0 ? 'text-primary' : 'text-muted-foreground'}>{role}</span>
                    {/* A zero is shown, never hidden. It is a fact about our
                        registry coverage, and a candidate is entitled to pick a
                        role we hold nothing for today. -1 means the count query
                        itself failed, which is a different statement. */}
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {count < 0 ? '—' : count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
