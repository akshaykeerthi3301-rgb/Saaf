'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Trash2, Upload, Users } from 'lucide-react'
import { addContact, importConnections, removeConnections } from '@/app/actions/network'

/**
 * "Who do I know here?" — from people the candidate already knows, never from a people
 * database Saaf would have to scrape. Three lawful sources, each its own list so that
 * uploading one never wipes another:
 *   LinkedIn's Connections.csv   name, company, position, profile link — NEVER their email
 *   a Google / Outlook contacts export   the candidate's own address book, email kept
 *   a person typed in by hand
 */
type Counts = { linkedin: number; google: number; manual: number; sourced: boolean }
const LABEL = { linkedin: 'from LinkedIn', google: 'from your contacts file', manual: 'added by hand' } as const

export function ConnectionsImport({ counts, stored }: { counts: Counts; stored: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [note, setNote] = useState<string>()
  const [form, setForm] = useState({ name: '', company: '', position: '', email: '' })
  const total = counts.linkedin + counts.google + counts.manual

  function upload(file: File) {
    if (file.size > 4_400_000) { setNote('That file is over 4.4 MB.'); return }
    start(async () => {
      const text = await file.text()
      const r = await importConnections(text).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
      if (!r.ok) { setNote(r.error); return }
      setNote(`Imported ${r.count.toLocaleString('en-IN')} ${r.source === 'linkedin' ? 'connections' : 'contacts'} at ${r.companies.toLocaleString('en-IN')} companies${r.withEmail ? `, ${r.withEmail.toLocaleString('en-IN')} with an email you already hold` : ''}. Job cards now say where you know someone.`)
      router.refresh()
    })
  }

  function add() {
    start(async () => {
      const r = await addContact(form).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
      if (!r.ok) { setNote(r.error); return }
      setForm({ name: '', company: '', position: '', email: '' })
      setNote('Added.')
      router.refresh()
    })
  }

  const input = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-primary outline-none focus:border-accent'

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-primary"><Users className="size-4 text-accent" /> Who you know at each company</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Upload a contacts file and every job shows who you know there. <b>LinkedIn:</b> Settings → Data privacy → Get a copy of your data → Connections, then upload <code>Connections.csv</code>.
        <b> Google or Outlook:</b> export your contacts as CSV and upload that. Both work, and neither replaces the other.
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        From LinkedIn we keep each person&apos;s name, company, position and profile link — <b>never their email address</b>. From your own contacts file or a person you type in, we keep the email too, so it can sit next to the company. Only you can see any of it. Saaf never looks up or guesses anyone&apos;s address.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="bg-brand-gradient inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold">
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          {total ? 'Upload another file' : 'Upload a contacts file'}
          <input type="file" accept=".csv,text/csv" className="sr-only" disabled={pending} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
        </label>
        {total > 0 ? (
          <button
            type="button" disabled={pending}
            onClick={() => start(async () => {
              const r = await removeConnections().catch(() => ({ ok: false as const, error: 'Check your connection.' }))
              setNote(r.ok ? 'Deleted. Nothing of your contacts is stored now.' : r.error)
              if (r.ok) router.refresh()
            })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
          >
            <Trash2 className="size-3.5" /> Delete everything
          </button>
        ) : null}
      </div>

      {total > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-primary" aria-label="Stored contacts">
          {(['linkedin', 'google', 'manual'] as const).filter((k) => counts[k] > 0).map((k) => (
            <li key={k} className="flex items-center gap-3">
              <span>{counts[k].toLocaleString('en-IN')} {LABEL[k]}</span>
              {counts.sourced ? (
                <button type="button" disabled={pending} className="text-[11px] font-semibold text-muted-foreground hover:text-primary" onClick={() => start(async () => {
                  const r = await removeConnections(k).catch(() => ({ ok: false as const, error: 'Check your connection.' }))
                  setNote(r.ok ? 'Deleted.' : r.error)
                  if (r.ok) router.refresh()
                })}>delete these</button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <form className="mt-5 border-t border-border pt-4" onSubmit={(e) => { e.preventDefault(); add() }}>
        <p className="text-xs font-semibold text-primary">Add someone you know</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input className={input} placeholder="Name" aria-label="Name" value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={input} placeholder="Company" aria-label="Company" value={form.company} maxLength={200} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <input className={input} placeholder="Role (optional)" aria-label="Role" value={form.position} maxLength={200} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <input className={input} placeholder="Email you already have (optional)" aria-label="Email" type="email" value={form.email} maxLength={254} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <button type="submit" disabled={pending || !form.name.trim() || !form.company.trim()} className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-primary hover:border-accent/60 disabled:opacity-50">
          <Plus className="size-3.5" /> Add
        </button>
      </form>

      {!stored ? <p className="mt-3 text-xs text-muted-foreground">This needs a database update (0031) that has not been applied yet.</p> : null}
      {stored && !counts.sourced ? <p className="mt-3 text-xs text-muted-foreground">Contacts files and adding by hand need a database update (0043) that has not been applied yet; the LinkedIn upload works.</p> : null}
      {note ? <p role="status" className="mt-3 text-xs text-primary">{note}</p> : null}
    </section>
  )
}
