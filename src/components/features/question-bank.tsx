'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Users } from 'lucide-react'
import { addInterviewQuestion, removeInterviewQuestion } from '@/app/actions/question-bank'
import type { BankQuestion } from '@/lib/services/question-bank'

const KINDS: [string, string][] = [['behavioural', 'Behavioural'], ['technical', 'Technical'], ['case', 'Case'], ['hr', 'HR'], ['other', 'Other']]

/** Questions other candidates reported being asked at this company, and a form to add yours. */
export function QuestionBank({ company, roleTitle, questions, stored, locked = false }: { company: string; roleTitle: string; questions: BankQuestion[]; stored: boolean; locked?: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [kind, setKind] = useState('behavioural')
  const [askedIn, setAskedIn] = useState('')
  const [note, setNote] = useState<string>()
  const input = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-primary outline-none focus:border-accent'

  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
        <Users className="size-3.5 text-accent" /> Asked at {company} — reported by candidates
      </h2>
      {questions.length ? (
        <ul className="mt-3 space-y-2">
          {questions.map((q) => (
            <li key={q.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm leading-6 text-primary">{q.question}</p>
              <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="capitalize">{q.kind}</span>
                {q.roleTitle ? <span>· {q.roleTitle}</span> : null}
                {q.askedIn ? <span>· asked {q.askedIn.slice(0, 7)}</span> : null}
                {q.mine ? (
                  <button type="button" className="ml-auto inline-flex items-center gap-1 hover:text-primary" onClick={() => start(async () => { await removeInterviewQuestion({ id: q.id }); router.refresh() })}>
                    <Trash2 className="size-3" /> Remove mine
                  </button>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          No one has reported a question from {company} yet. The bank only holds questions candidates were actually asked — none are made up — so it grows as people add theirs.
        </p>
      )}
      {!stored ? <p className="mt-2 text-xs text-muted-foreground">The question bank needs a database update (0031) that has not been applied yet.</p> : null}
      {locked ? <p role="note" className="mt-2 text-xs leading-5 text-muted-foreground">The questions for {company} are part of a plan, or a pass. You can still add the questions you were asked.</p> : null}

      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
          <Plus className="size-3.5" /> Add a question you were asked at {company}
        </button>
      ) : (
        <form
          className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              const r = await addInterviewQuestion({ company, roleTitle, kind: kind as 'behavioural', question, askedIn: askedIn || null })
                .catch(() => ({ ok: false as const, error: 'Check your connection.' }))
              if (!r.ok) { setNote(r.error); return }
              setQuestion(''); setOpen(false); setNote('Thanks — added. Your name is never shown.'); router.refresh()
            })
          }}
        >
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} maxLength={600} aria-label="The question" placeholder="The question, as close to word for word as you remember" className={input} />
          <div className="flex flex-wrap gap-2">
            <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind of question" className={`${input} sm:w-44`}>
              {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input type="month" value={askedIn} onChange={(e) => setAskedIn(e.target.value)} aria-label="When you were asked" className={`${input} sm:w-44`} />
            <button type="submit" disabled={pending} className="bg-brand-gradient rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50">Add question</button>
            <button type="button" onClick={() => setOpen(false)} className="px-2 text-xs text-muted-foreground">Cancel</button>
          </div>
          <p className="text-[11px] text-muted-foreground">Only the question, its kind and the month are shown — never who reported it.</p>
        </form>
      )}
      {note ? <p role="status" className="mt-2 text-xs text-primary">{note}</p> : null}
    </section>
  )
}
