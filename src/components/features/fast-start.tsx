'use client'

import { useId, useState } from 'react'
import { Zap } from 'lucide-react'
import { EMPTY_FAST, resumeFromAnswers, type FastAnswers } from '@/lib/fast-resume'

/**
 * "Build one in a minute" (F-507): a few boxes, then a plain résumé in the paste box for you to
 * read and edit before anything is scored. Every word in it is one you typed — Jobinko adds only a
 * one-line summary of your own title, years and skills, and a [bracketed prompt] where an
 * achievement is missing (src/lib/fast-resume.ts). Nothing leaves your device in this step.
 */
export function FastStart({ onText }: { onText: (text: string) => void }) {
  const id = useId()
  const [a, setA] = useState<FastAnswers>(EMPTY_FAST)
  const [note, setNote] = useState<string>()
  const set = (k: keyof FastAnswers) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setA((x) => ({ ...x, [k]: e.target.value }))
  const box = 'mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/10'
  const field = (k: keyof FastAnswers, label: string, ph = '', max = 120) => (
    <label className="block text-xs font-semibold text-primary" htmlFor={`${id}-${k}`}>
      {label}
      <input id={`${id}-${k}`} className={box} value={a[k]} onChange={set(k)} placeholder={ph} maxLength={max} />
    </label>
  )

  function build() {
    const r = resumeFromAnswers(a)
    if (!r.ok) { setNote(r.reason); return }
    onText(r.text)
    setNote('It is in the box below. Replace anything in [brackets], check the rest, then run the check.')
  }

  return (
    <details className="mt-4 rounded-2xl border border-border bg-card p-4 text-left" data-testid="fast-start">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-primary">
        <Zap className="size-4 text-accent" aria-hidden="true" /> No résumé yet? Build one in a minute
      </summary>
      {/* Not a <form>: this sits inside the checker's own form, and nesting one is invalid HTML. Enter must not run the check either. */}
      <div className="mt-3" onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault() }}>
        <p className="text-xs leading-5 text-muted-foreground">Answer what you can. Every word in the result is yours — Jobinko writes nothing for you and leaves a [prompt] wherever something is missing.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {field('name', 'Your name')}
          {field('targetRole', 'Role you want', 'Product Manager')}
          {field('email', 'Email')}
          {field('phone', 'Phone', '', 30)}
          {field('city', 'City', '', 80)}
          {field('years', 'Years of experience', '4', 4)}
        </div>
        <div className="mt-3">{field('skills', 'Skills, separated by commas', 'SQL, roadmapping, A/B testing', 400)}</div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-primary">Latest job</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {field('jobTitle', 'Title', 'Associate PM', 100)}
          {field('company', 'Company')}
          {field('dates', 'Dates', 'Jan 2021 – Present', 40)}
        </div>
        <label className="mt-3 block text-xs font-semibold text-primary" htmlFor={`${id}-ach`}>
          What did you do there? One thing per line, with a number if you have one
          <textarea id={`${id}-ach`} rows={4} className={box} value={a.achievements} onChange={set('achievements')} maxLength={2400} placeholder={'Shipped UPI autopay for 2M users\nCut churn 12% with a reminder flow'} />
        </label>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-primary">Education (optional)</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {field('degree', 'Degree', 'MBA', 100)}
          {field('school', 'School')}
          {field('gradYear', 'Year', '2021', 10)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={build} className="bg-brand-gradient rounded-xl px-4 py-2 text-sm font-semibold">Put it in the box</button>
          {note ? <span role="status" className="text-xs leading-5 text-primary">{note}</span> : null}
        </div>
      </div>
    </details>
  )
}
