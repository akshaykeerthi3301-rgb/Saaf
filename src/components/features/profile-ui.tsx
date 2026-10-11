'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Sheet, SheetClose, SheetTitle } from '@/components/ui/sheet'

/**
 * The profile screen's small parts, shared by every card and every edit panel — so a card, a chip and a drawer look
 * the same wherever they appear. Colours are tokens only.
 */

export const inputClass =
  'w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-primary outline-none placeholder:text-muted-foreground/70 focus:border-accent focus:ring-2 focus:ring-accent/10'

export function ProfileCard({ title, children, action, className = '', id }: {
  title: ReactNode
  children?: ReactNode
  /** The pencil or plus at the top right. */
  action?: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={`rounded-2xl border border-border bg-card p-6 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

const iconBtn = 'inline-flex size-8 items-center justify-center rounded-lg border border-border bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-primary'

export function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} aria-label={label} className={iconBtn}><Pencil className="size-3.5" /></button>
}
export function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} aria-label={label} className={iconBtn}><Plus className="size-4" /></button>
}
export function DeleteButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className={`${iconBtn} disabled:opacity-50`}><Trash2 className="size-3.5" /></button>
}

export function Chip({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm ${active ? 'border-accent/40 bg-accent/10 text-primary' : 'border-border bg-secondary/60 text-primary'}`}>
      {children}
    </span>
  )
}

/** "—" for an unanswered field, the way the reference shows it, so a gap reads as a gap and not a layout glitch. */
export function Value({ children }: { children?: ReactNode }) {
  return <p className="mt-0.5 break-words text-sm text-primary">{children || <span className="text-muted-foreground">-</span>}</p>
}
export function Label({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

/** A labelled form field. `required` shows the red star the reference uses. */
export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-primary">
        {label}{required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

/**
 * The right-hand edit panel: a title bar, a scrolling body, Cancel and Save at the foot. `onSave` returns an error
 * sentence or null; on success the panel closes and the page re-reads from the server.
 */
export function EditDrawer({ open, onOpenChange, title, icon, children, onSave, saveLabel = 'Save', note }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  icon: ReactNode
  children: ReactNode
  onSave: () => Promise<string | null>
  saveLabel?: string
  note?: ReactNode
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function save() {
    setError(null)
    start(async () => {
      const problem = await onSave().catch(() => 'We could not save that just now. Check your connection and try again.')
      if (problem) { setError(problem); return }
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) setError(null); onOpenChange(o) }} trigger={null} roomy>
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4">
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-secondary text-primary" aria-hidden="true">{icon}</span>
        <SheetTitle className="flex-1 text-lg font-semibold tracking-[-0.02em] text-primary">{title}</SheetTitle>
        <SheetClose aria-label="Close" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-primary"><X className="size-4" /></SheetClose>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {note}
        {children}
      </div>
      <div className="shrink-0 border-t border-border bg-card px-6 py-4">
        {error ? <p role="alert" className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p> : null}
        <div className="grid grid-cols-2 gap-3">
          <SheetClose className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-primary hover:bg-secondary">Cancel</SheetClose>
          <button type="button" onClick={save} disabled={pending} className="bg-brand-gradient inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
            {pending ? <Loader2 className="size-4 animate-spin" /> : null} {saveLabel}
          </button>
        </div>
      </div>
    </Sheet>
  )
}

/** Open/close state for a drawer that lives next to its card. */
export function useDrawer(): [boolean, (o: boolean) => void] {
  return useState(false)
}

/**
 * A list of short texts the person builds up: type and press Enter (or the plus), click a chip's × to drop it. Used for
 * skills, languages, cities, companies — anything that is "a few words, several of them".
 */
export function ChipEditor({ value, onChange, max, placeholder, suggestions = [], label }: {
  value: string[]
  onChange: (v: string[]) => void
  max: number
  placeholder: string
  suggestions?: readonly string[]
  label: string
}) {
  const [text, setText] = useState('')
  const add = (raw: string) => {
    const t = raw.trim()
    if (!t) return
    if (value.some((v) => v.toLowerCase() === t.toLowerCase())) { setText(''); return }
    if (value.length >= max) return
    onChange([...value, t])
    setText('')
  }
  const shown = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 10)
  return (
    <div>
      <div className="flex gap-2">
        <input
          value={text} onChange={(e) => setText(e.target.value)} onBlur={() => add(text)} aria-label={label} placeholder={placeholder} className={inputClass}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(text) } }}
        />
        <button type="button" onClick={() => add(text)} aria-label={`Add to ${label}`} className="rounded-xl border border-border px-3 text-muted-foreground hover:text-primary"><Plus className="size-4" /></button>
      </div>
      {value.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {value.map((v) => (
            <li key={v}>
              <Chip>
                {v}
                <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))} className="text-muted-foreground hover:text-primary"><X className="size-3" /></button>
              </Chip>
            </li>
          ))}
        </ul>
      ) : null}
      {shown.length && value.length < max ? (
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-muted-foreground">Suggestions</p>
          <div className="flex flex-wrap gap-1.5">
            {shown.map((s) => (
              <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-accent hover:text-primary">+ {s}</button>
            ))}
          </div>
        </div>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">{value.length} of {max}</p>
    </div>
  )
}

/** Pick from a fixed list, up to `max` — the preference questions. */
export function PickEditor({ options, value, onChange, max }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void; max: number }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o)
          const full = !on && value.length >= max
          return (
            <button
              key={o} type="button" aria-pressed={on} disabled={full}
              onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-40 ${on ? 'border-accent bg-accent/10 font-semibold text-primary' : 'border-border bg-card text-muted-foreground hover:text-primary'}`}
            >
              {o}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{value.length} of {max} selected</p>
    </div>
  )
}
