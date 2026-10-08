'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowRight, Mic, Send } from 'lucide-react'
import { askSaaf } from '@/app/actions/assistant'
import { PROMPTS, type Answer, type Card, type QueueItem } from '@/lib/assistant'
import { askExtension } from '@/lib/extension-client'
import { confirmAutoQueued } from '@/app/actions/agent'
import { listenOnce, speechSupported } from '@/lib/voice-input'

/**
 * "Ask Saaf" — questions about your own shortlist and tracker, answered from your own
 * rows (src/lib/assistant.ts says why there is no model and no character). Answers are
 * typed cards, not prose: a stat, a few roles with their scores, a link. The mic fills
 * the box and sends nothing — you read what was heard first.
 */
type Turn = { q: string; a: Answer | { error: string } }

export function AskSaaf() {
  const [text, setText] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [pending, start] = useTransition()
  const [listening, setListening] = useState(false)
  const [voiceNote, setVoiceNote] = useState<string>()
  const [canSpeak, setCanSpeak] = useState(false)
  const stop = useRef<(() => void) | null>(null)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a browser capability can only be read once mounted
    setCanSpeak(speechSupported())
  }, [])
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'nearest' }) }, [turns, pending])

  function ask(q: string) {
    const question = q.trim()
    if (!question || pending) return
    setText('')
    start(async () => {
      const r = await askSaaf({ question }).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
      setTurns((t) => [...t, { q: question, a: r.ok ? r.answer : { error: r.error } }])
    })
  }

  function toggleVoice() {
    if (listening) { stop.current?.(); return }
    setVoiceNote(undefined)
    const s = listenOnce({ onText: setText, onEnd: () => { setListening(false); stop.current = null }, onError: setVoiceNote })
    if (s) { stop.current = s; setListening(true) }
  }

  return (
    <section aria-label="Ask Saaf" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" data-testid="ask-saaf">
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Ask Saaf</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Questions about your own shortlist and tracker, answered from your own data. It does not guess at anything else.
      </p>

      <div className="mt-4 space-y-4" aria-live="polite">
        {turns.map((t, i) => (
          <div key={i} className="space-y-2">
            <p className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-secondary px-3.5 py-2 text-sm text-primary">{t.q}</p>
            {'error' in t.a ? (
              <p role="status" className="max-w-[90%] rounded-2xl border border-border px-3.5 py-2 text-sm text-muted-foreground">{t.a.error}</p>
            ) : (
              t.a.cards.map((c, j) => <CardView key={j} card={c} ask={ask} />)
            )}
          </div>
        ))}
        {pending ? <p className="text-xs text-muted-foreground">Reading your shortlist…</p> : null}
        <div ref={end} />
      </div>

      {turns.length === 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {PROMPTS.map((p) => (
            <button key={p.label} type="button" onClick={() => ask(p.q)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-accent/60 hover:text-primary">
              {p.label}
            </button>
          ))}
        </div>
      ) : null}

      <form className="mt-4 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); ask(text) }}>
        <input
          value={text} onChange={(e) => setText(e.target.value)} maxLength={300} aria-label="Ask a question about your shortlist"
          placeholder="e.g. What needs a follow-up?"
          className="min-w-0 flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm text-primary outline-none placeholder:text-muted-foreground focus:border-accent"
        />
        {canSpeak ? (
          <button
            type="button" onClick={toggleVoice} aria-pressed={listening} aria-label={listening ? 'Stop listening' : 'Ask by voice'}
            title={listening ? 'Listening… tap to stop' : 'Say it. Your browser’s speech service hears the audio, not Saaf; the words land here for you to check.'}
            className={`rounded-full border border-border p-2.5 ${listening ? 'animate-pulse text-accent' : 'text-muted-foreground hover:text-primary'}`}
          >
            <Mic className="size-4" />
          </button>
        ) : null}
        <button type="submit" disabled={pending || !text.trim()} aria-label="Send" className="bg-brand-gradient rounded-full p-2.5 disabled:opacity-50"><Send className="size-4" /></button>
      </form>
      {voiceNote ? <p role="status" className="mt-2 text-xs text-muted-foreground">{voiceNote}</p> : null}
    </section>
  )
}

function CardView({ card, ask }: { card: Card; ask: (q: string) => void }) {
  if (card.type === 'text') return <p className="max-w-[90%] rounded-2xl border border-border px-3.5 py-2 text-sm leading-6 text-muted-foreground">{card.text}</p>
  if (card.type === 'stat') {
    return (
      <div className="max-w-[90%] rounded-2xl border border-border px-3.5 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{card.label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-[-0.03em] text-primary">{card.value}</p>
        {card.note ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{card.note}</p> : null}
      </div>
    )
  }
  if (card.type === 'progress') {
    const pct = card.target > 0 ? Math.min(100, Math.round((card.done / card.target) * 100)) : 0
    return (
      <div className="max-w-[90%] rounded-2xl border border-border px-3.5 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">This week</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-[-0.03em] text-primary">{card.done}{card.target > 0 ? <span className="text-base text-muted-foreground"> of {card.target}</span> : null}</p>
        {card.target > 0 ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={card.done} aria-valuemin={0} aria-valuemax={card.target}><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, pct)}%` }} /></div> : null}
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{card.line}</p>
      </div>
    )
  }
  if (card.type === 'queue') return <QueueCard card={card} />
  if (card.type === 'link') {
    return <Link href={card.href} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-accent">{card.label}<ArrowRight className="size-3.5" /></Link>
  }
  if (card.type === 'help') {
    return (
      <div className="flex max-w-[90%] flex-wrap gap-1.5">
        {card.prompts.map((label) => {
          const p = PROMPTS.find((x) => x.label === label)
          return <button key={label} type="button" onClick={() => ask(p?.q ?? label)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-accent/60 hover:text-primary">{label}</button>
        })}
      </div>
    )
  }
  return (
    <div className="max-w-[95%] rounded-2xl border border-border px-3.5 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{card.title}</p>
      <ul className="mt-2 divide-y divide-border">
        {card.items.map((r) => (
          <li key={r.id}>
            <Link href={`/today?role=${r.id}`} className="flex items-center gap-3 py-2 hover:text-accent">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-primary">{r.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{r.company}{r.note ? ` · ${r.note}` : ''}</span>
              </span>
              <span className="font-mono text-sm tabular-nums text-primary">{r.score}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href={card.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-accent">
        {card.more ? `${card.more} — ` : ''}See them on your feed<ArrowRight className="size-3.5" />
      </Link>
    </div>
  )
}

/**
 * A batch the agent proposes (F-708). The button only QUEUES the roles in the extension; submitting is the
 * extension's job, and only after the candidate has switched it on and pressed Start there.
 */
export function QueueCard({ card }: { card: Extract<Card, { type: 'queue' }> }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [note, setNote] = useState<string>()
  async function add() {
    setState('busy'); setNote(undefined)
    const jobs = card.items.map((i: QueueItem) => ({ url: i.url, title: i.title, company: i.company }))
    const r = await askExtension<{ ok: boolean; queued: number; enabled: boolean }>({ type: 'saaf:autoapply-add', jobs })
    if (!r?.ok) { setState('idle'); setNote('Queueing needs the Saaf browser extension (version 0.5 or later) in this browser.'); return }
    await confirmAutoQueued(card.items.map((i) => i.roleId)).catch(() => null)
    setState('done')
    setNote(r.enabled ? `Queued (${r.queued} waiting). Press Start in the Saaf extension to apply.` : `Queued (${r.queued} waiting). Switch on “Apply for me” in the Saaf extension, then press Start.`)
  }
  return (
    <div className="max-w-[95%] rounded-2xl border border-border px-3.5 py-3" data-testid="queue-card">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{card.title}</p>
      <ul className="mt-2 divide-y divide-border">
        {card.items.map((r) => (
          <li key={r.roleId} className="flex items-center gap-3 py-2">
            <span className="min-w-0 flex-1">
              <Link href={`/today?role=${r.roleId}`} className="block truncate text-sm font-medium text-primary hover:text-accent">{r.title}</Link>
              <span className="block truncate text-xs text-muted-foreground">{r.company} · <Link href={`/resume/tailor?role=${r.roleId}`} className="underline underline-offset-2 hover:text-primary">Tailor your résumé first</Link></span>
            </span>
            <span className="font-mono text-sm tabular-nums text-primary">{r.score}</span>
          </li>
        ))}
      </ul>
      {card.note ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{card.note}</p> : null}
      <button type="button" onClick={add} disabled={state !== 'idle'} className="bg-brand-gradient mt-3 rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-60">
        {state === 'busy' ? 'Queueing…' : state === 'done' ? 'Queued' : `Add ${card.items.length} to my Apply-for-me queue`}
      </button>
      {note ? <p role="status" className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p> : null}
    </div>
  )
}
