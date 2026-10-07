'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bookmark, Check, Copy, EyeOff, Eye, Mic, Search, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { deleteFilter, hideRole, saveFilter } from '@/app/actions/feed-prefs'
import { clearSearchHistoryAction, rateSearchAction, recordSearchAction } from '@/app/actions/search-history'
import { describeView, type HistoryEntry } from '@/lib/search-history'
import { listenOnce, speechSupported } from '@/lib/voice-input'
import { interpretFeedQuery, isEmptyView, viewToQuery, type FeedView } from '@/lib/feed-query'

/**
 * The feed controls added in Phase 15 (2026-09-25; gaps observed inside
 * Jobright, PROJECT-STATE Stage AG): sentence search, saved filters, hide.
 * Every one of them ends in a plain /today URL — the page stays the single
 * place that filters, so a saved filter or a sentence can only ever produce a
 * view the pills could produce.
 */

/**
 * The feed's one search box: "Search by title or company", which also understands a
 * sentence ("PM in Bengaluru, easy apply, posted this week"). No model call.
 *
 * A plain sentence REPLACES what is on screen; "also remote", "only senior level"
 * refine it; "remove remote" takes one filter off (see interpretFeedQuery).
 *
 * ⚠️ THE EXAMPLES LIVE IN A DROPDOWN, NOT ON THE PAGE. They were a permanent row of
 * six chips and a paragraph of instructions above the filters — the first thing a
 * candidate met, and the reason the screen read as cluttered (redesign
 * 2026-10-08). They open when the box takes focus: searches built from the
 * candidate's own profile, which fill the box without searching so they can be edited.
 */
export function FeedSearch({
  initial, current, chips = [], history = [],
}: { initial: string; current: FeedView; chips?: string[]; history?: HistoryEntry[] }) {
  const router = useRouter()
  const [text, setText] = useState(initial)
  const [focused, setFocused] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceNote, setVoiceNote] = useState<string>()
  // Read after hydration: the server has no microphone to ask about.
  const [canSpeak, setCanSpeak] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a browser capability can only be read once mounted
    setCanSpeak(speechSupported())
  }, [])
  const stopRef = useRef<(() => void) | null>(null)

  function toggleVoice() {
    if (listening) { stopRef.current?.(); return }
    setVoiceNote(undefined)
    const stop = listenOnce({
      onText: setText, // lands in the box, unsent — the candidate reads and edits it first
      onEnd: () => { setListening(false); stopRef.current = null },
      onError: setVoiceNote,
    })
    if (stop) { stopRef.current = stop; setListening(true) }
  }
  return (
    <div className="relative min-w-0 basis-full sm:flex-1 sm:basis-0" data-tour="search" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false) }}>
      <form
        role="search"
        className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 focus-within:border-accent"
        onSubmit={async (e) => {
          e.preventDefault()
          const next = interpretFeedQuery(text, current)
          const q = viewToQuery(next)
          setFocused(false)
          // Kept before navigating so the next render can show how it was read; a
          // failure here (no history table, no connection) never blocks the search.
          if (text.trim() && !isEmptyView(next)) await recordSearchAction({ text: text.trim(), view: next }).catch(() => null)
          router.push(`/today${q ? `?${q}` : ''}`)
        }}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setFocused(false); (e.target as HTMLInputElement).blur() } }}
          aria-label="Search by title or company, or describe the job you want"
          placeholder="Search by title or company — or describe it"
          className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted-foreground"
        />
        {text ? (
          <button type="button" aria-label="Clear the search box" onClick={() => setText('')} className="rounded p-0.5 text-muted-foreground hover:text-primary">
            <X className="size-3.5" />
          </button>
        ) : null}
        {canSpeak ? (
          <button
            type="button" onClick={toggleVoice} aria-pressed={listening}
            aria-label={listening ? 'Stop listening' : 'Search by voice'}
            title={listening ? 'Listening… tap to stop' : 'Say what you want. Your browser’s speech service hears the audio, not Saaf; the words land here for you to check.'}
            className={`rounded p-0.5 ${listening ? 'animate-pulse text-accent' : 'text-muted-foreground hover:text-primary'}`}
          >
            <Mic className="size-4" />
          </button>
        ) : null}
      </form>
      {voiceNote ? <p role="status" className="absolute inset-x-0 top-full z-30 mt-1.5 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-muted-foreground">{voiceNote}</p> : null}
      {focused ? (
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 rounded-2xl border border-border bg-popover p-3 shadow-lg">
          {chips.length > 0 ? (
            <>
              <p className="px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Try</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setText(c)}
                    className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-accent/60 hover:text-primary"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {history.length > 0 ? (
            <>
              <div className={`${chips.length ? 'mt-3 ' : ''}flex items-center justify-between px-1`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Recent searches</p>
                <button
                  type="button" onMouseDown={(e) => e.preventDefault()}
                  onClick={async () => { await clearSearchHistoryAction().catch(() => null); router.refresh() }}
                  className="text-[10px] font-semibold text-muted-foreground hover:text-primary"
                >Clear</button>
              </div>
              <ul className="mt-1">
                {history.slice(0, 6).map((h) => (
                  <li key={h.id}>
                    <Link
                      href={`/today?${viewToQuery(h.view)}`} onMouseDown={(e) => e.preventDefault()} onClick={() => setFocused(false)}
                      className="block rounded-lg px-2 py-1.5 hover:bg-secondary"
                    >
                      <span className="block truncate text-xs font-medium text-primary">{h.text}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{describeView(h.view).join(' · ')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <p className="mt-2.5 border-t border-border px-1 pt-2.5 text-[11px] leading-4 text-muted-foreground">
            A new sentence starts over. Begin with “also” or “only” to add to what you have, or “remove remote” to take one filter off.
          </p>
        </div>
      ) : null}
    </div>
  )
}

/** Named views, one click to restore; "Save this view" when a filter is on. */
export function SavedFilters({ saved, current, stored, alwaysShow = false }: { saved: { name: string; query: string }[]; current: FeedView; stored: boolean; alwaysShow?: boolean }) {
  const router = useRouter()
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [note, setNote] = useState<string>()
  const [pending, start] = useTransition()
  const canSave = !isEmptyView(current)

  if (!saved.length && !canSave && !alwaysShow) return null
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Saved filters">
      {!saved.length && !canSave ? (
        <p className="text-[11px] leading-4 text-muted-foreground">Set a filter or two, then save the view here to come back to it in one click.</p>
      ) : null}
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

/**
 * "Read as: …" — how Saaf understood the sentence just typed, with a thumb each way
 * (F-206). The rating goes to the search's own history row; it is how the parser's
 * misreadings are found. Copy puts the link that restores this exact view on the
 * clipboard. Shown only while that search is the view on screen.
 */
export function SearchAnswer({ entry }: { entry: HistoryEntry }) {
  const [rating, setRating] = useState(entry.rating)
  const [copied, setCopied] = useState(false)
  const words = describeView(entry.view)

  async function rate(next: 'up' | 'down') {
    const value = rating === next ? null : next
    setRating(value)
    const r = await rateSearchAction({ id: entry.id, rating: value }).catch(() => ({ ok: false }))
    if (!r.ok) setRating(rating)
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/today?${viewToQuery(entry.view)}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* no clipboard permission: nothing to report */ }
  }
  const btn = 'rounded p-1 text-muted-foreground hover:text-primary'

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" data-testid="search-answer">
      <span>
        You said <span className="font-medium text-primary">“{entry.text}”</span> — read as{' '}
        <span className="font-medium text-primary">{words.join(' · ')}</span>
      </span>
      <span className="inline-flex items-center gap-0.5" role="group" aria-label="Was that read right?">
        <button type="button" onClick={() => rate('up')} aria-pressed={rating === 'up'} title="Read right" aria-label="Read right" className={`${btn} ${rating === 'up' ? 'text-score-high' : ''}`}><ThumbsUp className="size-3.5" /></button>
        <button type="button" onClick={() => rate('down')} aria-pressed={rating === 'down'} title="Read wrong" aria-label="Read wrong" className={`${btn} ${rating === 'down' ? 'text-score-mid' : ''}`}><ThumbsDown className="size-3.5" /></button>
        <button type="button" onClick={copy} title="Copy a link to this search" aria-label="Copy a link to this search" className={btn}>{copied ? <Check className="size-3.5 text-score-high" /> : <Copy className="size-3.5" />}</button>
      </span>
    </div>
  )
}
