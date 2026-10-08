'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@base-ui/react/dialog'
import { SlidersHorizontal, X } from 'lucide-react'
import { SavedFilters } from '@/components/features/feed-controls'
import { cleanSkip, SKIP_AGENCIES, viewToQuery, type FeedView, type JobType, type Level, type Mode, type PostedWindow } from '@/lib/feed-query'

/**
 * "All filters" — a drawer from the right (redesign 2026-10-08, from the teardown's
 * UI spec §S4), behind one pill in the filter row. It was a card of five fields
 * sitting open in the middle of the page, between the search box and the pills.
 *
 * It does not filter anything itself. Confirming builds a FeedView and pushes the
 * same /today URL the pills, a saved filter and the sentence search produce — through
 * viewToQuery, so the URL it writes is the one the tests round-trip. The page stays
 * the one place that filters.
 *
 * Each control says what it can and cannot see, because a filter that hides roles
 * must never look like the market's answer.
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

const MODE_OPTIONS: { value: Mode | ''; label: string }[] = [
  { value: '', label: 'Any' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

const fieldClass =
  'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-primary outline-none focus:border-accent'
const hintClass = 'mt-1 block text-[11px] leading-4 text-muted-foreground'
const headClass = 'mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground'

export function AllFiltersDrawer({
  view, keep, notes, saved, stored, activeCount, withinReach,
}: {
  /** The view on screen now. */
  view: FeedView
  /** Params that are not part of a view but must survive a confirm — the tab and the hidden-jobs view. */
  keep: [string, string][]
  /** What the active filters could not decide, in words. */
  notes: string[]
  saved: { name: string; query: string }[]
  stored: boolean
  /** How many filters are on, for the badge. */
  activeCount: number
  /** "Within reach" is on (`fit=clears`). */
  withinReach: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [posted, setPosted] = useState<PostedWindow | ''>(view.posted)
  const [level, setLevel] = useState<Level | ''>(view.level)
  const [type, setType] = useState<JobType | ''>(view.type)
  const [mode, setMode] = useState<Mode | ''>(view.mode)
  const [pay, setPay] = useState(view.pay ? String(view.pay) : '')
  const hasAgencyToken = (list: string) => list.split(',').some((n) => n.trim().toLowerCase() === SKIP_AGENCIES)
  const [agencies, setAgencies] = useState(hasAgencyToken(view.skip))
  // The text box shows the employers the candidate typed; the agency switch is its own control.
  const [skip, setSkip] = useState(view.skip.split(',').filter((n) => n && n.trim().toLowerCase() !== SKIP_AGENCIES).join(', '))
  const composedSkip = () => cleanSkip([agencies ? SKIP_AGENCIES : '', skip].filter(Boolean).join(','))
  const [reach, setReach] = useState(withinReach)

  const go = (next: FeedView, reachOn: boolean) => {
    const q = new URLSearchParams(viewToQuery(next))
    for (const [k, v] of keep) q.set(k, v)
    if (reachOn) q.set('fit', 'clears')
    setOpen(false)
    router.push(`/today${q.size ? `?${q}` : ''}`)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          activeCount > 0 ? 'border-accent/60 bg-accent/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-accent/60 hover:text-primary'
        }`}
      >
        <SlidersHorizontal className="size-3.5" aria-hidden="true" />
        All filters
        {activeCount > 0 ? <span className="font-mono tabular-nums">{activeCount}</span> : null}
      </button>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-background/60" />
        <Dialog.Popup
          aria-label="All filters"
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-lg outline-none"
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <Dialog.Title className="text-base font-semibold tracking-[-0.03em] text-primary">All filters</Dialog.Title>
            <Dialog.Close aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
            <form
              id="all-filters-form"
              className="space-y-7"
              onSubmit={(e) => {
                e.preventDefault()
                go({ ...view, posted, level, type, mode, pay: Number(pay) || 0, skip: composedSkip() }, reach)
              }}
            >
              <section>
                <p className={headClass}>Basic job criteria</p>
                <div className="space-y-4">
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
                    <span className={hintClass}>As the employer’s own system states it where it does; otherwise read from the title, where no marker counts as full-time.</span>
                  </label>
                  <label className="block text-xs font-semibold text-primary">
                    Work mode
                    <select className={`${fieldClass} mt-1`} value={mode} onChange={(e) => setMode(e.target.value as Mode | '')}>
                      {MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <span className={hintClass}>Only roles whose employer states it can pass — about 4 in 10 do. The rest are left out, and the count is shown. “Remote only” in the pills reads the location instead.</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-input p-3 text-xs">
                    <input type="checkbox" checked={reach} onChange={(e) => setReach(e.target.checked)} className="mt-0.5 size-4 accent-accent" />
                    <span>
                      <span className="block font-semibold text-primary">Only roles within reach of my experience</span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">Keeps roles whose stated bar is no more than a stretch above your years — and says how many it hides.</span>
                    </span>
                  </label>
                </div>
              </section>

              <section>
                <p className={headClass}>Compensation</p>
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
              </section>

              <section>
                <p className={headClass}>Company</p>
                <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-input p-3 text-xs">
                  <input type="checkbox" checked={agencies} onChange={(e) => setAgencies(e.target.checked)} className="mt-0.5 size-4 accent-accent" />
                  <span>
                    <span className="block font-semibold text-primary">Leave out staffing agencies</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">A short list we keep by hand (Randstad, Adecco, Manpower, TeamLease, Apna and similar) — about 1 role in 85 in today’s index. Direct employers stay.</span>
                  </span>
                </label>
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
              </section>
            </form>

            {notes.length > 0 ? (
              <ul className="space-y-1 text-[11px] leading-4 text-muted-foreground" aria-label="What these filters could not decide">
                {notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            ) : null}

            {/* Outside the form on purpose: "Save this view" has a small form of its own, and forms cannot nest. */}
            <section>
              <p className={headClass}>Saved searches</p>
              <SavedFilters saved={saved} current={view} stored={stored} alwaysShow />
            </section>
          </div>

          <div className="flex items-center gap-3 border-t border-border px-5 py-3.5">
            <button type="submit" form="all-filters-form" className="bg-brand-gradient rounded-xl px-5 py-2 text-sm font-semibold">Confirm</button>
            <button
              type="button"
              className="text-xs font-semibold text-muted-foreground hover:text-primary"
              onClick={() => {
                setPosted(''); setLevel(''); setType(''); setMode(''); setPay(''); setSkip(''); setAgencies(false); setReach(false)
                go({ ...view, posted: '', level: '', type: '', mode: '', pay: 0, skip: '' }, false)
              }}
            >
              Clear these
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
