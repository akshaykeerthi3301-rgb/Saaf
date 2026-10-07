'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'

/**
 * A five-stop tour of the job feed (TASK-185): coach-marks for a first visit.
 *
 * Each stop outlines a real element (`data-tour` anchors) and explains it in one
 * sentence. A stop whose element is not on screen — the detail panel on a phone, a
 * feed with no cards yet — is skipped rather than pointed at nothing. Nothing here
 * writes to the account: it is a guide, and the governor remembers on the device
 * whether it has been seen.
 */

type Stop = { anchor: string; title: string; body: string }

export const FEED_TOUR: Stop[] = [
  { anchor: 'search', title: 'Say what you want', body: 'Type it the way you would say it — “product manager in Pune, posted this week”. “Also remote” adds to it; “remove remote” takes it off.' },
  { anchor: 'filters', title: 'Narrow it down', body: 'More filters: how recent, how many years it asks for, job type, stated pay, employers to leave out. When too few roles are left, we say which filter to take off.' },
  { anchor: 'card', title: 'Every score shows its working', body: 'The percentage is the sum of parts you can read. Open “Insights” on a card to see each part.' },
  { anchor: 'panel', title: 'The detail, checked against you', body: 'Select a job to see whether your experience, level, education and skills line up — each with the words from the posting beside the fact from your profile.' },
  { anchor: 'nav-tracker', title: 'Keep track here', body: 'Save or apply and the role lands on your tracker, so nothing you have applied to is ever a guess.' },
]

const find = (anchor: string) => document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`)

export function FeedTour({ onDone, onLater }: { onDone: () => void; onLater: () => void }) {
  // Only the stops whose element exists right now.
  const stops = useMemo(() => FEED_TOUR.filter((s) => find(s.anchor)), [])
  const [i, setI] = useState(0)
  const stop = stops[i]

  useEffect(() => {
    if (!stop) return
    const el = find(stop.anchor)
    if (!el) return
    el.setAttribute('data-tour-active', 'true')
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
    return () => el.removeAttribute('data-tour-active')
  }, [stop])

  // Nothing to point at (an empty feed, a very small screen): finish quietly rather than show an empty tour.
  useEffect(() => { if (stops.length === 0) onDone() }, [stops.length, onDone])
  if (!stop) return null

  const last = i === stops.length - 1
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Tour, step ${i + 1} of ${stops.length}`}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-lg sm:left-auto sm:right-6"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Quick tour · {i + 1} of {stops.length}</p>
        <button type="button" onClick={onLater} aria-label="Close the tour for now" className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:text-primary">
          <X className="size-4" />
        </button>
      </div>
      <h2 className="mt-1 text-sm font-semibold text-primary">{stop.title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{stop.body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {i > 0 ? (
          <button type="button" onClick={() => setI(i - 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-primary hover:border-accent/60">Back</button>
        ) : null}
        <button
          type="button"
          autoFocus
          onClick={() => (last ? onDone() : setI(i + 1))}
          className="bg-brand-gradient rounded-lg px-3 py-1.5 text-xs font-semibold"
        >
          {last ? 'Done' : 'Next'}
        </button>
        <button type="button" onClick={onLater} className="ml-auto px-1 text-xs text-muted-foreground hover:text-primary">Not now</button>
        <button type="button" onClick={onDone} className="px-1 text-xs text-muted-foreground hover:text-primary">Don’t show again</button>
      </div>
    </div>
  )
}
