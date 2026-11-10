'use client'

import { useSyncExternalStore } from 'react'

/**
 * Auto / Light / Dark.
 *
 * Auto follows the device. The choice lives in localStorage under `saaf.theme`
 * (the storage prefix kept from before the rename) and is applied before first
 * paint by the inline script in src/app/layout.tsx — this component only
 * changes it. A candidate reading in daylight and again in bed at 11pm is the
 * same person on the same phone; both palettes are measured to the same
 * contrast floor (src/app/__tests__/theme-contrast.test.ts).
 */
const KEY = 'saaf.theme'
const OPTIONS = ['auto', 'light', 'dark'] as const
type Choice = (typeof OPTIONS)[number]

const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
const read = (): Choice => {
  try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'auto' } catch { return 'auto' }
}

function apply(choice: Choice) {
  try { if (choice === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, choice) } catch { /* private mode: the choice lasts for this page */ }
  const dark = choice === 'dark' || (choice === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  listeners.forEach((fn) => fn())
}

export function ThemeToggle() {
  const choice = useSyncExternalStore(subscribe, read, () => 'auto' as Choice)
  return (
    <div role="radiogroup" aria-label="Colour theme" className="mt-3 flex rounded-lg border border-border bg-background p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={choice === o}
          onClick={() => apply(o)}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium capitalize ${choice === o ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-primary'}`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}
