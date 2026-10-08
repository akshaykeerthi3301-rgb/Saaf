'use client'

import { useId, useState } from 'react'
import { saveAnswerBank } from '@/app/actions/answer-bank'
import { MAX_ANSWER, MAX_ENTRIES, MAX_QUESTION, type BankEntry } from '@/lib/answer-bank'

/**
 * "Questions employers asked" — your own answers to the custom questions on application
 * forms (F-705). Saaf never writes one for you: the extension fills a box only with
 * words you wrote here for that exact question, and a required question it has no answer
 * for is listed here, blank, instead of being guessed. Apply for me uses an answer only if
 * you tick it for that. Own Save: nothing here moves a score.
 */
export function AnswerBank({ initial, stored }: { initial: BankEntry[]; stored: boolean }) {
  const id = useId()
  const [rows, setRows] = useState(initial)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string>()
  const field = 'w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/10'

  const set = (i: number, patch: Partial<BankEntry>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const add = () => {
    if (!q.trim() || rows.length >= MAX_ENTRIES) return
    setRows([...rows, { q: q.trim(), a: '', auto: false }]); setQ('')
  }
  async function save() {
    setBusy(true); setNote(undefined)
    const r = await saveAnswerBank(rows).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
    setBusy(false)
    setNote(r.ok ? 'Saved. The extension picks these up the next time you open Saaf.' : r.error)
  }

  const waiting = rows.map((r, i) => ({ r, i })).filter(({ r }) => !r.a)
  const answered = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.a)
  const entry = ({ r, i }: { r: BankEntry; i: number }) => (
    <li key={i} className="rounded-xl border border-border p-3">
      <label htmlFor={`${id}-${i}`} className="block text-sm font-semibold text-primary">{r.q}</label>
      <textarea id={`${id}-${i}`} rows={3} maxLength={MAX_ANSWER} value={r.a} onChange={(e) => set(i, { a: e.target.value })} className={`${field} mt-2`} placeholder="Your own words" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={r.auto} onChange={(e) => set(i, { auto: e.target.checked })} /> Also use this in Apply for me
        </label>
        <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-xs font-semibold text-muted-foreground underline underline-offset-2">Remove</button>
      </div>
    </li>
  )

  return (
    <div className="mt-8 border-t border-border pt-6" data-testid="answer-bank">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Questions employers asked</p>
      <p className="mb-4 mt-1 text-sm leading-6 text-muted-foreground">
        Employers add their own questions, like “Why do you want to work here?”. Write your answer once and the extension fills it
        the next time a form asks <em>exactly</em> that question — a different company’s question is a different question. Saaf never
        writes an answer for you. When a required question has no answer here, it appears below, blank, for you to fill in.
        Questions about gender, religion, caste, passwords, ID numbers and consent boxes are never filled from here.
      </p>

      {waiting.length ? (
        <>
          <p className="mb-2 text-sm font-semibold text-primary">Waiting for your answer ({waiting.length})</p>
          <ul className="mb-4 space-y-3">{waiting.map(entry)}</ul>
        </>
      ) : null}
      {answered.length ? (
        <>
          <p className="mb-2 text-sm font-semibold text-primary">Your answers ({answered.length})</p>
          <ul className="space-y-3">{answered.map(entry)}</ul>
        </>
      ) : null}
      {!rows.length ? <p className="text-sm text-muted-foreground">Nothing yet. Questions the extension meets on a form show up here, or add one below.</p> : null}

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="block flex-1 text-xs font-semibold text-primary" htmlFor={`${id}-new`}>
          Add a question
          <input id={`${id}-new`} className={`${field} mt-1`} value={q} maxLength={MAX_QUESTION} onChange={(e) => setQ(e.target.value)} placeholder="Exactly as the form words it" />
        </label>
        <button type="button" onClick={add} disabled={!q.trim() || rows.length >= MAX_ENTRIES} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-primary disabled:opacity-50">Add</button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy || !stored} className="bg-brand-gradient rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">{busy ? 'Saving…' : 'Save these answers'}</button>
        {!stored ? <span className="text-xs text-muted-foreground">Saving these needs a database update (0046) that has not been applied yet.</span> : null}
        {note ? <span role="status" className="text-xs text-muted-foreground">{note}</span> : null}
      </div>
    </div>
  )
}
