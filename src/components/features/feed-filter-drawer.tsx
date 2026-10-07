'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SlidersHorizontal } from 'lucide-react'
import { viewToQuery, type FeedView, type JobType, type Level, type PostedWindow } from '@/lib/feed-query'

/**
 * "More filters" (TASK-155, 2026-10-07): the drawer behind the quick pills.
 *
 * It does not filter anything itself. Submitting builds a FeedView and pushes
 * the same /today URL the pills, a saved filter and the sentence search
 * produce — through viewToQuery, so the URL it writes is the one the tests
 * round-trip. The page stays the one place that filters.
 *
 * Each control says what it can and cannot see, because a filter that hides
 * roles must never look like the market's answer.
 */

const POSTED: { value: PostedWindow | ''; label: string }[] = [
  { value: '', label: 'Any time' },
  { value: '3', label: 'Past 3 days' },
  { value: '7', label: 'Past week' },
  { value: '30', label: 'Past month' },
]
const LEVELS: { value: Level | ''; label: string }[] = [
  { value: '', label: 'Any' },
  { value: 'entry', label: 'Entry — asks up to 2 years' },
  { value: 'mid', label: 'Mid — asks 3 to 5 years' },
  { value: 'senior', label: 'Senior — asks 6 or more' },
]
const TYPES: { value: JobType | ''; label: string }[] = [
  { value: '', label: 'Any' },
  { value: 'fulltime', label: 'Full-time' },
  { value: 'intern', label: 'Internship' },
  { value: 'contract', label: 'Contract' },
  { value: 'parttime', label: 'Part-time' },
]

const fieldClass =
  'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-primary outline-none focus:border-accent'
const hintClass = 'mt-1 block text-[11px] leading-4 text-muted-foreground'

export function FeedFilterDrawer({
  view,
  keep,
  notes,
}: {
  /** The view on screen now. */
  view: FeedView
  /** Params that are not part of a view but must survive a submit — the tab, "within reach", the hidden-jobs view. */
  keep: [string, string][]
  /** What the active filters could not decide, in words. */
  notes: string[]
}) {
  const router = useRouter()
  const [posted, setPosted] = useState<PostedWindow | ''>(view.posted)
  const [level, setLevel] = useState<Level | ''>(view.level)
  const [type, setType] = useState<JobType | ''>(view.type)
  const [pay, setPay] = useState(view.pay ? String(view.pay) : '')
  const [skip, setSkip] = useState(view.skip.split(',').filter(Boolean).join(', '))
  const active = [view.posted, view.level, view.type, view.pay, view.skip].filter(Boolean).length

  const go = (next: FeedView) => {
    const q = new URLSearchParams(viewToQuery(next))
    for (const [k, v] of keep) q.set(k, v)
    router.push(`/today${q.size ? `?${q}` : ''}`)
  }

  return (
    <details open={active > 0} className="mb-3 rounded-2xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-primary">
        <SlidersHorizontal className="size-3.5" aria-hidden="true" />
        More filters{active ? ` · ${active} on` : ''}
      </summary>
      <form
        className="space-y-4 border-t border-border px-4 py-4"
        onSubmit={(e) => {
          e.preventDefault()
          go({ ...view, posted, level, type, pay: Number(pay) || 0, skip })
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-primary">
            Date posted
            <select className={`${fieldClass} mt-1`} value={posted} onChange={(e) => setPosted(e.target.value as PostedWindow | '')}>
              {POSTED.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className={hintClass}>By the employer’s own date. A role whose board gives no date is left out.</span>
          </label>

          <label className="block text-xs font-semibold text-primary">
            Experience asked
            <select className={`${fieldClass} mt-1`} value={level} onChange={(e) => setLevel(e.target.value as Level | '')}>
              {LEVELS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className={hintClass}>From the years the posting states. A role that states none stays in the list.</span>
          </label>

          <label className="block text-xs font-semibold text-primary">
            Job type
            <select className={`${fieldClass} mt-1`} value={type} onChange={(e) => setType(e.target.value as JobType | '')}>
              {TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className={hintClass}>Read from the title. A title with no marker counts as full-time.</span>
          </label>

          <label className="block text-xs font-semibold text-primary">
            Pay at least (₹ lakh a year)
            <input
              className={`${fieldClass} mt-1`}
              inputMode="numeric"
              value={pay}
              onChange={(e) => setPay(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
              placeholder="e.g. 12"
            />
            <span className={hintClass}>Only postings that state pay in rupees can pass — about 1 in 50. The rest are left out.</span>
          </label>
        </div>

        <label className="block text-xs font-semibold text-primary">
          Leave out these employers
          <input
            className={`${fieldClass} mt-1`}
            value={skip}
            onChange={(e) => setSkip(e.target.value)}
            maxLength={410}
            placeholder="Accenture, TCS — separate with commas"
          />
          <span className={hintClass}>Matched by the employer’s name as the posting shows it. “Accenture” also leaves out “Accenture India”.</span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="bg-brand-gradient rounded-xl px-4 py-2 text-xs font-semibold">Apply filters</button>
          <button
            type="button"
            className="text-xs font-semibold text-muted-foreground hover:text-primary"
            onClick={() => {
              setPosted(''); setLevel(''); setType(''); setPay(''); setSkip('')
              go({ ...view, posted: '', level: '', type: '', pay: 0, skip: '' })
            }}
          >
            Clear these
          </button>
        </div>

        {notes.length > 0 ? (
          <ul className="space-y-1 text-[11px] leading-4 text-muted-foreground" aria-label="What these filters could not decide">
            {notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        ) : null}
      </form>
    </details>
  )
}
