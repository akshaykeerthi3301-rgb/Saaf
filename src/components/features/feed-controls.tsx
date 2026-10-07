'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bookmark, EyeOff, Eye, Search, X } from 'lucide-react'
import { deleteFilter, hideRole, saveFilter } from '@/app/actions/feed-prefs'
import { interpretFeedQuery, isEmptyView, viewToQuery, type FeedView } from '@/lib/feed-query'

/**
 * The feed controls added in Phase 15 (2026-09-25; gaps observed inside
 * Jobright, PROJECT-STATE Stage AG): sentence search, saved filters, hide.
 * Every one of them ends in a plain /today URL — the page stays the single
 * place that filters, so a saved filter or a sentence can only ever produce a
 * view the pills could produce.
 */

/**
 * "PM in Bengaluru, easy apply" → the pills, shown back for editing. No model call.
 *
 * A plain sentence REPLACES what is on screen; "also remote", "only senior level"
 * refine it; "remove remote" takes one filter off (see interpretFeedQuery). The
 * chips under the box are searches built from the candidate's own profile —
 * clicking one fills the box without searching, so it can be edited first.
 */
export function FeedSearch({ initial, current, chips = [] }: { initial: string; current: FeedView; chips?: string[] }) {
  const router = useRouter()
  const [text, setText] = useState(initial)
  return (
    <div className="mb-3">
      <form
        role="search"
        className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 focus-within:border-accent"
        onSubmit={(e) => {
          e.preventDefault()
          const q = viewToQuery(interpretFeedQuery(text, current))
          router.push(`/today${q ? `?${q}` : ''}`)
        }}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Describe the jobs you want"
          placeholder="Describe it — “product manager in Bengaluru, easy apply, posted this week”"
          className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted-foreground"
        />
        <button type="submit" className="bg-brand-gradient shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold">Search</button>
      </form>
      {chips.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Try a search">
          <span className="text-[11px] text-muted-foreground">Try</span>
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setText(c)}
              className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-accent/60 hover:text-primary"
            >
              {c}
            </button>
          ))}
        </div>
      ) : null}
      <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
        A new sentence starts over. Start with “also” or “only” to add to what you have, or “remove remote” to take one filter off.
      </p>
    </div>
  )
}

/** Named views, one click to restore; "Save this view" when a filter is on. */
export function SavedFilters({ saved, current, stored }: { saved: { name: string; query: string }[]; current: FeedView; stored: boolean }) {
  const router = useRouter()
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [note, setNote] = useState<string>()
  const [pending, start] = useTransition()
  const canSave = !isEmptyView(current)

  if (!saved.length && !canSave) return null
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2" aria-label="Saved filters">
      {saved.map((f) => (
        <span key={f.name} className="inline-flex items-center rounded-full border border-border bg-card text-xs">
          <Link href={`/today${f.query ? `?${f.query}` : ''}`} className="inline-flex items-center gap-1.5 py-1.5 pl-3 pr-1 font-semibold text-primary hover:text-accent">
            <Bookmark className="size-3.5 text-accent" aria-hidden="true" /> {f.name}
          </Link>
          <button
            type="button"
            aria-label={`Delete saved filter ${f.name}`}
            className="rounded-full p-1.5 text-muted-foreground hover:text-primary"
            onClick={() => start(async () => {
              const r = await deleteFilter({ name: f.name }).catch(() => ({ ok: false as const, error: 'Check your connection.' }))
              if (!r.ok) setNote(r.error); else router.refresh()
            })}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      {canSave && !naming ? (
        <button type="button" onClick={() => setNaming(true)} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-accent/60 hover:text-primary">
          <Bookmark className="size-3.5" aria-hidden="true" /> Save this view
        </button>
      ) : null}
      {naming ? (
        <form
          className="inline-flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              const r = await saveFilter({ name, view: current }).catch(() => ({ ok: false as const, error: 'Check your connection.' }))
              if (!r.ok) { setNote(r.error); return }
              setNaming(false); setName(''); setNote(undefined); router.refresh()
            })
          }}
        >
          <input
            autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
            aria-label="Name this filter" placeholder="Name it, e.g. “Remote PM”"
            className="w-44 rounded-full border border-input bg-background px-3 py-1.5 text-xs text-primary outline-none focus:border-accent"
          />
          <button type="submit" disabled={pending || !name.trim()} className="bg-brand-gradient rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Save</button>
          <button type="button" onClick={() => setNaming(false)} className="px-1 text-xs text-muted-foreground">Cancel</button>
        </form>
      ) : null}
      {!stored ? <span className="text-[11px] text-muted-foreground">Saving filters needs a database update (0030) that has not been applied yet.</span> : null}
      {note ? <span role="status" className="text-[11px] text-muted-foreground">{note}</span> : null}
    </div>
  )
}

/** Hide (or bring back) one job. Never changes its score — only whether this candidate sees it. */
export function HideRole({ roleId, hidden = false }: { roleId: string; hidden?: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [note, setNote] = useState<string>()
  const Icon = hidden ? Eye : EyeOff
  return (
    <>
      <button
        type="button"
        disabled={pending}
        title={hidden ? 'Show this job in your feed again' : 'Hide this job from your feed and daily email'}
        onClick={(e) => {
          e.stopPropagation()
          start(async () => {
            const r = await hideRole({ roleId, hidden: !hidden }).catch(() => ({ ok: false as const, error: 'Check your connection.' }))
            if (!r.ok) setNote(r.error); else router.refresh()
          })
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-primary disabled:opacity-50"
      >
        <Icon className="size-3.5" aria-hidden="true" /> {hidden ? 'Unhide' : 'Hide'}
      </button>
      {note ? <span role="status" className="basis-full text-[11px] text-muted-foreground">{note}</span> : null}
    </>
  )
}
