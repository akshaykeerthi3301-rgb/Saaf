'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  afterDone, afterReplay, afterShown, afterSnooze, chooseNudge, parseNudgeState, type NudgeSpec, type NudgeState,
} from '@/lib/nudges'
import { FeedTour } from '@/components/features/feed-tour'
import { InstallAppCard, InstallExtensionCard, SurveyCard } from '@/components/features/install-nudges'
import { answerSurvey } from '@/app/actions/engagement'
import { countVisit, eligible, parseVisits, SURVEYS } from '@/lib/surveys'

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

/** Where the extension can be installed from. Unset until it is published — the nudge then never appears. */
export const EXTENSION_URL = process.env.NEXT_PUBLIC_EXTENSION_URL ?? ''
/** Set by the extension bridge when the extension answered, so the nudge is not shown to someone who has it. */
export const EXTENSION_SEEN_KEY = 'saaf.extension.seen'

/** The browser's own "this site can be installed" event, kept until the nudge uses it. */
let installEvent: (Event & { prompt: () => Promise<void> }) | null = null
const installed = () => window.matchMedia?.('(display-mode: standalone)').matches === true
const extensionSeen = () => { try { return !!window.localStorage.getItem(EXTENSION_SEEN_KEY) } catch { return true } }

const VISITS_KEY = 'saaf.visits.v1'
const visits = () => { try { return parseVisits(window.localStorage.getItem(VISITS_KEY)) } catch { return { n: 0, lastSession: null } } }
/** One more visit per browser session; reloads and page changes inside it do not count. */
function noteVisit() {
  try {
    let session = window.sessionStorage.getItem('saaf.session')
    if (!session) { session = String(Date.now()); window.sessionStorage.setItem('saaf.session', session) }
    window.localStorage.setItem(VISITS_KEY, JSON.stringify(countVisit(visits(), session)))
  } catch { /* no storage: no count, so no survey either */ }
}

export const NUDGES: NudgeSpec[] = [
  { id: 'tour:feed', priority: 1, paths: /^\/today(\/|$)/, requires: ['search', 'card'] },
  // After the tour, never with it (the governor shows one at a time, 12 hours apart). Dormant until an install URL exists.
  { id: 'install:extension', priority: 2, paths: /^\/(today|applications)(\/|$)/, snoozeHours: 72, when: () => !!EXTENSION_URL && !extensionSeen() },
  // Only when the browser itself says the site is installable and it is not already installed.
  // A single question, once, to someone who has been back a few times. Never with another prompt.
  ...SURVEYS.map((sv): NudgeSpec => ({ id: `survey:${sv.id}`, priority: 5, paths: /^\/(today|applications)(\/|$)/, snoozeHours: 96, when: () => eligible(sv, visits()) })),
  { id: 'install:app', priority: 3, paths: /^\/(today|applications)(\/|$)/, snoozeHours: 72, when: () => installEvent !== null && !installed() },
]

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

  useEffect(() => { noteVisit() }, [])

  useEffect(() => {
    // The browser fires this when the site is installable; hold it so the nudge can use it, and look again.
    const onPrompt = (e: Event) => { e.preventDefault(); installEvent = e as typeof installEvent; window.dispatchEvent(new Event(NUDGE_EVENT)) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

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
  const survey = active?.startsWith('survey:') ? SURVEYS.find((sv) => `survey:${sv.id}` === active) : undefined
  if (active && survey) {
    return (
      <SurveyCard
        question={survey.question} options={survey.options} noteLabel={survey.noteLabel}
        onAnswer={async (answer, note) => (await answerSurvey({ surveyId: survey.id, answer, note }).catch(() => ({ ok: false as const }))).ok}
        onLater={() => later(active)} onNever={() => finish(active)}
      />
    )
  }
  if (active === 'install:extension') return <InstallExtensionCard href={EXTENSION_URL} onLater={() => later('install:extension')} onNever={() => finish('install:extension')} />
  if (active === 'install:app') {
    return (
      <InstallAppCard
        onInstall={async () => { const ev = installEvent; installEvent = null; finish('install:app'); try { await ev?.prompt() } catch { /* the browser declined to show it */ } }}
        onLater={() => later('install:app')} onNever={() => finish('install:app')}
      />
    )
  }
  return null
}
