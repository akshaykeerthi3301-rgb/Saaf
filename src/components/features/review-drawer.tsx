'use client'

import { useState, useTransition } from 'react'
import { CircleCheck, Info, Loader2, ShieldCheck, X } from 'lucide-react'
import { tailorForRole } from '@/app/actions/tailor'
import { trackRole } from '@/app/actions/applications'
import type { Draft } from '@/lib/tailor'
import { Sheet, SheetClose, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

type Props = {
  roleId: string
  title: string
  company: string
  applyUrl?: string
}

/**
 * Review & Approve — the last look before a candidate puts their name to text.
 *
 * The point of this screen is that nobody fires off an application they have
 * not read. So the drawer is a review surface, not a send button: the material
 * is editable, the apply link goes to the employer's own site, and Jobinko never
 * submits anything. "Approve & Stage" files it on the candidate's board.
 *
 * ⚠️ THE TRUST BADGE IS EARNED IN src/lib/tailor.ts, NOT WRITTEN HERE. Every
 * bullet has been through a grounding filter that drops invented metrics,
 * foreign employers, inflated tenure and unheld credentials. What that filter
 * removed is shown, not hidden — a candidate who can see what was rejected has
 * a reason to believe what was kept, and a badge over a black box is worth
 * nothing.
 */
export function ReviewDrawer({ roleId, title, company, applyUrl }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  const [provider, setProvider] = useState<string>()
  const [staged, setStaged] = useState(false)
  const [loading, startLoading] = useTransition()
  const [staging, startStaging] = useTransition()

  function launch() {
    setOpen(true)
    if (draft || loading) return
    startLoading(async () => {
      const res = await tailorForRole({ roleId })
      if (!res.ok) { setError(res.error); return }
      setDraft(res.draft)
      setNote(res.draft.coverNote)
      setProvider(res.providerLabel)
      setError(undefined)
    })
  }

  function stage() {
    startStaging(async () => {
      const res = await trackRole({ roleId, company, title, applyUrl })
      if (res.ok) setStaged(true)
      else setError(res.error)
    })
  }

  /** Highlight the skills this posting names and the candidate holds. Nothing
   *  else is highlighted, so a green mark always means the same thing. */
  const mark = (text: string) => {
    const terms = (draft?.matched ?? []).filter(Boolean)
    if (!terms.length) return text
    const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
    return text.split(re).map((part, i) =>
      terms.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
        <mark key={i} className="rounded bg-accent/15 px-1 text-primary">{part}</mark>
      ) : (
        <span key={i}>{part}</span>
      ),
    )
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => (next ? launch() : setOpen(false))}
        trigger={
          <SheetTrigger className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground hover:opacity-90">
            <ShieldCheck className="size-3.5" />
            Review &amp; Approve
          </SheetTrigger>
        }
      >
            <header className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Review application</p>
                <SheetTitle className="mt-1 text-lg font-semibold leading-snug tracking-[-0.03em] text-primary">{title}</SheetTitle>
                <p className="text-sm text-muted-foreground">{company}</p>
              </div>
              <SheetClose
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                aria-label="Close"
              >
                <X className="size-4" />
              </SheetClose>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {loading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Drafting from your profile and this posting…
                </p>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-border bg-secondary/60 p-4">
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              ) : null}

              {draft ? (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Résumé bullets
                  </h3>
                  {draft.bullets.length ? (
                    <ul className="mt-3 space-y-3">
                      {draft.bullets.map((b, i) => (
                        <li key={i} className="flex gap-2.5 rounded-xl border border-border bg-secondary/40 p-4 text-sm leading-6 text-primary">
                          <CircleCheck className="mt-1 size-3.5 shrink-0 text-accent" />
                          <span>{mark(b)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 rounded-xl border border-border bg-secondary/40 p-4 text-sm leading-6 text-muted-foreground">
                      Nothing survived the grounding check this time. Rather than show you claims we
                      cannot support from your profile, we are showing none.
                    </p>
                  )}

                  {draft.matched.length ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Highlighted words are skills on your profile that this posting also names.
                    </p>
                  ) : null}

                  <h3 className="mt-7 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Cover note
                  </h3>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={6}
                    placeholder="Nothing drafted — write your own, or send without one."
                    className="mt-3 w-full rounded-xl border border-input bg-card p-4 text-sm leading-6 text-primary outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/10"
                  />

                  {/* THE BADGE, AND THE EVIDENCE FOR IT. A trust claim with the
                      rejected material underneath is checkable; the same claim
                      over a black box is decoration. */}
                  <div className="mt-5 rounded-xl border border-border bg-secondary/60 p-4">
                    <p className="flex items-center gap-2 text-xs font-semibold text-primary">
                      <ShieldCheck className="size-3.5 text-accent" />
                      Every line above is grounded in your profile
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                      Nothing here states a number, an employer, a tenure or a qualification your
                      profile does not already hold. Anything that did was removed before you saw it
                      {provider ? `, after being drafted by ${provider}` : ''}.
                    </p>

                    {draft.dropped.length ? (
                      <details className="mt-3">
                        <summary className="cursor-pointer list-none text-xs font-semibold text-muted-foreground hover:text-primary">
                          {draft.dropped.length} {draft.dropped.length === 1 ? 'line was' : 'lines were'} removed — see what and why
                        </summary>
                        <ul className="mt-2 space-y-2">
                          {draft.dropped.map((d, i) => (
                            <li key={i} className="rounded-lg bg-card p-3 text-xs leading-5 text-muted-foreground">
                              <span className="line-through">{d.text}</span>
                              <span className="mt-1 flex items-start gap-1.5 not-italic text-primary">
                                <Info className="mt-0.5 size-3 shrink-0" />
                                Removed: {d.reason}.
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>

            <footer className="flex items-center gap-3 border-t border-border p-5">
              <SheetClose className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-primary">
                Cancel
              </SheetClose>
              {/* Staging files it on the board. Jobinko never submits an
                  application — the apply link goes to the employer's own site,
                  which is a locked decision, not a gap. */}
              <button
                type="button"
                onClick={stage}
                disabled={staging || staged}
                className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
              >
                {staged ? 'Staged on your board' : staging ? 'Staging…' : 'Approve & stage application'}
              </button>
              {applyUrl ? (
                <a
                  href={applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-primary hover:border-accent/60"
                >
                  Apply
                </a>
              ) : null}
            </footer>
      </Sheet>
    </>
  )
}
