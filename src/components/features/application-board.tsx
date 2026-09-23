'use client'

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  ArrowDownUp, CalendarClock, Check, Copy, GripVertical, KanbanSquare, Mail, Plus, Rows3, Search, X,
} from 'lucide-react'
import {
  bulkSetApplicationStatus, removeApplication, setApplicationDetail, setApplicationRecord, setApplicationStatus,
  trackRole, type ApplicationStatus,
} from '@/app/actions/applications'
import { istDay } from '@/lib/day'
import { followUpEmail } from '@/lib/copilot-templates'
import { ScoreRing } from '@/components/ui/score-ring'
import { Modal, ModalClose, ModalTitle } from '@/components/ui/modal'

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
  updatedAt: string | null
  // Migration 0028. Null until applied, or until set.
  appliedOn: string | null
  resumeVersion: string | null
  salaryNote: string | null
  interviewOn: string | null
  statusChangedAt: string | null
}

/**
 * Left to right is the pipeline. 'closed' is labelled Archived: a candidate
 * closes an application for their own reasons at least as often as an employer
 * closes it for them, and "Rejected" would name a verdict we do not know.
 * 'applying' is the stage between deciding and submitting (migration 0028).
 */
export const COLUMNS: { status: ApplicationStatus; label: string; empty: string }[] = [
  { status: 'saved', label: 'Saved', empty: 'Nothing saved yet. Save a role from your feed.' },
  { status: 'applying', label: 'Applying', empty: 'Nothing in progress.' },
  { status: 'applied', label: 'Applied', empty: 'Nothing applied to yet.' },
  { status: 'interviewing', label: 'Interviewing', empty: 'No interviews yet.' },
  { status: 'offer', label: 'Offer', empty: 'No offers yet.' },
  { status: 'closed', label: 'Archived', empty: 'Nothing archived.' },
]
const LABEL = Object.fromEntries(COLUMNS.map((c) => [c.status, c.label])) as Record<ApplicationStatus, string>

/** How long a removed card can be brought back before the delete is sent. */
const UNDO_MS = 6000
const DAY = 86_400_000

function daysIn(r: Application): number {
  const at = r.statusChangedAt ?? r.updatedAt
  return at ? Math.max(0, Math.floor((Date.now() - Date.parse(at)) / DAY)) : 0
}

/**
 * The tracker: a six-column board with drag and drop, a table view with sort,
 * filter and bulk moves, and an application record per card.
 *
 * ⚠️ DRAG IS AN ENHANCEMENT, NOT THE ONLY WAY TO MOVE A CARD. Native HTML5 drag
 * works for a mouse; it does nothing on a phone or for a keyboard or screen
 * reader. Every card keeps its status <select>, which is fully operable without
 * a pointer — the rule this file set when drag was first proposed.
 *
 * Every write is optimistic against local state, then reconciled — see
 * commit(). An optimistic update that cannot be undone is not optimistic, it
 * is a lie (the lesson recorded in track-role.tsx).
 */
export function ApplicationBoard({
  initial, resumeLabels, recordsStored,
}: {
  initial: Application[]
  /** Saved résumé labels, for the record's "résumé version" field. */
  resumeLabels: string[]
  /** False until migration 0028 is applied; the record says so. */
  recordsStored: boolean
}) {
  const [rows, setRows] = useState(initial)
  const [error, setError] = useState<string>()
  const [view, setView] = useState<'board' | 'table'>('board')
  const [openId, setOpenId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<ApplicationStatus | null>(null)

  // The view is a per-viewer convenience, so browser storage is right for it —
  // wrapped, because storage can be unavailable (private windows, blocked data).
  //
  // Read after hydration, not in a lazy initialiser: the server renders the
  // board, and reading storage during the first render would make the client's
  // first paint disagree with the server's (a hydration mismatch).
  useEffect(() => {
    try {
      const v = localStorage.getItem('saaf.tracker.view')
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a stored preference after hydration is the case this rule allows for
      if (v === 'table') setView(v)
    } catch { /* default view */ }
  }, [])
  const chooseView = (v: 'board' | 'table') => {
    setView(v)
    try { localStorage.setItem('saaf.tracker.view', v) } catch { /* not persisted */ }
  }

  const patch = (ids: string[], next: Partial<Application>) =>
    setRows((rs) => rs.map((r) => (ids.includes(r.id) ? { ...r, ...next } : r)))

  const commit = async (write: () => Promise<{ ok: boolean; error?: string }>, rollback: () => void) => {
    setError(undefined)
    try {
      const res = await write()
      if (res.ok) return true
      rollback()
      setError(res.error ?? 'That did not save.')
    } catch {
      rollback()
      setError('That did not save — check your connection.')
    }
    return false
  }

  const move = async (id: string, status: ApplicationStatus) => {
    const row = rows.find((r) => r.id === id)
    if (!row || row.status === status) return
    const before = { status: row.status, statusChangedAt: row.statusChangedAt, appliedOn: row.appliedOn }
    const now = new Date().toISOString()
    patch([id], {
      status,
      statusChangedAt: now,
      appliedOn: status === 'applied' && !row.appliedOn ? now.slice(0, 10) : row.appliedOn,
    })
    await commit(() => setApplicationStatus({ id, status }), () => patch([id], before))
  }

  const moveMany = async (ids: string[], status: ApplicationStatus) => {
    const before = rows.filter((r) => ids.includes(r.id)).map((r) => ({ id: r.id, status: r.status, statusChangedAt: r.statusChangedAt }))
    patch(ids, { status, statusChangedAt: new Date().toISOString() })
    return commit(
      () => bulkSetApplicationStatus({ ids, status }),
      () => setRows((rs) => rs.map((r) => {
        const b = before.find((x) => x.id === r.id)
        return b ? { ...r, status: b.status, statusChangedAt: b.statusChangedAt } : r
      })),
    )
  }

  const saveRecord = async (id: string, next: Partial<Application>) => {
    const row = rows.find((r) => r.id === id)
    if (!row) return
    const before: Partial<Application> = {}
    for (const k of Object.keys(next) as (keyof Application)[]) (before as Record<string, unknown>)[k] = row[k]
    patch([id], next)

    const detail: Parameters<typeof setApplicationDetail>[0] = { id }
    if ('note' in next) detail.note = next.note ?? null
    if ('followUpOn' in next) detail.followUpOn = next.followUpOn ?? null
    const record: Parameters<typeof setApplicationRecord>[0] = { id }
    if ('appliedOn' in next) record.appliedOn = next.appliedOn ?? null
    if ('resumeVersion' in next) record.resumeVersion = next.resumeVersion ?? null
    if ('salaryNote' in next) record.salaryNote = next.salaryNote ?? null
    if ('interviewOn' in next) record.interviewOn = next.interviewOn ?? null

    if (Object.keys(detail).length > 1) {
      await commit(() => setApplicationDetail(detail), () => patch([id], { note: row.note, followUpOn: row.followUpOn }))
    }
    if (Object.keys(record).length > 1) {
      await commit(() => setApplicationRecord(record), () => patch([id], {
        appliedOn: row.appliedOn, resumeVersion: row.resumeVersion, salaryNote: row.salaryNote, interviewOn: row.interviewOn,
      }))
    }
    if (next.status && next.status !== row.status) await move(id, next.status)
  }

  // ---------------------------------------------------------- remove + undo
  const pending = useRef<{ row: Application; index: number; timer: ReturnType<typeof setTimeout> } | null>(null)
  const [undoable, setUndoable] = useState<Application | null>(null)

  const send = (p: { row: Application; index: number }) =>
    commit(
      () => removeApplication({ id: p.row.id }),
      () => setRows((rs) => { const c = [...rs]; c.splice(Math.min(p.index, c.length), 0, p.row); return c }),
    )

  const flush = () => {
    const p = pending.current
    if (!p) return
    clearTimeout(p.timer)
    pending.current = null
    setUndoable(null)
    void send(p)
  }

  const remove = (id: string) => {
    flush()
    const index = rows.findIndex((r) => r.id === id)
    if (index < 0) return
    const row = rows[index]
    setRows((rs) => rs.filter((r) => r.id !== id))
    setOpenId(null)
    pending.current = { row, index, timer: setTimeout(flush, UNDO_MS) }
    setUndoable(row)
  }

  const undo = () => {
    const p = pending.current
    if (!p) return
    clearTimeout(p.timer)
    pending.current = null
    setUndoable(null)
    setRows((rs) => { const c = [...rs]; c.splice(Math.min(p.index, c.length), 0, p.row); return c })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => flush(), [])

  // ------------------------------------------------------------------ drag
  const onDragStart = (e: DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    setDragId(id)
  }
  const onDrop = (e: DragEvent, status: ApplicationStatus) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || dragId
    setOverCol(null)
    setDragId(null)
    if (id) void move(id, status)
  }

  const today = istDay()
  const due = rows.filter((r) => r.followUpOn && r.followUpOn <= today && r.status !== 'closed').length
  const open = rows.find((r) => r.id === openId) ?? null

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1" role="tablist" aria-label="Tracker view">
          {([['board', 'Board', KanbanSquare], ['table', 'Table', Rows3]] as const).map(([v, label, Icon]) => (
            <button
              key={v}
              role="tab"
              type="button"
              aria-selected={view === v}
              onClick={() => chooseView(v)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                view === v ? 'bg-brand-gradient' : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {due > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
              <CalendarClock className="size-3.5" />
              {due} to follow up on
            </span>
          )}
          <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            {rows.length} tracked
          </span>
        </div>
      </div>

      {undoable && (
        <p role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-primary">
          <span>Removed <span className="font-semibold">{undoable.title}</span> at {undoable.company}.</span>
          <button type="button" onClick={undo} className="rounded-lg px-2 py-1 text-sm font-semibold underline underline-offset-4 hover:text-accent">Undo</button>
        </p>
      )}
      {error && (
        <p role="status" className="mb-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-6 text-primary">
          {error} Your tracker is showing what we actually have saved.
        </p>
      )}

      <AddByHand onAdded={(row) => setRows((rs) => [row, ...rs])} />

      {view === 'board' ? (
        <div
          tabIndex={0}
          role="region"
          aria-label="Your application pipeline"
          className="mt-5 flex snap-x gap-4 overflow-x-auto pb-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 2xl:grid 2xl:grid-cols-6 2xl:overflow-visible"
        >
          {COLUMNS.map((col) => {
            const inCol = rows.filter((r) => r.status === col.status)
            const over = overCol === col.status
            return (
              <section
                key={col.status}
                aria-label={col.label}
                onDragOver={(e) => { e.preventDefault(); setOverCol(col.status) }}
                onDragLeave={() => setOverCol((c) => (c === col.status ? null : c))}
                onDrop={(e) => onDrop(e, col.status)}
                className={`min-w-[270px] snap-start rounded-2xl border p-3 transition-colors 2xl:min-w-0 ${
                  over ? 'border-accent bg-brand/10' : 'border-border bg-secondary/40'
                }`}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-primary">{col.label}</h2>
                  <span className="rounded-full bg-card px-2.5 py-1 text-xs font-bold tabular-nums text-muted-foreground">{inCol.length}</span>
                </div>
                {inCol.length === 0 ? (
                  <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center">
                    <p className="text-xs leading-5 text-muted-foreground">{over ? 'Drop here' : col.empty}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inCol.map((r) => (
                      <BoardCard
                        key={r.id}
                        r={r}
                        today={today}
                        dragging={dragId === r.id}
                        onDragStart={(e) => onDragStart(e, r.id)}
                        onDragEnd={() => { setDragId(null); setOverCol(null) }}
                        onOpen={() => setOpenId(r.id)}
                        onMove={(s) => move(r.id, s)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      ) : (
        <TableView rows={rows} onOpen={setOpenId} onMoveMany={moveMany} />
      )}

      <RecordModal
        key={open?.id ?? 'none'}
        row={open}
        resumeLabels={resumeLabels}
        recordsStored={recordsStored}
        onClose={() => setOpenId(null)}
        onSave={(next) => open && saveRecord(open.id, next)}
        onRemove={() => open && remove(open.id)}
      />
    </>
  )
}

function BoardCard({
  r, today, dragging, onDragStart, onDragEnd, onOpen, onMove,
}: {
  r: Application
  today: string
  dragging: boolean
  onDragStart: (e: DragEvent) => void
  onDragEnd: () => void
  onOpen: () => void
  onMove: (s: ApplicationStatus) => void
}) {
  const overdue = !!r.followUpOn && r.followUpOn < today && r.status !== 'closed'
  const days = daysIn(r)
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`glow-hover group cursor-grab rounded-2xl border border-border bg-card p-4 active:cursor-grabbing ${dragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <h3 className="text-sm font-semibold leading-5 tracking-[-0.02em] text-primary group-hover:underline">{r.title}</h3>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">{r.company}</p>
        </button>
        {r.score !== undefined ? <ScoreRing score={r.score} size={40} stroke={4} /> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-md bg-secondary px-2 py-0.5 tabular-nums text-muted-foreground" title="Days in this stage">
          {days === 0 ? 'Today' : `${days}d in stage`}
        </span>
        {r.interviewOn ? (
          <span className="rounded-md bg-brand/15 px-2 py-0.5 tabular-nums text-accent">Interview {r.interviewOn}</span>
        ) : null}
        {r.followUpOn ? (
          <span className={`inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 tabular-nums ${overdue ? 'font-semibold text-primary underline' : 'text-muted-foreground'}`}>
            <CalendarClock className="size-3" /> {r.followUpOn}
          </span>
        ) : null}
      </div>
      {r.note ? <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{r.note}</p> : null}

      <div className="mt-3 flex items-center gap-2">
        <select
          aria-label={`Status for ${r.title} at ${r.company}`}
          value={r.status}
          onChange={(e) => onMove(e.target.value as ApplicationStatus)}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] font-medium text-primary outline-none focus:border-accent"
        >
          {COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
        </select>
        <button type="button" onClick={onOpen} className="text-[11px] font-semibold text-muted-foreground hover:text-primary hover:underline">
          Details
        </button>
      </div>
    </article>
  )
}

// ------------------------------------------------------------------- table

type SortKey = 'title' | 'company' | 'status' | 'score' | 'appliedOn' | 'days'

function TableView({
  rows, onOpen, onMoveMany,
}: {
  rows: Application[]
  onOpen: (id: string) => void
  onMoveMany: (ids: string[], s: ApplicationStatus) => Promise<boolean>
}) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'days', dir: 1 })
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [bulkTo, setBulkTo] = useState<ApplicationStatus>('applied')

  const order = COLUMNS.map((c) => c.status)
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = rows.filter((r) =>
      (status === 'all' || r.status === status) &&
      (!needle || `${r.title} ${r.company} ${r.note ?? ''}`.toLowerCase().includes(needle)))
    const val = (r: Application): string | number => {
      switch (sort.key) {
        case 'title': return r.title.toLowerCase()
        case 'company': return r.company.toLowerCase()
        case 'status': return order.indexOf(r.status)
        case 'score': return r.score ?? -1
        case 'appliedOn': return r.appliedOn ?? ''
        case 'days': return daysIn(r)
      }
    }
    return [...list].sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * sort.dir)
  }, [rows, q, status, sort, order])

  const allPicked = shown.length > 0 && shown.every((r) => picked.has(r.id))
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(shown.map((r) => r.id)))
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const head = (key: SortKey, label: string) => (
    <th scope="col" className="px-3 py-2.5 text-left">
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}
        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] ${sort.key === key ? 'text-accent' : 'text-muted-foreground hover:text-primary'}`}
        aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}
      >
        {label}
        <ArrowDownUp className="size-3" />
      </button>
    </th>
  )

  return (
    <div className="mt-5 rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <label className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by role, company or note"
            aria-label="Filter applications"
            className="w-full rounded-lg border border-input bg-background py-2 pl-8 pr-3 text-xs text-primary outline-none focus:border-accent"
          />
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ApplicationStatus | 'all')}
          aria-label="Filter by stage"
          className="rounded-lg border border-input bg-background px-2.5 py-2 text-xs text-primary outline-none focus:border-accent"
        >
          <option value="all">All stages</option>
          {COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
        </select>
        {picked.size ? (
          <div className="flex items-center gap-2 rounded-lg bg-brand/10 px-2 py-1">
            <span className="text-xs font-semibold text-primary">{picked.size} selected — move to</span>
            <select
              value={bulkTo}
              onChange={(e) => setBulkTo(e.target.value as ApplicationStatus)}
              aria-label="Move selected to"
              className="rounded-md border border-input bg-background px-2 py-1 text-xs text-primary"
            >
              {COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
            </select>
            <button
              type="button"
              onClick={async () => { if (await onMoveMany([...picked], bulkTo)) setPicked(new Set()) }}
              className="bg-brand-gradient rounded-md px-2.5 py-1 text-xs font-semibold"
            >
              Apply
            </button>
          </div>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-border">
            <tr>
              <th scope="col" className="w-10 px-3 py-2.5">
                <input type="checkbox" checked={allPicked} onChange={toggleAll} aria-label="Select all shown" className="accent-[var(--brand)]" />
              </th>
              {head('title', 'Role')}
              {head('company', 'Company')}
              {head('status', 'Stage')}
              {head('score', 'Match')}
              {head('appliedOn', 'Applied')}
              {head('days', 'Days in stage')}
              <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Next</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className={`border-b border-border last:border-0 hover:bg-secondary/40 ${picked.has(r.id) ? 'bg-brand/5' : ''}`}>
                <td className="px-3 py-2.5">
                  <input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.title}`} className="accent-[var(--brand)]" />
                </td>
                <td className="px-3 py-2.5">
                  <button type="button" onClick={() => onOpen(r.id)} className="text-left font-semibold text-primary hover:underline">{r.title}</button>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{r.company}</td>
                <td className="px-3 py-2.5"><span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-primary">{LABEL[r.status]}</span></td>
                <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-primary">{r.score !== undefined ? `${Math.round(r.score)}%` : '—'}</td>
                <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-muted-foreground">{r.appliedOn ?? '—'}</td>
                <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-muted-foreground">{daysIn(r)}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {r.interviewOn ? `Interview ${r.interviewOn}` : r.followUpOn ? `Follow up ${r.followUpOn}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">{rows.length ? 'Nothing matches that filter.' : 'Nothing tracked yet.'}</p>
        ) : null}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ record

function RecordModal({
  row, resumeLabels, recordsStored, onClose, onSave, onRemove,
}: {
  row: Application | null
  resumeLabels: string[]
  recordsStored: boolean
  onClose: () => void
  onSave: (next: Partial<Application>) => void
  onRemove: () => void
}) {
  const [form, setForm] = useState<Partial<Application>>(row ?? {})
  const [copied, setCopied] = useState(false)
  if (!row) return <Modal open={false} onOpenChange={onClose}><span /></Modal>

  const set = <K extends keyof Application>(k: K, v: Application[K]) => setForm((f) => ({ ...f, [k]: v }))
  const stage = (form.status ?? row.status) as ApplicationStatus
  const follow = followUpEmail({ stage, days: daysIn(row), title: row.title, company: row.company })
  const changed = (Object.keys(form) as (keyof Application)[]).filter((k) => (form[k] ?? null) !== (row[k] ?? null))
  const input = 'mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-primary outline-none focus:border-accent'

  return (
    <Modal open onOpenChange={(o) => { if (!o) onClose() }}>
      <header className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Application record</p>
          <ModalTitle className="mt-1 text-lg font-semibold tracking-[-0.03em] text-primary">{row.title}</ModalTitle>
          <p className="text-sm text-muted-foreground">
            {row.company}
            {row.applyUrl ? <> · <a href={row.applyUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-4">posting ↗</a></> : null}
          </p>
        </div>
        <ModalClose aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary">
          <X className="size-4" />
        </ModalClose>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {!recordsStored ? (
          <p className="mb-4 rounded-lg border border-score-mid/40 bg-score-mid/10 p-3 text-xs leading-5 text-primary">
            Date applied, résumé version, salary and interview date need a database update that has not been
            applied yet. Stage, notes and follow-up date save now.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-muted-foreground">Stage
            <select value={stage} onChange={(e) => set('status', e.target.value as ApplicationStatus)} className={input}>
              {COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
            </select>
          </label>
          <label className="block text-xs text-muted-foreground">Date applied
            <input type="date" value={form.appliedOn ?? ''} onChange={(e) => set('appliedOn', e.target.value || null)} className={input} />
          </label>
          <label className="block text-xs text-muted-foreground">Résumé version sent
            <input
              list="resume-versions"
              value={form.resumeVersion ?? ''}
              onChange={(e) => set('resumeVersion', e.target.value || null)}
              placeholder={resumeLabels.length ? 'Pick a saved résumé' : 'e.g. PM résumé v2'}
              className={input}
            />
            <datalist id="resume-versions">{resumeLabels.map((l) => <option key={l} value={l} />)}</datalist>
          </label>
          <label className="block text-xs text-muted-foreground">Salary discussed
            <input value={form.salaryNote ?? ''} onChange={(e) => set('salaryNote', e.target.value || null)} placeholder="e.g. ₹18–22 LPA asked; 20 offered" className={input} />
          </label>
          <label className="block text-xs text-muted-foreground">Interview date
            <input type="date" value={form.interviewOn ?? ''} onChange={(e) => set('interviewOn', e.target.value || null)} className={input} />
          </label>
          <label className="block text-xs text-muted-foreground">Follow up on
            <input type="date" value={form.followUpOn ?? ''} onChange={(e) => set('followUpOn', e.target.value || null)} className={input} />
          </label>
          <label className="block text-xs text-muted-foreground sm:col-span-2">Notes
            <textarea value={form.note ?? ''} onChange={(e) => set('note', e.target.value || null)} rows={3} placeholder="Referral from Anita; recruiter is Priya" className={input} />
          </label>
        </div>

        {follow ? (
          <div className="mt-5 rounded-xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                <Mail className="size-3.5 text-accent" /> Follow-up email
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => { await navigator.clipboard.writeText(`${follow.subject}\n\n${follow.body}`); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-primary hover:border-accent/60"
                >
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />} {copied ? 'Copied' : 'Copy'}
                </button>
                <a
                  href={`mailto:?subject=${encodeURIComponent(follow.subject)}&body=${encodeURIComponent(follow.body)}`}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-primary hover:border-accent/60"
                >
                  <Mail className="size-3" /> Open in email
                </a>
              </div>
            </div>
            <p className="mt-2 text-xs leading-5 text-accent">{follow.advice}</p>
            <p className="mt-3 text-sm font-semibold text-primary">{follow.subject}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{follow.body}</p>
          </div>
        ) : null}
      </div>

      <footer className="flex items-center gap-3 border-t border-border p-5">
        <button type="button" onClick={onRemove} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-primary">
          Remove
        </button>
        <span className="flex-1" />
        <ModalClose className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-primary">Cancel</ModalClose>
        <button
          type="button"
          disabled={!changed.length}
          onClick={() => {
            const next: Partial<Application> = {}
            for (const k of changed) (next as Record<string, unknown>)[k] = form[k] ?? null
            onSave(next)
            onClose()
          }}
          className="bg-brand-gradient rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          Save
        </button>
      </footer>
    </Modal>
  )
}

// ------------------------------------------------------------ add by hand

/**
 * A job found anywhere. The tracker is worth less than a spreadsheet if it only
 * accepts roles from our own index — the candidate's pipeline includes the
 * referral and the role a friend forwarded.
 */
function AddByHand({ onAdded }: { onAdded: (row: Application) => void }) {
  const [company, setCompany] = useState('')
  const [title, setTitle] = useState('')
  const [applyUrl, setApplyUrl] = useState('')
  const [status, setStatus] = useState<ApplicationStatus>('saved')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-ring/20'

  async function add() {
    if (!company.trim() || !title.trim()) { setError('Add a company and a role title — the link is optional.'); return }
    const url = applyUrl.trim()
    if (url && !/^https?:\/\//i.test(url)) { setError('The link needs to start with http:// or https://.'); return }
    setBusy(true); setError(undefined)
    // One write, with the column on the insert — only a row the database
    // created has an id worth writing against.
    const res = await trackRole({
      company: company.trim(),
      title: title.trim(),
      ...(url ? { applyUrl: url } : {}),
      ...(status !== 'saved' ? { status } : {}),
    }).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    const now = new Date().toISOString()
    onAdded({
      id: crypto.randomUUID(), company: company.trim(), title: title.trim(), applyUrl: url || null, status,
      note: null, followUpOn: null, updatedAt: now, appliedOn: status === 'applied' ? now.slice(0, 10) : null,
      resumeVersion: null, salaryNote: null, interviewOn: null, statusChangedAt: now,
    })
    setCompany(''); setTitle(''); setApplyUrl(''); setStatus('saved')
  }

  return (
    <details className="rounded-2xl border border-border bg-card p-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-primary">
        <Plus className="size-3.5 text-accent" /> Add a job from anywhere
        <span className="font-normal text-muted-foreground">— a referral, a forward, a board we do not index</span>
      </summary>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <input className={`${inputCls} sm:max-w-52`} aria-label="Company" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
        <input className={`${inputCls} sm:max-w-60`} aria-label="Role title" placeholder="Role title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={`${inputCls} sm:max-w-64`} aria-label="Link to the posting" type="url" inputMode="url" placeholder="Link to the posting (optional)" value={applyUrl} onChange={(e) => setApplyUrl(e.target.value)} />
        <select className={`${inputCls} sm:max-w-40`} aria-label="Which column" value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus)}>
          {COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
        </select>
        <button type="button" onClick={add} disabled={busy} className="bg-brand-gradient inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50">
          <Plus className="size-3.5" /> {busy ? 'Adding…' : 'Add'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-muted-foreground">{error}</p>}
    </details>
  )
}
