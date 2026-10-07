'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown } from 'lucide-react'

/**
 * A filter pill that opens a short list — "Posted ▾", "Experience ▾", "Sort ▾".
 *
 * Every option is a plain link to the /today URL it produces, so a chosen filter
 * is still its own shareable address and the page stays the one place that
 * filters; this component only opens and closes. (Redesign 2026-10-08, from the
 * teardown's UI spec §S3: one row of pills, each a dropdown, instead of the stack
 * of control bars the feed had grown.)
 */
export type PillOption = { label: string; href: string; selected: boolean }

export function PillMenu({
  label, active = false, options, align = 'left',
}: {
  /** What the pill says: the name, or the chosen value once something is chosen. */
  label: string
  /** Something other than "any" is chosen — the pill takes the filled style. */
  active?: boolean
  options: PillOption[]
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          active ? 'border-accent/60 bg-accent/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-accent/60 hover:text-primary'
        }`}
      >
        {label}
        <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open ? (
        <ul
          role="menu"
          className={`absolute z-30 mt-1.5 min-w-44 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {options.map((o) => (
            <li key={o.label} role="none">
              <Link
                role="menuitemradio"
                aria-checked={o.selected}
                href={o.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs text-primary hover:bg-secondary"
              >
                <span className={o.selected ? 'font-semibold' : ''}>{o.label}</span>
                {o.selected ? <Check className="size-3.5 text-accent" aria-hidden="true" /> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
