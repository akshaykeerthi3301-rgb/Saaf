'use client'

import { useState } from 'react'
import { Loader2, Briefcase } from 'lucide-react'
import { resumeFromLinkedIn, wantedInZip, type LinkedInFile } from '@/lib/linkedin-resume'

/**
 * "Start from your LinkedIn data" — no résumé yet? Upload what LinkedIn gives you under
 * Settings → Data privacy → Get a copy of your data (a ZIP of CSVs, or the CSVs). It is
 * unzipped HERE, in the browser, and only the four small files that describe a career are
 * read — the rest of the export (messages, ads, logins) never leaves your machine. The
 * result lands in the paste box as plain text for you to check, add your contact details
 * to and edit before anything is scored (src/lib/linkedin-resume.ts).
 */
export function LinkedInStart({ onText }: { onText: (text: string, summary: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string>()

  async function read(list: FileList) {
    setBusy(true); setNote(undefined)
    try {
      const files: LinkedInFile[] = []
      for (const f of Array.from(list).slice(0, 12)) {
        if (/\.zip$/i.test(f.name)) {
          if (f.size > 600_000_000) { setNote('That ZIP is over 600 MB — export just Profile, Positions, Education and Skills.'); setBusy(false); return }
          const { default: JSZip } = await import('jszip')
          const zip = await JSZip.loadAsync(f)
          for (const entry of Object.values(zip.files)) {
            if (!entry.dir && wantedInZip(entry.name)) files.push({ name: entry.name, text: await entry.async('string') })
          }
        } else if (/\.csv$/i.test(f.name) && f.size < 5_000_000) {
          files.push({ name: f.name, text: await f.text() })
        }
      }
      const r = resumeFromLinkedIn(files)
      if (!r.ok) { setNote(r.reason); return }
      onText(r.text, r.summary)
      setNote(`${r.summary} It is in the box below — add your phone and email, check it, then run the check.`)
    } catch {
      setNote('I could not read that file. Upload the ZIP LinkedIn sent you, or the four CSV files from it.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-left" data-testid="linkedin-start">
      <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Briefcase className="size-4 text-accent" aria-hidden="true" /> No résumé yet? Start from your LinkedIn data</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        On LinkedIn: Settings → Data privacy → Get a copy of your data → choose Profile, Positions, Education and Skills. Upload the ZIP (or those files) here. Only those four files are read, on your own device; nothing else in the export is opened or sent.
      </p>
      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-primary hover:border-accent/60">
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
        {busy ? 'Reading…' : 'Choose the ZIP or CSV files'}
        <input type="file" multiple accept=".zip,.csv,application/zip,text/csv" className="sr-only" disabled={busy} onChange={(e) => { if (e.target.files?.length) void read(e.target.files); e.target.value = '' }} />
      </label>
      {note ? <p role="status" className="mt-2 text-xs leading-5 text-primary">{note}</p> : null}
    </div>
  )
}
