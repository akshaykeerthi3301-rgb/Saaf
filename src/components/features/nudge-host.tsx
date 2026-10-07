'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  afterDone, afterReplay, afterShown, afterSnooze, chooseNudge, parseNudgeState, type NudgeSpec, type NudgeState,
} from '@/lib/nudges'
import { FeedTour } from '@/components/features/feed-tour'

/**
 * Mounts the popup governor (src/lib/nudges.ts) for the signed-in app and owns the
 * one thing the pure rules cannot: remembering, on this device.
 *
 * ⚠️ NO STORAGE, NO NUDGES. localStorage can be missing, blocked or full. A prompt
 * that cannot be remembered would repeat on every page, so when the state cannot be
 * saved nothing is shown at all.
 *
 * Every nudge the product adds registers in SPECS and renders from `active`; none
 * decides for itself that it may appear.
 */

export const NUDGES: NudgeSpec[] = [{ id: 'tour:feed', priority: 1, paths: /^\/today(\/|$)/, requires: ['search', 'card'] }]

/** How long to wait for the page a nudge points at to finish drawing. */
const READY_POLL_MS = 400
const READY_GIVE_UP_MS = 25_000
const KEY = 'saaf.nudges.v1'
/** Fired to re-evaluate now (after "Show the tour again"). */
export const NUDGE_EVENT = 'saaf:nudges'

function read(): NudgeState | null {
  try { return parseNudgeState(window.localStorage.getItem(KEY)) } catch { return null }
}
function write(s: NudgeState): boolean {
  try { window.localStorage.setItem(KEY, JSON.stringify(s)); return true } catch { return false }
}

/** "Show the tour again" — forgets that it was finished and asks the host to look again. */
export function replayNudge(id: string): boolean {
  const s = read()
  if (!s || !write(afterReplay(s, id))) return false
  window.dispatchEvent(new Event(NUDGE_EVENT))
  return true
}

export function NudgeHost() {
  const path = usePathname()
  const [active, setActive] = useState<string | null>(null)

  const poll = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const stopPolling = () => { clearInterval(poll.current); poll.current = undefined }

  const show = useCallback((pick: NudgeSpec) => {
    const state = read()
    if (!state) { setActive(null); return }
    // Counted as shown only if that can be remembered; otherwise it would come back on the next page.
    if (!write(afterShown(state, pick.id, Date.now()))) { setActive(null); return }
    setActive(pick.id)
  }, [])

  const evaluate = useCallback(() => {
    stopPolling()
    const state = read()
    if (!state) { setActive(null); return }
    const pick = chooseNudge(NUDGES, state, Date.now(), path)
    if (!pick) { setActive((a) => (a && NUDGES.some((n) => n.id === a && n.paths.test(path)) ? a : null)); return }

    // Wait for the page it points at to finish drawing. Nothing is recorded as shown until it is on screen.
    const ready = () => (pick.requires ?? []).every((a) => document.querySelector(`[data-tour="${a}"]`))
    if (ready()) { show(pick); return }
    const started = Date.now()
    poll.current = setInterval(() => {
      if (ready()) { stopPolling(); show(pick) }
      else if (Date.now() - started > READY_GIVE_UP_MS) stopPolling() // never drawn (empty feed): ask again next visit
    }, READY_POLL_MS)
  }, [path, show])

  useEffect(() => {
    // A short delay, then wait for the page itself.
    const t = setTimeout(evaluate, 800)
    window.addEventListener(NUDGE_EVENT, evaluate)
    return () => { clearTimeout(t); stopPolling(); window.removeEventListener(NUDGE_EVENT, evaluate) }
  }, [evaluate])

  const finish = (id: string) => {
    const s = read()
    if (s) write(afterDone(s, id, Date.now()))
    setActive(null)
  }
  const later = (id: string) => {
    const s = read()
    const spec = NUDGES.find((n) => n.id === id)
    if (s && spec) write(afterSnooze(s, spec, Date.now()))
    setActive(null)
  }

  if (active === 'tour:feed') return <FeedTour onDone={() => finish('tour:feed')} onLater={() => later('tour:feed')} />
  return null
}
