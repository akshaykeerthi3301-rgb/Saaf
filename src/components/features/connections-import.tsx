'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2, Upload, Users } from 'lucide-react'
import { importConnections, removeConnections } from '@/app/actions/network'

/**
 * "Who do I know here?" — from the candidate's OWN LinkedIn export (Jobright
 * shows "5 former colleagues" and insider connections from a people database
 * Saaf will not scrape; this is the same answer from data the candidate owns).
 */
export function ConnectionsImport({ count, stored }: { count: number; stored: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [note, setNote] = useState<string>()

  function upload(file: File) {
    if (file.size > 4_400_000) { setNote('That file is over 4.4 MB.'); return }
    start(async () => {
      const text = await file.text()
      const r = await importConnections(text).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
      if (!r.ok) { setNote(r.error); return }
      setNote(`Imported ${r.count.toLocaleString('en-IN')} connections at ${r.companies.toLocaleString('en-IN')} companies. Job cards now say where you know someone.`)
      router.refresh()
    })
  }

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-primary"><Users className="size-4 text-accent" /> Who you know at each company</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Upload the connections file LinkedIn gives you, and every job shows who you know there. On LinkedIn: <b>Settings → Data privacy → Get a copy of your data → Connections</b>. LinkedIn emails you <code>Connections.csv</code> in a few minutes.
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        We keep each person&apos;s name, company, position and profile link — never their email address — and only you can see them. Uploading again replaces the list; delete it any time.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="bg-brand-gradient inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold">
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          {count ? 'Upload a newer file' : 'Upload Connections.csv'}
          <input type="file" accept=".csv,text/csv" className="sr-only" disabled={pending} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
        </label>
        {count > 0 ? (
          <>
            <span className="text-xs text-primary">{count.toLocaleString('en-IN')} connections stored</span>
            <button
              type="button" disabled={pending}
              onClick={() => start(async () => {
                const r = await removeConnections().catch(() => ({ ok: false as const, error: 'Check your connection.' }))
                setNote(r.ok ? 'Deleted. Nothing of your connections is stored now.' : r.error)
                if (r.ok) router.refresh()
              })}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
            >
              <Trash2 className="size-3.5" /> Delete them
            </button>
          </>
        ) : null}
      </div>
      {!stored ? <p className="mt-3 text-xs text-muted-foreground">This needs a database update (0031) that has not been applied yet.</p> : null}
      {note ? <p role="status" className="mt-3 text-xs text-primary">{note}</p> : null}
    </section>
  )
}
