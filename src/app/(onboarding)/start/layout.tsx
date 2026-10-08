import type { ReactNode } from 'react'

/**
 * The first run scores a new candidate against up to 5,000 roles inside the server action that saves their
 * profile. MEASURED 2026-10-09 on the live database: 27.3 s for 4,912 written matches. A platform default shorter
 * than that would cut the first screen a person ever waits on, so the segment asks for the maximum.
 */
export const maxDuration = 300

export default function StartLayout({ children }: { children: ReactNode }) {
  return children
}
