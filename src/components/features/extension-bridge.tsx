'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fileFromExtension, getExtensionSync } from '@/app/actions/extension-bridge'

/**
 * Keeps the Saaf browser extension in step with the signed-in app.
 *
 * On load, and each time the tab comes back into view:
 *  1. asks whether the extension is installed (nothing happens if not);
 *  2. collects roles the candidate saved or filled on job sites and files them
 *     on the tracker — Saved, or Applying for a form they filled;
 *  3. pushes the profile, the latest saved résumé and each tracked page's stage
 *     into the extension, so its card on a job site shows the current stage.
 *
 * ⚠️ THE EXTENSION ID IS PUBLIC, NOT A SECRET. It is derived from the `key` in
 * extension/manifest.json, which pins the same ID for the unpacked build and
 * the store build. Anyone can read it from the manifest; the extension checks
 * the sender's origin itself (service-worker.js `isSaaf`).
 */
const EXTENSION_ID = 'idbookligbjgjhnohmgpklloakhoecpd'

type Runtime = {
  sendMessage: (id: string, msg: unknown, cb: (res: unknown) => void) => void
  lastError?: { message?: string }
}
type Queued = { url: string; title: string; company: string; status: 'saved' | 'applying' }

function runtime(): Runtime | null {
  const rt = (globalThis as unknown as { chrome?: { runtime?: Partial<Runtime> } }).chrome?.runtime
  return rt && typeof rt.sendMessage === 'function' ? (rt as Runtime) : null
}

/** One message to the extension; null when it is not installed or does not answer. */
function ask<T>(msg: unknown): Promise<T | null> {
  const rt = runtime()
  if (!rt) return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      rt.sendMessage(EXTENSION_ID, msg, (res) => {
        // Reading lastError is what stops Chrome logging "Unchecked runtime.lastError"
        // on every page for candidates without the extension.
        resolve(rt.lastError ? null : ((res as T) ?? null))
      })
    } catch {
      resolve(null)
    }
  })
}

export function ExtensionBridge() {
  const router = useRouter()
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    let running = false
    async function sync() {
      if (running || document.visibilityState !== 'visible') return
      running = true
      try {
        const hello = await ask<{ ok: boolean }>({ type: 'saaf:hello' })
        if (!hello?.ok) return

        const queued = await ask<{ ok: boolean; items: Queued[] }>({ type: 'saaf:drain' })
        if (queued?.ok && queued.items.length) {
          const res = await fileFromExtension(queued.items)
          if (res.ok && res.handled.length) {
            await ask({ type: 'saaf:ack', urls: res.handled })
            if (res.filed) {
              setNote(`${res.filed} role${res.filed === 1 ? '' : 's'} from the Saaf extension added to your tracker.`)
              router.refresh()
            }
          }
        }

        const data = await getExtensionSync()
        if (data.ok) {
          await ask({ type: 'saaf:sync', profile: data.profile, resumeText: data.resumeText, tracked: data.tracked })
        }
      } finally {
        running = false
      }
    }

    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [router])

  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => setNote(null), 6000)
    return () => clearTimeout(t)
  }, [note])

  if (!note) return null
  return (
    <p role="status" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border border-border bg-card px-4 py-3 text-sm text-primary shadow-lg">
      {note}
    </p>
  )
}
