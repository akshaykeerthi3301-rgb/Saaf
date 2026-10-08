'use client'

import { useState } from 'react'
import { Download, Puzzle, X } from 'lucide-react'

/**
 * The two install prompts, as small cards in the corner (F-1111, TASK-201). Which one may
 * appear, and when, is decided by the popup governor (src/lib/nudges.ts) — these only draw
 * what it chose. "Not now" pauses it; "Don't show again" is a no. Neither is a modal: the
 * page underneath stays usable.
 */
function Card({ icon: Icon, title, body, cta, onCta, onLater, onNever }: {
  icon: typeof Download; title: string; body: string; cta: string; onCta: () => void; onLater: () => void; onNever: () => void
}) {
  return (
    <div role="dialog" aria-label={title} className="fixed bottom-4 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-lg" data-testid="install-nudge">
      <button type="button" onClick={onNever} aria-label="Don’t show this again" className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-primary"><X className="size-3.5" /></button>
      <p className="flex items-center gap-2 pr-6 text-sm font-semibold text-primary"><Icon className="size-4 text-accent" aria-hidden="true" />{title}</p>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{body}</p>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={onCta} className="bg-brand-gradient rounded-xl px-3.5 py-1.5 text-xs font-semibold">{cta}</button>
        <button type="button" onClick={onLater} className="text-xs font-semibold text-muted-foreground hover:text-primary">Not now</button>
      </div>
    </div>
  )
}

export function InstallAppCard({ onInstall, onLater, onNever }: { onInstall: () => void; onLater: () => void; onNever: () => void }) {
  return <Card icon={Download} title="Add Saaf to your home screen" body="Open your feed in its own window, one tap away. It is the same site — nothing extra is installed or stored." cta="Install" onCta={onInstall} onLater={onLater} onNever={onNever} />
}

export function InstallExtensionCard({ href, onLater, onNever }: { href: string; onLater: () => void; onNever: () => void }) {
  return (
    <Card
      icon={Puzzle} title="Fill applications from Saaf"
      body="The Saaf browser extension fills the application form from your profile, shows your match on any job page, and puts what you apply to on your tracker. It reads only the page you are on."
      cta="Get the extension" onCta={() => { window.open(href, '_blank', 'noopener,noreferrer'); onNever() }} onLater={onLater} onNever={onNever}
    />
  )
}

/** The one-question survey card (F-1107). The question and options live in src/lib/surveys.ts. */
export function SurveyCard({ question, options, noteLabel, onAnswer, onLater, onNever }: {
  question: string; options: readonly string[]; noteLabel: string
  onAnswer: (answer: string, note: string) => Promise<boolean>; onLater: () => void; onNever: () => void
}) {
  const [note, setNote] = useState('')
  const [picked, setPicked] = useState<string>()
  const [state, setState] = useState<'ask' | 'sending' | 'thanks' | 'failed'>('ask')
  async function send(answer: string) {
    setPicked(answer); setState('sending')
    setState((await onAnswer(answer, note)) ? 'thanks' : 'failed')
  }
  return (
    <div role="dialog" aria-label="A quick question" className="fixed bottom-4 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-lg" data-testid="survey-card">
      <button type="button" onClick={onNever} aria-label="Don’t ask me this" className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-primary"><X className="size-3.5" /></button>
      {state === 'thanks' ? (
        <>
          <p className="pr-6 text-sm font-semibold text-primary">Thank you.</p>
          <button type="button" onClick={onNever} className="mt-3 text-xs font-semibold text-muted-foreground hover:text-primary">Close</button>
        </>
      ) : (
        <>
          <p className="pr-6 text-sm font-semibold text-primary">{question}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {options.map((o) => (
              <button key={o} type="button" disabled={state === 'sending'} onClick={() => send(o)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${picked === o ? 'border-accent bg-accent/10 text-primary' : 'border-border text-muted-foreground hover:border-accent/60 hover:text-primary'}`}>{o}</button>
            ))}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} aria-label={noteLabel} placeholder={noteLabel} className="mt-3 w-full rounded-xl border border-input bg-background p-2.5 text-xs leading-5 text-primary outline-none placeholder:text-muted-foreground focus:border-accent" />
          {state === 'failed' ? <p role="status" className="mt-2 text-xs text-muted-foreground">That did not send. You can try again, or close this.</p> : null}
          <button type="button" onClick={onLater} className="mt-2 text-xs font-semibold text-muted-foreground hover:text-primary">Not now</button>
        </>
      )}
    </div>
  )
}
