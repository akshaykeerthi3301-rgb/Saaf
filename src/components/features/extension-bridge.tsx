'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fileFromExtension, getExtensionSync } from '@/app/actions/extension-bridge'
import { askExtension } from '@/lib/extension-client'

/**
 * Keeps the Saaf browser extension in step with the signed-in app.
 *
 * On load, and each time the tab comes back into view:
 *  1. asks whether the extension is installed (nothing happens if not);
 *  2. collects roles the candidate saved or filled on job sites and files them
 *     on the tracker — Saved, Applying for a form they filled, or Applied when
 *     "Apply for me" saw the employer's confirmation;
 *  3. pushes the profile, the latest saved résumé and each tracked page's stage
 *     into the extension, so its card on a job site shows the current stage.
 */

type Queued = { url: string; title: string; company: string; status: 'saved' | 'applying' | 'applied' }
const ask = askExtension

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
        // Remembered on this device so the install nudge never asks someone who already has it.
        try { window.localStorage.setItem('saaf.extension.seen', String(Date.now())) } catch { /* no storage: the nudge stays off too */ }

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
          await ask({ type: 'saaf:sync', profile: data.profile, selfId: data.selfId, resumeText: data.resumeText, tracked: data.tracked })
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
