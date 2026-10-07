'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ComboOption = {
  value: string
  /** Optional right-hand figure — for roles, how many postings it returns. */
  count?: number
}

export type ComboGroup = { label: string; options: ComboOption[] }

type Props = {
  label: string
  value: string
  groups: ComboGroup[]
  placeholder: string
  /** Shown under the field. */
  helper?: string
  /** Marks a value the parser filled in. */
  provenance?: string
  /** Rendered inside the panel above the list — a loading or empty note. */
  note?: React.ReactNode
  /** Called when the panel opens, so a caller can fetch its options lazily. */
  onOpen?: () => void
  onChange: (value: string) => void
  /**
   * Ranks the options for what was typed, best first. Without it the list is
   * filtered by substring. The ranked options keep their counts but lose their
   * groups: the order is the point.
   */
  rank?: (query: string) => string[]
  /** Called with what is typed, so a caller can check it (debounce on its side). */
  onQuery?: (query: string) => void
  /** Shown on the "Use “…”" row — what the caller found out about the typed value. */
  customNote?: React.ReactNode
}

/**
 * A real dropdown: a button that opens a searchable, grouped list.
 *
 * ⚠️ WHAT THIS REPLACES, AND WHY THAT MATTERED. Both taxonomy fields were a
 * text input with a row of chips and a collapsed accordion beneath. There was
 * no <select>, no combobox and no listbox on the page — the only genuine form
 * controls on the confirm screen were a number input and a checkbox. So the
 * fields read as free text, the parser's prefill sat in them looking correct,
 * and nobody opened the accordion. That is how a profile came to hold
 * "Bangalore, India", a string the location taxonomy does not carry, which
 * silently turned off alias and commute-cluster matching and scored the
 * commonest city in the whole index as "another city".
 *
 * The taxonomy was built, wired and offered. It was not USED, because the
 * interface never asked anyone to use it. A picker that has to be discovered
 * is a picker most people will not discover.
 *
 * TYPING SOMETHING OFF-LIST IS STILL ALLOWED, and is offered explicitly as the
 * first option once the search finds nothing. Never turning a candidate away is
 * a locked decision, and a city or role we have not got to yet is our gap, not
 * theirs — what they lose is alias matching, and the caller says so.
 */
export function Combobox({
  label, value, groups, placeholder, helper, provenance, note, onOpen, onChange, rank, onQuery, customNote,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const wrap = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const id = useId()

  // Flat, in display order, so keyboard navigation and the group headings agree
  // on what "the next option" means.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (rank && q) {
      const byValue = new Map(groups.flatMap((g) => g.options).map((o) => [o.value, o] as const))
      const options = rank(q).flatMap((v) => (byValue.has(v) ? [byValue.get(v)!] : []))
      return options.length ? [{ label: 'Closest matches', options }] : []
    }
    return groups
      .map((g) => ({ ...g, options: g.options.filter((o) => !q || o.value.toLowerCase().includes(q)) }))
      .filter((g) => g.options.length > 0)
  }, [groups, query, rank])

  const flat = useMemo(() => filtered.flatMap((g) => g.options.map((o) => o.value)), [filtered])

  // An off-list value the candidate typed. Offered rather than imposed.
  const custom = query.trim()
  const showCustom = custom.length > 1 && !flat.some((v) => v.toLowerCase() === custom.toLowerCase())
  const choices = showCustom ? [custom, ...flat] : flat

  // Focus and outside-click only. onOpen fires from the toggle instead: a
  // caller's fetch sets state, and setState called synchronously from an effect
  // body cascades renders.
  useEffect(() => {
    if (!open) return
    search.current?.focus()
    const onDoc = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function toggle() {
    // ⚠️ onOpen FIRES OUTSIDE THE UPDATER, DELIBERATELY. React runs a functional
    // updater during render, so calling the caller's fetch from inside it sets
    // state on RoleInput while Combobox is rendering — "Cannot update a
    // component while rendering a different component". Reading `open` directly
    // is safe here: this is an event handler, not an effect, so it cannot be
    // batched behind a stale value the user could observe.
    const next = !open
    setOpen(next)
    if (next) onOpen?.()
  }

  function pick(v: string) {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, choices.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (choices[active]) pick(choices[active])
    }
  }

  let index = showCustom ? 1 : 0

  return (
    <div className="mb-6" ref={wrap}>
      <label className="mb-2 block text-sm font-semibold text-primary" htmlFor={id}>
        {label}
        {provenance ? (
          <span className="ml-2 text-xs font-normal text-muted-foreground">{provenance}</span>
        ) : null}
      </label>

      <button
        id={id}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3.5 text-left text-sm outline-none transition-colors',
          'border-input hover:border-foreground/30 focus:border-accent focus:ring-2 focus:ring-accent/10',
          value ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="relative">
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                ref={search}
                value={query}
                onChange={(e) => {
                  // Reset the highlight here rather than in an effect on
                  // `query` — the highlight is a consequence of this event, not
                  // state to be synchronised after the fact.
                  setQuery(e.target.value)
                  setActive(0)
                  onQuery?.(e.target.value)
                }}
                onKeyDown={onKey}
                placeholder="Search"
                className="w-full bg-transparent py-3 text-sm text-primary outline-none placeholder:text-muted-foreground"
              />
            </div>

            {note ? <div className="px-4 py-3 text-xs text-muted-foreground">{note}</div> : null}

            <ul role="listbox" aria-label={label} className="max-h-72 overflow-y-auto py-1">
              {showCustom ? (
                <li>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(0)}
                    onClick={() => pick(custom)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-primary',
                      active === 0 ? 'bg-secondary' : 'hover:bg-secondary/60',
                    )}
                  >
                    <span className="truncate">Use &ldquo;{custom}&rdquo;</span>
                    <span className="shrink-0 text-right text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {customNote ?? 'not on our list'}
                    </span>
                  </button>
                </li>
              ) : null}

              {filtered.map((g) => (
                <li key={g.label}>
                  <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {g.label}
                  </p>
                  <ul>
                    {g.options.map((o) => {
                      const i = index++
                      const selected = o.value === value
                      return (
                        <li key={o.value}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onMouseEnter={() => setActive(i)}
                            onClick={() => pick(o.value)}
                            className={cn(
                              'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-primary',
                              active === i ? 'bg-secondary' : 'hover:bg-secondary/60',
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              {selected ? <Check className="size-3.5 shrink-0 text-accent" strokeWidth={3} /> : null}
                              <span className="truncate">{o.value}</span>
                            </span>
                            {/* The count is what this choice actually returns —
                                the same query the matcher runs. A zero here is
                                a fact the candidate should see BEFORE they
                                commit, not after an empty shortlist. */}
                            {o.count !== undefined && o.count >= 0 ? (
                              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                                {o.count}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}

              {choices.length === 0 ? (
                <li className="px-4 py-3 text-sm text-muted-foreground">Nothing matches &ldquo;{query}&rdquo;.</li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}

      {helper ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p> : null}
    </div>
  )
}
