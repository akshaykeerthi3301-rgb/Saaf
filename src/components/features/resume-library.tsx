'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNowStrict } from 'date-fns'
import { FileText, Loader2, MoreHorizontal, Plus, Star, Upload } from 'lucide-react'
import { Modal, ModalClose, ModalTitle } from '@/components/ui/modal'
import { deleteSavedResume, makePrimaryResume } from '@/app/actions/resume-documents'
import { keepResumeFromFile } from '@/lib/keep-resume'
import { MAX_RESUME_BYTES, MAX_RESUME_MB, TOO_LARGE_MESSAGE } from '@/lib/parse/constants'
import { RESUME_SLOTS } from '@/lib/resume-slots'
import type { SavedResume } from '@/lib/services/resume-documents'

/**
 * The résumé library — the reference product's /jobs/resume: how many slots are used, an Add button, and a table of
 * résumés with a Primary badge, the target job title, when each was last changed and created, and a row menu.
 *
 * Adding a résumé happens HERE, in a dialog, and returns here. It used to send the person to the public ATS checker and
 * leave them there (founder, 2026-10-09). The row opens the editor; the menu offers Use as primary, Edit, Export and
 * Delete. Delete is confirmed, awaited and rolled back on failure — an optimistic delete that cannot be rolled back is
 * the worst kind of lie (see track-role.tsx).
 */
const ago = (iso: string) => formatDistanceToNowStrict(new Date(iso), { addSuffix: true })

export function ResumeLibrary({ resumes }: { resumes: SavedResume[] }) {
  const router = useRouter()
  const [rows, setRows] = useState(resumes)
  const [menu, setMenu] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [confirm, setConfirm] = useState<SavedResume | null>(null)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState<string>()
  const [, start] = useTransition()

  // Close the open row menu on any click elsewhere.
  useEffect(() => {
    if (!menu) return
    const off = () => setMenu(null)
    window.addEventListener('click', off)
    return () => window.removeEventListener('click', off)
  }, [menu])

  const primaryReady = rows.every((r) => r.isPrimary !== undefined)

  function makePrimary(id: string) {
    setBusy(id); setError(undefined)
    start(async () => {
      const res = await makePrimaryResume({ id })
      setBusy(undefined)
      if (!res.ok) { setError(res.error); return }
      setRows((r) => r.map((x) => ({ ...x, isPrimary: x.id === id })))
    })
  }

  function remove(r: SavedResume) {
    setConfirm(null); setBusy(r.id); setError(undefined)
    const previous = rows
    setRows((all) => all.filter((x) => x.id !== r.id))
    start(async () => {
      const res = await deleteSavedResume({ id: r.id })
      setBusy(undefined)
      if (!res.ok) { setRows(previous); setError(res.error) }
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-primary" aria-live="polite">
          {rows.length === 0
            ? 'You have no résumés saved yet.'
            : `You have ${rows.length} résumé${rows.length === 1 ? '' : 's'} saved out of ${RESUME_SLOTS} available slots.`}
        </p>
        <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-primary hover:border-accent/60">
          <span className="bg-brand-gradient flex size-5 items-center justify-center rounded-md"><Plus className="size-3.5" /></span>
          Add résumé
        </button>
      </div>

      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}

      {rows.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-secondary text-primary"><FileText className="size-7" /></span>
          <h2 className="mt-5 text-lg font-semibold text-primary">Upload your résumé to get started</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            We keep the text of the résumé you upload (never the file) so you can tailor it to any job, edit it here and export it in Word or PDF.
          </p>
          <button type="button" onClick={() => setAdding(true)} className="bg-brand-gradient mt-6 inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold">
            <Upload className="size-4" /> Upload your résumé
          </button>
        </div>
      ) : (
        <div className="mt-4 overflow-visible rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold text-muted-foreground">
                <th className="px-5 py-3.5">Résumé</th>
                <th className="hidden px-3 py-3.5 md:table-cell">Target job title</th>
                <th className="hidden px-3 py-3.5 sm:table-cell">Last modified</th>
                <th className="hidden px-3 py-3.5 lg:table-cell">Created</th>
                <th className="w-12 px-3 py-3.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/resume/edit/${r.id}`)}
                  className="cursor-pointer border-b border-border last:border-b-0 hover:bg-secondary/40"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary">
                        {r.label.trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <a href={`/resume/edit/${r.id}`} onClick={(e) => e.stopPropagation()} className="truncate font-semibold text-primary hover:underline">{r.label}</a>
                          {r.isPrimary ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-score-high/15 px-2 py-0.5 text-[11px] font-semibold text-score-high">
                              <Star className="size-3" aria-hidden="true" /> Primary
                            </span>
                          ) : null}
                          {r.score !== null ? (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground" title="ATS score when last saved">
                              ATS {(r.score / 10).toFixed(1)}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-3 py-4 text-muted-foreground md:table-cell">{r.targetRole ?? '—'}</td>
                  <td className="hidden px-3 py-4 text-muted-foreground sm:table-cell">{ago(r.updatedAt)}</td>
                  <td className="hidden px-3 py-4 text-muted-foreground lg:table-cell">{ago(r.createdAt)}</td>
                  <td className="relative px-3 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      aria-label={`Actions for ${r.label}`}
                      aria-haspopup="menu"
                      aria-expanded={menu === r.id}
                      onClick={(e) => { e.stopPropagation(); setMenu(menu === r.id ? null : r.id) }}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                    >
                      {busy === r.id ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                    </button>
                    {menu === r.id ? (
                      <div role="menu" className="absolute right-3 top-12 z-20 w-48 overflow-hidden rounded-xl border border-border bg-card py-1 text-left shadow-lg">
                        {primaryReady && !r.isPrimary ? (
                          <button role="menuitem" type="button" onClick={() => { setMenu(null); makePrimary(r.id) }} className="block w-full px-4 py-2.5 text-left text-sm text-primary hover:bg-secondary">Use as primary</button>
                        ) : null}
                        <button role="menuitem" type="button" onClick={() => router.push(`/resume/edit/${r.id}`)} className="block w-full px-4 py-2.5 text-left text-sm text-primary hover:bg-secondary">Edit résumé</button>
                        <button role="menuitem" type="button" onClick={() => router.push(`/resume/edit/${r.id}?export=1`)} className="block w-full px-4 py-2.5 text-left text-sm text-primary hover:bg-secondary">Export</button>
                        <button role="menuitem" type="button" onClick={() => { setMenu(null); setConfirm(r) }} className="block w-full px-4 py-2.5 text-left text-sm text-destructive hover:bg-secondary">Delete</button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Your primary résumé is the one &ldquo;Customize your résumé&rdquo; opens first and the browser extension fills applications from.
        Saving past {RESUME_SLOTS} replaces the oldest — never your primary.
      </p>

      <AddResumeModal
        open={adding}
        onOpenChange={setAdding}
        first={rows.length === 0}
        onSaved={(saved, primary) => {
          setRows((all) => [{ ...saved, isPrimary: primary || saved.isPrimary }, ...all.filter((x) => x.id !== saved.id).map((x) => (primary ? { ...x, isPrimary: false } : x))])
          setAdding(false)
          router.refresh()
        }}
      />

      <Modal open={confirm !== null} onOpenChange={(o) => { if (!o) setConfirm(null) }}>
        <div className="p-6">
          <ModalTitle className="text-lg font-semibold text-primary">Delete this résumé?</ModalTitle>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            &ldquo;{confirm?.label}&rdquo; will be removed from your account. This cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <ModalClose className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-primary hover:bg-secondary">Cancel</ModalClose>
            <button type="button" onClick={() => confirm && remove(confirm)} className="rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/** Drop or choose a file; it is read, its text kept in the account, and the person stays on this page. */
function AddResumeModal({ open, onOpenChange, first, onSaved }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** The first résumé is the primary one; later ones are not, unless the person says so. */
  first: boolean
  onSaved: (saved: SavedResume, primary: boolean) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [drag, setDrag] = useState(false)

  async function take(file: File | undefined) {
    if (!file || busy) return
    setError(undefined)
    if (file.size > MAX_RESUME_BYTES) { setError(TOO_LARGE_MESSAGE); return }
    setBusy(true)
    try {
      const r = await keepResumeFromFile(file, { makePrimary: first })
      if (!r.ok) { setError(r.error); return }
      onSaved(r.saved, first)
    } catch {
      setError('Something went wrong reading that file. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o) }}>
      <div className="p-6 sm:p-8">
        <ModalTitle className="text-lg font-semibold text-primary">Add a résumé</ModalTitle>
        <p className="mt-1 text-sm text-muted-foreground">PDF or Word, up to {MAX_RESUME_MB} MB. We keep its text, not the file.</p>
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); void take(e.dataTransfer.files[0]) }}
          disabled={busy}
          className={`mt-5 flex w-full flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center transition-colors ${drag ? 'border-accent bg-accent/5' : 'border-border bg-secondary/30 hover:border-accent/60'}`}
        >
          <span className="bg-brand-gradient flex size-12 items-center justify-center rounded-xl">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
          </span>
          <span className="mt-3 text-sm font-semibold text-primary">{busy ? 'Reading your résumé…' : 'Choose a file, or drop it here'}</span>
        </button>
        {error ? <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        <input
          ref={input}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hidden
          onChange={(e) => { void take(e.target.files?.[0]); e.target.value = '' }}
        />
      </div>
    </Modal>
  )
}
