'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Layers, Loader2, X } from 'lucide-react'
import { removeSearch, saveSearch, switchSearch } from '@/app/actions/saved-searches'
import { isActive, MAX_SEARCHES, type SavedSearch } from '@/lib/saved-searches'

/**
 * "Searches ▾" — named sets of roles. Picking one rewrites the profile's roles and
 * re-scores the list (a few seconds), so it says so while it works. Saving keeps
 * whatever the profile searches for right now.
 */
export function SavedSearchesMenu({
  searches, current, stored,
}: { searches: SavedSearch[]; current: Pick<SavedSearch, 'roles' | 'keywords'>; stored: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [note, setNote] = useState<string>()
  const [busy, setBusy] = useState<string>()
  const [pending, start] = useTransition()
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const activeName = searches.find((s) => isActive(s, current))?.name
  const run = (label: string, work: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => {
    setNote(undefined); setBusy(label)
    start(async () => {
      const r = await work().catch(() => ({ ok: false as const, error: 'Check your connection.' }))
      setBusy(undefined)
      if (!r.ok) { setNote(r.error); return }
      after?.()
      router.refresh()
    })
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-accent/60 hover:text-primary"
      >
        <Layers className="size-3.5" aria-hidden="true" />
        {activeName ?? 'Searches'}
        <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-30 mt-1.5 w-72 rounded-xl border border-border bg-popover p-2 shadow-lg">
          {!stored ? (
            <p className="p-2 text-xs leading-5 text-muted-foreground">Saved searches need a database update (0037) that has not been applied yet.</p>
          ) : (
            <>
              <p className="px-2 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Your searches</p>
              {searches.length === 0 ? <p className="px-2 pb-2 text-xs leading-5 text-muted-foreground">Save the roles you are searching for now, then keep a second set to switch to.</p> : null}
              <ul>
                {searches.map((s) => (
                  <li key={s.name} className="flex items-center gap-1">
                    <button
                      type="button" role="menuitem" disabled={pending}
                      onClick={() => run(s.name, () => switchSearch({ name: s.name }), () => setOpen(false))}
                      className="flex min-w-0 flex-1 items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-secondary disabled:opacity-60"
                    >
                      {busy === s.name ? <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" /> : <Check className={`mt-0.5 size-3.5 shrink-0 ${s.name === activeName ? 'text-accent' : 'opacity-0'}`} />}
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-primary">{s.name}</span>
                        <span className="block truncate text-muted-foreground">{s.roles.join(' · ')}</span>
                      </span>
                    </button>
                    <button
                      type="button" aria-label={`Delete saved search ${s.name}`} disabled={pending}
                      onClick={() => run(`del-${s.name}`, () => removeSearch({ name: s.name }))}
                      className="rounded-full p-1.5 text-muted-foreground hover:text-primary"
                    ><X className="size-3" /></button>
                  </li>
                ))}
              </ul>
              {busy && !busy.startsWith('del-') && busy !== '__save' ? <p role="status" className="px-2 py-1 text-[11px] text-muted-foreground">Re-scoring your list for this search…</p> : null}
              <div className="mt-1 border-t border-border pt-2">
                {naming ? (
                  <form
                    className="flex items-center gap-1.5 px-1"
                    onSubmit={(e) => { e.preventDefault(); run('__save', () => saveSearch({ name }), () => { setNaming(false); setName('') }) }}
                  >
                    <input
                      autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="Name this search"
                      placeholder="Name it, e.g. “Product roles”"
                      className="min-w-0 flex-1 rounded-full border border-input bg-background px-3 py-1.5 text-xs text-primary outline-none focus:border-accent"
                    />
                    <button type="submit" disabled={pending || !name.trim()} className="bg-brand-gradient rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Save</button>
                  </form>
                ) : (
                  <button
                    type="button" disabled={searches.length >= MAX_SEARCHES} onClick={() => setNaming(true)}
                    className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-accent hover:bg-secondary disabled:text-muted-foreground"
                  >
                    {searches.length >= MAX_SEARCHES ? `You have ${MAX_SEARCHES} — delete one to add another` : `Save current search (${current.roles.slice(0, 2).join(', ')}${current.roles.length > 2 ? '…' : ''})`}
                  </button>
                )}
              </div>
            </>
          )}
          {note ? <p role="status" className="px-2 pt-2 text-[11px] leading-4 text-muted-foreground">{note}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
