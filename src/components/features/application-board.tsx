'use client'

import { useState } from 'react'
import { CalendarClock, Lock, Plus, X } from 'lucide-react'
import {
  setApplicationStatus, setApplicationDetail, removeApplication, trackRole,
  type ApplicationStatus,
} from '@/app/actions/applications'
import { istDay } from '@/lib/day'

export type Application = {
  id: string
  company: string
  title: string
  applyUrl: string | null
  status: ApplicationStatus
  /** The shortlist's score for this role, when it came from the shortlist. */
  score?: number
  note: string | null
  followUpOn: string | null
}

/** Left to right is the pipeline. 'closed' is deliberately not called
 *  'rejected': a candidate closes an application for their own reasons at least
 *  as often as an employer closes it for them.
 *
 *  The saaf-ai export shows four columns — Drafted, Applied, Interviewing,
 *  Closed — and has no Offer. Dropping Offer from a job tracker would be a real
 *  regression, so the five stages stand and Drafted maps to Saved. */
const COLUMNS: { status: ApplicationStatus; label: string; empty: string }[] = [
  { status: 'saved', label: 'Saved', empty: 'Nothing saved yet. Track a role from today’s list.' },
  { status: 'applied', label: 'Applied', empty: 'Nothing applied to yet.' },
  { status: 'interviewing', label: 'Interviewing', empty: 'No interviews yet.' },
  { status: 'offer', label: 'Offer', empty: 'No offers yet.' },
  { status: 'closed', label: 'Closed', empty: 'Nothing closed.' },
]

/**
 * The tracker, in the saaf-ai kanban design.
 *
 * Status still moves through a <select> rather than drag-and-drop. Dragging is
 * the canonical kanban gesture and it needs a library, it is hostile on a phone,
 * and this product's core loop is a candidate on a phone at 11pm. A select is
 * operable by keyboard and screen reader with no extra work. Pointer-device
 * drag is worth adding later as an enhancement on top of this, never as a
 * replacement for it.
 *
 * Every write is optimistic against local state, then reconciled — see commit()
 * below. A tracker that stalls for a round trip on every move would feel broken
 * well before it felt slow, but an optimistic update that cannot be undone is
 * worse than a slow one.
 */
export function ApplicationBoard({ initial }: { initial: Application[] }) {
  const [rows, setRows] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState<string>()

  const patch = (id: string, next: Partial<Application>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...next } : r)))

  /**
   * Apply, await, and put it back exactly as it was if the write did not land.
   *
   * ⚠️ THE THREE WRITES BELOW USED TO BE FIRE-AND-FORGET. Each fired inside
   * `startTransition(() => { void action() })`, and the `void` discarded the
   * result. The actions RETURN `{ ok: false }` rather than throwing, and
   * `failed()` in src/app/actions/applications.ts — unlike `done()` — does NOT
   * call revalidatePath. So a rejected write left the optimistic value on
   * screen, surfaced nothing, and was never corrected until a hard reload: the
   * candidate read a pipeline state that was not in the database.
   *
   * That is the same defect src/components/features/track-role.tsx records
   * having fixed — "an optimistic update that cannot be rolled back is not
   * optimistic, it is a lie" — in the sibling component that never got the same
   * treatment.
   *
   * ⚠️ A THROWN failure rolls back too, not just a returned one. The actions
   * return `{ ok: false }` for anything they can name — bad input, not signed
   * in, a rejected write — and THROW for what they cannot: the candidate's
   * connection dropping mid-move, which on a phone at 11pm is the likeliest
   * failure of all. Catching only the returned case would leave the identical
   * lie on screen for the case this tracker is most likely to meet.
   *
   * `useTransition` went with the `void`. Its callback is synchronous, so the
   * transition ended at the first await and marked nothing pending — decoration
   * over a fire-and-forget call. The optimistic update is the feedback.
   */
  const commit = async (
    write: () => Promise<{ ok: boolean; error?: string }>,
    rollback: () => void,
  ) => {
    setError(undefined)
    try {
      const res = await write()
      if (res.ok) return
      rollback()
      setError(res.error ?? 'That did not save.')
    } catch {
      rollback()
      setError('That did not save — check your connection.')
    }
  }

  const move = async (id: string, status: ApplicationStatus) => {
    const before = rows.find((r) => r.id === id)?.status
    if (before === undefined || before === status) return
    patch(id, { status })
    await commit(
      () => setApplicationStatus({ id, status }),
      () => patch(id, { status: before }),
    )
  }

  const detail = async (id: string, next: { note?: string | null; followUpOn?: string | null }) => {
    const row = rows.find((r) => r.id === id)
    if (!row) return
    // Only the keys being changed are captured, so a rollback restores exactly
    // what was overwritten and nothing else.
    const before: Partial<Application> = {}
    if ('note' in next) before.note = row.note
    if ('followUpOn' in next) before.followUpOn = row.followUpOn
    patch(id, next as Partial<Application>)
    await commit(
      () => setApplicationDetail({ id, ...next }),
      () => patch(id, before),
    )
  }

  const remove = async (id: string) => {
    const index = rows.findIndex((r) => r.id === id)
    if (index < 0) return
    const removed = rows[index]
    setRows((rs) => rs.filter((r) => r.id !== id))
    await commit(
      () => removeApplication({ id }),
      // Restored at its original index rather than appended — a card that
      // reappears somewhere else reads as a second bug.
      () =>
        setRows((rs) => {
          const copy = [...rs]
          copy.splice(Math.min(index, copy.length), 0, removed)
          return copy
        }),
    )
  }

  // IST, not UTC: a follow-up due today is due on the candidate's calendar.
  const today = istDay()
  const inputCls =
    'w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'

  return (
    <>
      {/* A rejected write, said out loud. It sits above the board rather than on
          the card, because the card has already rolled back to its previous
          value — the message explains why it moved back, and a card that both
          reverts and carries an error reads as two failures. */}
      {error && (
        <p
          role="status"
          className="mb-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-6 text-primary"
        >
          {error} Your board is showing what we actually have saved.
        </p>
      )}

      {/* Horizontal snap-scroll on a phone, a five-column grid from xl. No
          breakpoint to maintain beyond that one switch. */}
      <div className="flex snap-x gap-4 overflow-x-auto pb-4 xl:grid xl:grid-cols-5 xl:overflow-visible">
        {COLUMNS.map((col) => {
          const inCol = rows.filter((r) => r.status === col.status)
          return (
            <section
              key={col.status}
              aria-label={col.label}
              className="min-w-[280px] snap-start rounded-2xl border border-border bg-secondary/45 p-3 sm:min-w-[310px] xl:min-w-0"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-primary">{col.label}</h2>
                <span className="rounded-full bg-card px-2.5 py-1 text-xs font-bold tabular-nums text-muted-foreground shadow-sm">
                  {inCol.length}
                </span>
              </div>

              {inCol.length === 0 ? (
                <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
                  <p className="text-xs leading-5 text-muted-foreground">{col.empty}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inCol.map((r) => {
                    const overdue = !!r.followUpOn && r.followUpOn < today && r.status !== 'closed'
                    return (
                      <article
                        key={r.id}
                        className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {r.applyUrl ? (
                              <a
                                href={r.applyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-semibold leading-5 tracking-[-0.02em] text-primary hover:underline"
                              >
                                {r.title}
                              </a>
                            ) : (
                              <h3 className="text-sm font-semibold leading-5 tracking-[-0.02em] text-primary">
                                {r.title}
                              </h3>
                            )}
                            <p className="mt-1 text-xs font-medium text-muted-foreground">{r.company}</p>
                            {/* The same number the shortlist showed. Absent for
                                a role tracked by hand, rather than guessed. */}
                            {r.score !== undefined ? (
                              <span
                                className={`mt-2 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                                  r.score >= 75 ? 'bg-accent/10 text-accent' : 'bg-secondary text-muted-foreground'
                                }`}
                                title="Your match score for this role"
                              >
                                {r.score}%
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(r.id)}
                            aria-label={`Remove ${r.title}`}
                            className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-primary"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>

                        {/* Interview prep, where the design put it. It is not
                            built, so this states that instead of opening an
                            empty sheet — the alternative was a button that
                            teaches the candidate our buttons do not work. */}
                        {r.status === 'interviewing' ? (
                          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-2 text-[11px] leading-4 text-muted-foreground">
                            <Lock className="size-3 shrink-0" aria-hidden="true" />
                            Interview prep sheet — not built yet
                          </p>
                        ) : null}

                        {/* A follow-up in the past is stated, never coloured red.
                            Error red is for system failures; being late on a
                            follow-up is a fact about the week, not a fault. */}
                        {r.followUpOn && (
                          <p
                            className={`mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-[11px] tabular-nums ${
                              overdue ? 'font-semibold text-primary underline' : 'text-muted-foreground'
                            }`}
                          >
                            <CalendarClock className="size-3" />
                            {r.followUpOn}
                          </p>
                        )}
                        {r.note && (
                          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{r.note}</p>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <select
                            aria-label={`Status for ${r.title} at ${r.company}`}
                            value={r.status}
                            onChange={(e) => move(r.id, e.target.value as ApplicationStatus)}
                            className="rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] font-medium text-primary outline-none focus:border-accent"
                          >
                            {COLUMNS.map((c) => (
                              <option key={c.status} value={c.status}>{c.label}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setEditing(editing === r.id ? null : r.id)}
                            className="text-[11px] font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                          >
                            {editing === r.id ? 'Done' : 'Note & follow-up'}
                          </button>
                        </div>

                        {editing === r.id && (
                          <div className="mt-3 space-y-2 border-t border-border pt-3">
                            <input
                              className={inputCls}
                              type="text"
                              aria-label={`Note on ${r.title}`}
                              placeholder="Referral from Anita; asked for 14L"
                              defaultValue={r.note ?? ''}
                              onBlur={(e) => detail(r.id, { note: e.target.value })}
                            />
                            <input
                              className={inputCls}
                              type="date"
                              aria-label={`Follow up on ${r.title}`}
                              defaultValue={r.followUpOn ?? ''}
                              onChange={(e) => detail(r.id, { followUpOn: e.target.value })}
                            />
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>

      <AddByHand onAdded={(row) => setRows((rs) => [row, ...rs])} inputCls={inputCls} />
    </>
  )
}

/**
 * A job found anywhere. The tracker is worth less than a spreadsheet if it only
 * accepts roles from our own index — the candidate's pipeline includes the
 * referral and the role a friend forwarded, and a tracker that cannot hold
 * those is one they will stop opening.
 */
function AddByHand({
  onAdded, inputCls,
}: {
  onAdded: (row: Application) => void
  inputCls: string
}) {
  const [company, setCompany] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function add() {
    if (!company.trim() || !title.trim()) return
    setBusy(true); setError(undefined)
    const res = await trackRole({ company: company.trim(), title: title.trim() })
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    // The server row is authoritative; this id only has to be unique until the
    // revalidate lands, and any write against it would be rejected by RLS.
    onAdded({
      id: crypto.randomUUID(), company: company.trim(), title: title.trim(),
      applyUrl: null, status: 'saved', note: null, followUpOn: null,
    })
    setCompany(''); setTitle('')
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Add a job from anywhere
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className={`${inputCls} sm:max-w-56`}
          aria-label="Company"
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <input
          className={`${inputCls} sm:max-w-72`}
          aria-label="Role title"
          placeholder="Role title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          type="button"
          onClick={add}
          disabled={busy}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground shadow-sm transition hover:bg-accent/90 disabled:opacity-50"
        >
          <Plus className="size-3.5" />
          {busy ? 'Adding…' : 'Add'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-muted-foreground">{error}</p>}
    </div>
  )
}
