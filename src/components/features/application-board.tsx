'use client'

import { useState, useTransition } from 'react'
import {
  setApplicationStatus, setApplicationDetail, removeApplication, trackRole,
  type ApplicationStatus,
} from '@/app/actions/applications'
import styles from './application-board.module.css'

export type Application = {
  id: string
  company: string
  title: string
  applyUrl: string | null
  status: ApplicationStatus
  note: string | null
  followUpOn: string | null
}

/** Left to right is the pipeline. 'closed' is deliberately not called
 *  'rejected': a candidate closes an application for their own reasons at least
 *  as often as an employer closes it for them. */
const COLUMNS: { status: ApplicationStatus; label: string }[] = [
  { status: 'saved', label: 'Saved' },
  { status: 'applied', label: 'Applied' },
  { status: 'interviewing', label: 'Interviewing' },
  { status: 'offer', label: 'Offer' },
  { status: 'closed', label: 'Closed' },
]

/**
 * The tracker.
 *
 * Status moves through a <select> rather than drag-and-drop. Dragging is the
 * canonical Kanban gesture and the wrong one here: it needs a library, it is
 * hostile on a phone, and this product's core loop is a candidate on a phone at
 * 11pm. A select is operable by keyboard and screen reader with no work.
 *
 * Every write is optimistic against local state and reconciled by the action's
 * revalidate. A tracker that stalls for a round-trip on every move would feel
 * broken well before it felt slow.
 */
export function ApplicationBoard({ initial }: { initial: Application[] }) {
  const [rows, setRows] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const patch = (id: string, next: Partial<Application>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...next } : r)))

  const move = (id: string, status: ApplicationStatus) => {
    patch(id, { status })
    startTransition(() => { void setApplicationStatus({ id, status }) })
  }

  const detail = (id: string, next: { note?: string | null; followUpOn?: string | null }) => {
    patch(id, next as Partial<Application>)
    startTransition(() => { void setApplicationDetail({ id, ...next }) })
  }

  const remove = (id: string) => {
    setRows((rs) => rs.filter((r) => r.id !== id))
    startTransition(() => { void removeApplication({ id }) })
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <>
      <div className={styles.board}>
        {COLUMNS.map((col) => {
          const inCol = rows.filter((r) => r.status === col.status)
          return (
            <section key={col.status} className={styles.column} aria-label={col.label}>
              <h2 className={styles.columnHead}>
                <span>{col.label}</span>
                <span className={styles.count}>{inCol.length}</span>
              </h2>

              {inCol.length === 0 ? (
                <p className={styles.empty}>Nothing here yet.</p>
              ) : inCol.map((r) => (
                <div key={r.id} className={styles.card}>
                  {r.applyUrl ? (
                    <a className={styles.title} href={r.applyUrl} target="_blank" rel="noopener noreferrer">
                      {r.title}
                    </a>
                  ) : (
                    <span className={styles.title}>{r.title}</span>
                  )}
                  <span className={styles.meta}>{r.company}</span>

                  {r.followUpOn ? (
                    <span className={styles.meta}>
                      Follow up{' '}
                      <span className={`${styles.due} ${r.followUpOn < today ? styles.overdue : ''}`}>
                        {r.followUpOn}
                      </span>
                    </span>
                  ) : null}
                  {r.note ? <span className={styles.meta}>{r.note}</span> : null}

                  <div className={styles.controls}>
                    <select
                      className={styles.select}
                      aria-label={`Status for ${r.title} at ${r.company}`}
                      value={r.status}
                      onChange={(e) => move(r.id, e.target.value as ApplicationStatus)}
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.status} value={c.status}>{c.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={styles.linkish}
                      onClick={() => setEditing(editing === r.id ? null : r.id)}
                    >
                      {editing === r.id ? 'Done' : 'Note & follow-up'}
                    </button>
                    <button type="button" className={styles.linkish} onClick={() => remove(r.id)}>
                      Remove
                    </button>
                  </div>

                  {editing === r.id ? (
                    <div className={styles.controls}>
                      <input
                        className={styles.input}
                        type="text"
                        aria-label={`Note on ${r.title}`}
                        placeholder="Referral from Anita; asked for 14L"
                        defaultValue={r.note ?? ''}
                        onBlur={(e) => detail(r.id, { note: e.target.value })}
                      />
                      <input
                        className={styles.input}
                        type="date"
                        aria-label={`Follow up on ${r.title}`}
                        defaultValue={r.followUpOn ?? ''}
                        onChange={(e) => detail(r.id, { followUpOn: e.target.value })}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </section>
          )
        })}
      </div>

      <AddByHand onAdded={(row) => setRows((rs) => [row, ...rs])} />
    </>
  )
}

/**
 * A job found anywhere. The tracker is worth less than a spreadsheet if it only
 * accepts roles from our own index — the candidate's pipeline includes the
 * referral and the role a friend forwarded, and a tracker that cannot hold
 * those is one they will stop opening.
 */
function AddByHand({ onAdded }: { onAdded: (row: Application) => void }) {
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
    <div className={styles.addRow}>
      <input className={styles.input} aria-label="Company" placeholder="Company"
        value={company} onChange={(e) => setCompany(e.target.value)} />
      <input className={styles.input} aria-label="Role title" placeholder="Role title"
        value={title} onChange={(e) => setTitle(e.target.value)} />
      <button type="button" className={styles.linkish} onClick={add} disabled={busy}>
        {busy ? 'Adding…' : 'Add a job from anywhere'}
      </button>
      {error ? <span className={styles.empty}>{error}</span> : null}
    </div>
  )
}
