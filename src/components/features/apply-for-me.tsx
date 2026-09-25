'use client'

import { useState } from 'react'
import { Bot } from 'lucide-react'
import { askExtension } from '@/lib/extension-client'

/**
 * "Apply for me": queue this job in the Saaf extension, which submits it only
 * when the candidate has switched the feature on and pressed Start there —
 * and only when every required answer is filled (extension/autoapply.js).
 */
export function ApplyForMe({ url, title, company }: { url: string; title: string; company: string }) {
  const [note, setNote] = useState<string>()
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const r = await askExtension<{ ok: boolean; queued: number; enabled: boolean }>({ type: 'saaf:autoapply-add', jobs: [{ url, title, company }] })
          if (!r?.ok) { setNote('Apply for me needs the Saaf browser extension (version 0.5 or later) in this browser.'); return }
          setNote(r.enabled
            ? `Queued (${r.queued} waiting). Press Start in the Saaf extension to apply.`
            : `Queued (${r.queued} waiting). Switch on “Apply for me” in the Saaf extension, then press Start.`)
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-accent/50 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/10"
        title="Saaf fills and submits it for you — only when every required answer is filled, and never past a CAPTCHA"
      >
        <Bot className="size-3.5" aria-hidden="true" /> Apply for me
      </button>
      {note ? <p role="status" className="basis-full text-[11px] text-muted-foreground">{note}</p> : null}
    </>
  )
}
