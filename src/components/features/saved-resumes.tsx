'use client'

import { useState, useTransition } from 'react'
import { FileText, Loader2, Star, Trash2 } from 'lucide-react'
import { deleteSavedResume, makePrimaryResume } from '@/app/actions/resume-documents'
import { RESUME_SLOTS, slotNote } from '@/lib/resume-slots'
import type { SavedResume } from '@/lib/services/resume-documents'

/**
 * The saved résumés list — the "My Documents" this screen once said it could
 * never have.
 *
 * ⚠️ DELETE IS THE FIRST CONTROL, NOT THE LAST. The product changed a promise
 * to build this, and the only honest way to hold somebody's document is to make
 * getting rid of it the easiest thing on the screen. It is one click, it says
 * what it does, and it happens immediately.
 *
 * ⚠️ THE WRITE IS AWAITED AND ROLLED BACK ON FAILURE. src/components/features/
 * track-role.tsx documents why: an optimistic update that cannot be rolled back
 * is not optimistic, it is a lie — and on a delete it is the worst kind, because
 * the row reappears on the next reload and the candidate has no idea which
 * state is real.
 */
export function SavedResumes({ resumes }: { resumes: SavedResume[] }) {
  const [rows, setRows] = useState(resumes)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState<string>()
  const [, start] = useTransition()

  if (rows.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border p-5">
        <p className="text-sm font-semibold text-primary">No saved résumés yet</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Run the{' '}
          <a href="/tools/ats-checker" className="font-semibold text-primary underline underline-offset-4">
            ATS checker
          </a>{' '}
          and save the version you end up with. Anything you keep here can be re-scored against the
          roles we index each morning.
        </p>
      </div>
    )
  }

  function remove(id: string) {
    setBusy(id)
    setError(undefined)
    const previous = rows
    setRows((r) => r.filter((x) => x.id !== id))
    start(async () => {
      const res = await deleteSavedResume({ id })
      setBusy(undefined)
      if (!res.ok) {
        setRows(previous)
        setError(res.error)
      }
    })
  }

  function makePrimary(id: string) {
    setBusy(id)
    setError(undefined)
    start(async () => {
      const res = await makePrimaryResume({ id })
      setBusy(undefined)
      if (!res.ok) { setError(res.error); return }
      setRows((r) => r.map((x) => ({ ...x, isPrimary: x.id === id })))
    })
  }

  // undefined on every row = the primary-résumé update (0034) is not applied.
  const primaryReady = rows.every((r) => r.isPrimary !== undefined)
  const hasPrimary = rows.some((r) => r.isPrimary)

  return (
    <section className="mt-8">
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
        Saved résumés
        <span className="ml-2 font-mono text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
          {rows.length} of {RESUME_SLOTS}
        </span>
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {slotNote(rows.length, hasPrimary)}
        {primaryReady
          ? ' Your primary is the one the tailoring studio opens first and the browser extension fills applications from.'
          : ' Choosing a primary needs a database update that has not been applied yet.'}
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 p-4">
            <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-primary">
                {r.label}
                {r.isPrimary ? (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 align-middle text-[11px] font-medium text-accent">
                    <Star className="size-3" aria-hidden="true" />
                    Primary
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {r.score !== null ? (
                  <span className="font-mono tabular-nums">{r.score}/100</span>
                ) : (
                  'not scored'
                )}
                {' · saved '}
                {new Date(r.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            {primaryReady && !r.isPrimary ? (
              <button
                type="button"
                onClick={() => makePrimary(r.id)}
                disabled={busy === r.id}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
              >
                <Star className="size-3.5" aria-hidden="true" />
                Make primary
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => remove(r.id)}
              disabled={busy === r.id}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
            >
              {busy === r.id ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-3.5" aria-hidden="true" />
              )}
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
