'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { track } from '@/lib/analytics'

/**
 * Fires `score_breakdown_opened` the first time a candidate opens the working
 * behind any score, once per session.
 *
 * This is the successor to `withheld_section_engaged`. That event measured
 * whether the candidate read the refusals, which was the product's whole claim
 * until it stopped refusing; this one measures whether they read the arithmetic,
 * which is the claim now. Engagement is half of success criterion 2 — on its own
 * it would look like success while the scores were quietly wrong, so the report
 * rate is the other half.
 *
 * Deliberately ONE listener for the whole list rather than a prop on each card.
 * Making the card a client component would serialise every card's props —
 * including every source quote already present in the HTML — into the payload a
 * second time, and this list is unbounded.
 *
 * Two DOM properties this depends on, both checked in a browser rather than
 * assumed: `toggle` does NOT bubble, so the listener must be registered in the
 * capture phase to see it from an ancestor at all; and `toggle` is queued
 * asynchronously and coalesces, so `t.open` is the state at FIRE time, not at
 * toggle time. The `!t.open` guard is therefore correct for a person clicking
 * the summary, but anything that toggles the same element twice in one task
 * will report only its final state.
 */
export function BreakdownEngaged({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const fired = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onToggle = (e: Event) => {
      const t = e.target
      if (fired.current || !(t instanceof HTMLDetailsElement)) return
      // Only the score breakdown. The evidence list is a different question.
      if (t.dataset.breakdown !== 'score' || !t.open) return
      fired.current = true
      track('score_breakdown_opened')
      el.removeEventListener('toggle', onToggle, true)
    }
    el.addEventListener('toggle', onToggle, true)
    return () => el.removeEventListener('toggle', onToggle, true)
  }, [])

  return <div ref={ref}>{children}</div>
}
