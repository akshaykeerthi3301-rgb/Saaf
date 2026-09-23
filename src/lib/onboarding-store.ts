'use client'

import type { ParsedFields } from '@/lib/parse/extract'

/**
 * Parsed résumé fields live in sessionStorage until the candidate confirms.
 *
 * Not the database, deliberately. The upload screen promises "only the fields
 * you confirm are stored", and writing an unconfirmed profile row would quietly
 * contradict it. sessionStorage clears when the tab closes and never leaves the
 * candidate's own machine.
 */
const KEY = 'saaf.onboarding'

export type OnboardingPrefs = {
  extraRoles: string[]
  workMode: 'remote' | 'hybrid' | 'onsite' | 'no_preference'
  targetCities: string[]
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: 'INR' | 'USD' | 'EUR'
  seniority: 'entry' | 'mid' | 'senior' | 'lead' | 'executive' | null
}

export type OnboardingDraft = {
  portals?: string[]
  fields?: ParsedFields
  warnings?: string[]
  /** The current title, only when the index holds postings for it. See suggestedRoleFor(). */
  suggestedRole?: string
  /** How the profile arrived — résumé file, LinkedIn PDF, or typed in. */
  source?: 'resume' | 'linkedin' | 'scratch'
  /** The preference matrix (/start/preferences). */
  prefs?: OnboardingPrefs
}

export function readDraft(): OnboardingDraft {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as OnboardingDraft
  } catch {
    return {}
  }
}

export function writeDraft(patch: OnboardingDraft) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...readDraft(), ...patch }))
  } catch {
    // Private mode or storage disabled — the confirm screen still works, the
    // candidate just types the fields themselves. Never a dead end.
  }
}

export function clearDraft() {
  if (typeof window === 'undefined') return
  try { sessionStorage.removeItem(KEY) } catch {}
}

/**
 * Read the draft during render without a setState-in-effect cascade.
 *
 * useSyncExternalStore is the React-blessed way to read an external mutable
 * store: the server snapshot is the empty draft, so hydration matches, and the
 * client snapshot is whatever sessionStorage holds.
 */
export function subscribeDraft(cb: () => void) {
  window.addEventListener('storage', cb)
  return () => window.removeEventListener('storage', cb)
}

let cachedRaw: string | null = null
let cachedDraft: OnboardingDraft = {}

export function getDraftSnapshot(): OnboardingDraft {
  const raw = (() => { try { return sessionStorage.getItem(KEY) } catch { return null } })()
  // Cached so the snapshot is referentially stable — returning a fresh object
  // every call makes useSyncExternalStore loop.
  if (raw !== cachedRaw) {
    cachedRaw = raw
    try { cachedDraft = raw ? (JSON.parse(raw) as OnboardingDraft) : {} } catch { cachedDraft = {} }
  }
  return cachedDraft
}

const EMPTY: OnboardingDraft = {}
export function getDraftServerSnapshot(): OnboardingDraft { return EMPTY }
