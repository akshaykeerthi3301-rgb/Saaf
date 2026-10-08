'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { Check, Copy, ExternalLink, Search, Loader2, Mail, ShieldCheck, Sparkles, UserRound, Users, Briefcase } from 'lucide-react'
import { writeOutreach } from '@/app/actions/copilot-tools'
import {
  CONTACTS, fillVariables, LINKEDIN_NOTE_MAX, unfilledTags, type ContactKey, type OutreachMessage, type Variable,
} from '@/lib/copilot-templates'

/**
 * Insider networking & recruiter outreach.
 *
 * WHO, not a list of names: we hold no people data and will not scrape it
 * (LinkedIn/Naukri are excluded for their terms of service, PROJECT-STATE).
 * Each contact TYPE gets a "Find on LinkedIn" link that opens LinkedIn's own
 * people search in the candidate's browser — they choose the person — and a
 * connection note plus an email written for that type.
 *
 * Jobinko sends nothing. Copy, or open the draft in the candidate's own mail app.
 */

const ICON: Record<ContactKey, typeof UserRound> = { recruiter: Users, manager: Briefcase, peer: UserRound }

const SEARCH: Record<ContactKey, string> = {
  recruiter: 'recruiter OR talent acquisition',
  manager: 'hiring manager OR head',
  peer: '',
}

export function OutreachStudio({
  roleId, company, roleTitle, initial, defaults,
}: {
  roleId: string
  company: string
  roleTitle: string
  initial: OutreachMessage[]
  defaults: Partial<Record<Variable, string>>
}) {
  const [messages, setMessages] = useState(initial)
  const [values, setValues] = useState<Partial<Record<Variable, string>>>(defaults)
  const [source, setSource] = useState('Template')
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()

  function generate() {
    setError(undefined)
    start(async () => {
      const r = await writeOutreach({ roleId }).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
      if (!r.ok) { setError(r.error); return }
      setMessages(r.messages)
      setSource(r.providerLabel ? `Drafted by ${r.providerLabel}` : 'Template (the writing model was unavailable)')
    })
  }

  const update = (contact: ContactKey, patch: Partial<OutreachMessage>) =>
    setMessages((ms) => ms.map((m) => (m.contact === contact ? { ...m, ...patch } : m)))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        {(['Your Name', 'Key Project'] as Variable[]).map((v) => (
          <label key={v} className="min-w-48 flex-1">
            <span className="font-mono text-[11px] text-accent">[{v}]</span>
            <input
              value={values[v] ?? ''}
              onChange={(e) => setValues((x) => ({ ...x, [v]: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-primary outline-none focus:border-accent"
            />
          </label>
        ))}
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="bg-brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {pending ? 'Writing…' : 'Write all three with AI'}
        </button>
        <span className="text-[11px] text-muted-foreground">{source}</span>
        {error ? <p className="w-full text-xs text-muted-foreground">{error}</p> : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {CONTACTS.map((c) => {
          const m = messages.find((x) => x.contact === c.key)!
          const Icon = ICON[c.key]
          const note = fillVariables(m.note, values)
          const email = fillVariables(m.email, values)
          const subject = fillVariables(m.subject, values)
          const search = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${company} ${SEARCH[c.key]}`.trim())}`
          return (
            <article key={c.key} className="glow-hover flex flex-col rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <span className="bg-brand-gradient flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-primary">{c.label}</h3>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{c.why}</p>
                </div>
              </div>
              <a
                href={search}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-accent underline underline-offset-4"
              >
                <Search className="size-3.5" /> Find them on LinkedIn <ExternalLink className="size-3" />
              </a>

              <Field
                label="LinkedIn note"
                count={`${note.length}/${LINKEDIN_NOTE_MAX}`}
                over={note.length > LINKEDIN_NOTE_MAX}
                copyText={note}
              >
                <textarea
                  value={m.note}
                  onChange={(e) => update(c.key, { note: e.target.value })}
                  rows={5}
                  aria-label={`LinkedIn note to the ${c.label}`}
                  className="w-full rounded-lg border border-input bg-background p-3 text-sm leading-6 text-primary outline-none focus:border-accent"
                />
              </Field>

              <Field label="Email" copyText={`${subject}\n\n${email}`}>
                <input
                  value={m.subject}
                  onChange={(e) => update(c.key, { subject: e.target.value })}
                  aria-label={`Email subject to the ${c.label}`}
                  className="mb-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold text-primary outline-none focus:border-accent"
                />
                <textarea
                  value={m.email}
                  onChange={(e) => update(c.key, { email: e.target.value })}
                  rows={9}
                  aria-label={`Email to the ${c.label}`}
                  className="w-full rounded-lg border border-input bg-background p-3 text-sm leading-6 text-primary outline-none focus:border-accent"
                />
              </Field>

              {unfilledTags(`${note} ${email}`).length ? (
                <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                  Fill before sending: {unfilledTags(`${note} ${email}`).map((t) => `[${t}]`).join(', ')}
                </p>
              ) : null}

              <a
                href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(email)}`}
                className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 pt-2.5 text-xs font-semibold text-primary hover:border-accent/60"
              >
                <Mail className="size-3.5" /> Open in my email app
              </a>
            </article>
          )
        })}
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-accent" />
        Written about {roleTitle} at {company}. AI drafts are checked against your profile; nothing is ever sent by Jobinko.
      </p>
    </div>
  )
}

function Field({
  label, count, over, copyText, children,
}: { label: string; count?: string; over?: boolean; copyText: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        <span className="flex items-center gap-2">
          {count ? <span className={`font-mono text-[10px] tabular-nums ${over ? 'text-score-low' : 'text-muted-foreground'}`}>{count}</span> : null}
          <button
            type="button"
            onClick={async () => { await navigator.clipboard.writeText(copyText); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground hover:bg-secondary hover:text-primary"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </span>
      </div>
      {children}
    </div>
  )
}
