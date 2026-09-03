'use client'

import { useSyncExternalStore } from 'react'
import { subscribeDraft, getDraftSnapshot, getDraftServerSnapshot, type OnboardingDraft } from './onboarding-store'

/** The onboarding draft, read during render rather than in an effect. */
export function useDraft(): OnboardingDraft {
  return useSyncExternalStore(subscribeDraft, getDraftSnapshot, getDraftServerSnapshot)
}
