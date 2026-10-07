'use client'

import { createContext, useContext, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { PanelRightOpen } from 'lucide-react'
import { getJobInsight, type JobInsightResult } from '@/app/actions/job-insight'

/**
 * Which job the right-hand panel is showing.
 *
 * ⚠️ THE CARDS STAY SERVER COMPONENTS. Only this wrapper is client code: it
 * takes the server-rendered card as `children` and adds the click, so choosing
 * a job swaps the panel without re-rendering the list or re-running the page's
 * reads. /today measured 4.27 MB of HTML when its cards were rendered in full
 * (see the page); turning each card into client code would put that back.
 *
 * `opened` separates "the panel is showing the first job by default" from "the
 * candidate chose this one" — below xl the panel is a sheet, and it must only
 * open on a choice, never on page load.
 */
type Selection = { roleId: string | null; opened: boolean }

export type InsightState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; result: JobInsightResult }

/**
 * Tracker stages the candidate changed on THIS page, so the card and the panel
 * (two separate buttons for one role) agree the moment either is pressed.
 * Optional: outside a FeedProvider the buttons keep their own state.
 */
const TrackedContext = createContext<{
  stages: Record<string, string>
  set: (roleId: string, stage: string) => void
} | null>(null)

export function useTrackedStage(roleId: string, initial?: string): [string | undefined, (stage: string) => void] {
  const ctx = useContext(TrackedContext)
  const [local, setLocal] = useState(initial)
  if (!ctx) return [local, setLocal]
  return [ctx.stages[roleId] ?? initial, (stage) => ctx.set(roleId, stage)]
}

const FeedContext = createContext<{
  selection: Selection
  current: InsightState
  select: (roleId: string) => void
  close: () => void
  /** Fetch a job's insight again — after a skill correction rescored it. */
  reload: (roleId: string) => void
} | null>(null)

/**
 * Holds the selection AND the fetched analyses, so the desktop panel and the
 * phone sheet are two views of one read — a job opened on either is never
 * fetched twice, and returning to a job already seen is instant.
 */
export function FeedProvider({ initial, openInitially = false, children }: { initial: string | null; /** A deep link (?role=) was followed: open the sheet on a phone too. */ openInitially?: boolean; children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>({ roleId: initial, opened: openInitially && !!initial })
  // Results by role, as state: `current` is DERIVED from it, so the effect
  // below only ever sets state from the fetch's callback, never synchronously.
  const [results, setResults] = useState<Record<string, JobInsightResult>>({})
  const [stages, setStages] = useState<Record<string, string>>({})
  const inFlight = useRef(new Set<string>())

  const id = selection.roleId
  const current: InsightState = !id ? { status: 'idle' } : results[id] ? { status: 'done', result: results[id] } : { status: 'loading' }

  useEffect(() => {
    if (!id || results[id] || inFlight.current.has(id)) return
    inFlight.current.add(id)
    getJobInsight({ roleId: id })
      .catch((): JobInsightResult => ({ ok: false, error: 'Could not load this job — check your connection.' }))
      .then((result) => {
        inFlight.current.delete(id)
        // A failure is shown but not kept, so choosing the job again retries it.
        setResults((r) => ({ ...r, [id]: result }))
        if (!result.ok) setTimeout(() => setResults((r) => { const n = { ...r }; delete n[id]; return n }), 15_000)
      })
  }, [id, results])

  return (
    <FeedContext.Provider
      value={{
        selection,
        current,
        select: (roleId) => setSelection({ roleId, opened: true }),
        close: () => setSelection((s) => ({ ...s, opened: false })),
        // Refetch in place: the old insight stays on screen until the new one
        // lands, so the panel (and any message in it) does not unmount.
        reload: (roleId) => {
          getJobInsight({ roleId })
            .then((result) => { if (result.ok) setResults((r) => ({ ...r, [roleId]: result })) })
            .catch(() => {})
        },
      }}
    >
      <TrackedContext.Provider value={{ stages, set: (id, stage) => setStages((x) => ({ ...x, [id]: stage })) }}>
        {children}
      </TrackedContext.Provider>
    </FeedContext.Provider>
  )
}

export function useFeed() {
  const ctx = useContext(FeedContext)
  if (!ctx) throw new Error('useFeed() outside <FeedProvider>')
  return ctx
}

/**
 * A card that selects its job when clicked anywhere that is not itself a
 * control — a click on Save, Apply or a link does what that control says and
 * nothing else.
 */
export function SelectableCard({ roleId, children }: { roleId: string; children: ReactNode }) {
  const { selection, select } = useFeed()
  const selected = selection.roleId === roleId

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('a, button, summary, details, input, select, textarea, [role="dialog"]')) return
    select(roleId)
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(roleId) }
  }

  return (
    <div
      onClick={onClick}
      onKeyDown={onKey}
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      aria-label="Show this job's match analysis"
      className={`glow-hover cursor-pointer rounded-2xl border outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected ? 'glow-selected border-transparent' : 'border-border'
      }`}
    >
      {children}
    </div>
  )
}

export function ViewMatchButton({ roleId }: { roleId: string }) {
  const { select } = useFeed()
  return (
    <button
      type="button"
      onClick={() => select(roleId)}
      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-primary hover:border-accent/60"
    >
      <PanelRightOpen className="size-3.5" />
      View detailed match
    </button>
  )
}
