'use client'

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import { AlertCircle, Check, Copy, FileDown, FileText, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { writeCoverLetter } from '@/app/actions/copilot-tools'
import {
  coverLetterTemplate, fillVariables, TONES, unfilledTags, VARIABLES, type Tone, type Variable,
} from '@/lib/copilot-templates'
import type { CandidateFacts } from '@/lib/tailor'

/**
 * AI Cover Letter Studio.
 *
 *   left   tone, the variables panel, and "Write with AI"
 *   right  the editor (raw text, tags and all) over a live preview with the
 *          variables filled in — both update on every keystroke
 *
 * It opens on the no-model template for the chosen tone, so the studio is
 * useful before (and without) a model call. Unfilled [Tags] are highlighted in
 * the preview and named before copying; a letter that goes out saying
 * "[Key Project]" is worse than no letter.
 */

const TONE_NOTE: Record<Tone, string> = {
  Professional: 'Measured, courteous, complete sentences.',
  Direct: 'Short. Leads with the fit.',
  Consultative: 'Frames the team’s problems and your approach.',
  'High-Impact': 'Confident and energetic — still only true claims.',
}

export function CoverLetterStudio({
  roleId, me, defaults,
}: {
  roleId: string
  me: CandidateFacts
  defaults: Partial<Record<Variable, string>>
}) {
  const [tone, setTone] = useState<Tone>('Professional')
  const [text, setText] = useState(() => coverLetterTemplate(me, 'Professional'))
  const [values, setValues] = useState<Partial<Record<Variable, string>>>(defaults)
  const [source, setSource] = useState<string>('Template')
  const [dropped, setDropped] = useState<{ text: string; reason: string }[]>([])
  const [error, setError] = useState<string>()
  const [copied, setCopied] = useState(false)
  const [pending, start] = useTransition()

  const filled = useMemo(() => fillVariables(text, values), [text, values])
  const missing = useMemo(() => unfilledTags(filled), [filled])

  function pickTone(t: Tone) {
    setTone(t)
    // Switching tone before any AI draft swaps the template; after one, it
    // only changes what the next "Write with AI" asks for.
    if (source === 'Template') setText(coverLetterTemplate(me, t))
  }

  function generate() {
    setError(undefined)
    start(async () => {
      const r = await writeCoverLetter({ roleId, tone }).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
      if (!r.ok) { setError(r.error); return }
      setText(r.text)
      setDropped(r.dropped)
      setSource(r.providerLabel ? `Drafted by ${r.providerLabel}` : 'Template (the writing model was unavailable)')
    })
  }

  async function copy() {
    await navigator.clipboard.writeText(filled)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  async function download(kind: 'docx' | 'txt') {
    const name = `Cover letter — ${values.Role ?? 'role'}${values.Company ? ` — ${values.Company}` : ''}`.replace(/[\\/:*?"<>|]/g, '')
    let blob: Blob
    if (kind === 'txt') {
      blob = new Blob([filled], { type: 'text/plain;charset=utf-8' })
    } else {
      const { Document, Packer, Paragraph, TextRun } = await import('docx')
      const doc = new Document({
        sections: [{
          children: filled.split('\n').map((line) => new Paragraph({ children: [new TextRun({ text: line, size: 22 })], spacing: { after: line ? 120 : 0 } })),
        }],
      })
      blob = await Packer.toBlob(doc)
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}.${kind}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="space-y-5">
        <Panel title="Tone">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tone">
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tone === t}
                onClick={() => pickTone(t)}
                className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${
                  tone === t ? 'bg-brand-gradient border-transparent' : 'border-border bg-background text-primary hover:border-accent/60'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{TONE_NOTE[tone]}</p>
        </Panel>

        <Panel title="Variables">
          <div className="space-y-2.5">
            {VARIABLES.filter((v) => v !== 'Name').map((v) => (
              <label key={v} className="block">
                <span className="font-mono text-[11px] text-accent">[{v}]</span>
                <input
                  value={values[v] ?? ''}
                  onChange={(e) => setValues((x) => ({ ...x, [v]: e.target.value }))}
                  placeholder={v === 'Key Project' ? 'e.g. the onboarding revamp' : v === 'Hiring Manager' ? 'Hiring Manager' : ''}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-primary outline-none focus:border-accent"
                />
              </label>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
            Anything we could not know — a project, who will read it — is a tag for you to fill.
          </p>
        </Panel>

        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="bg-brand-gradient flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {pending ? 'Writing…' : `Write with AI · ${tone}`}
        </button>
        {error ? <p className="text-xs text-muted-foreground">{error}</p> : null}
      </aside>

      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground">
            <FileText className="size-3" /> {source}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Action onClick={copy} icon={copied ? Check : Copy}>{copied ? 'Copied' : 'Copy'}</Action>
            <Action onClick={() => download('docx')} icon={FileDown}>Word</Action>
            <Action onClick={() => download('txt')} icon={FileDown}>Text</Action>
          </div>
        </div>

        {missing.length ? (
          <p className="flex items-start gap-2 rounded-xl border border-score-mid/40 bg-score-mid/10 p-3 text-xs leading-5 text-primary">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-score-mid" />
            Still to fill before you send: {missing.map((m) => `[${m}]`).join(', ')}.
          </p>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Editor">
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); if (source === 'Template') setSource('Template, edited') }}
              rows={20}
              aria-label="Cover letter text"
              className="w-full resize-y rounded-xl border border-input bg-background p-4 font-mono text-[13px] leading-6 text-primary outline-none focus:border-accent"
            />
          </Panel>
          <Panel title="Live preview">
            <div className="min-h-[30rem] whitespace-pre-wrap rounded-xl bg-paper p-5 text-sm leading-6 text-paper-ink">
              {highlightTags(filled)}
            </div>
          </Panel>
        </div>

        {dropped.length || source.startsWith('Drafted') ? (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-primary">
              <ShieldCheck className="size-3.5 text-accent" />
              Every sentence was checked against your profile before you saw it.
            </p>
            {dropped.length ? (
              <details className="mt-2">
                <summary className="cursor-pointer list-none text-xs font-semibold text-muted-foreground hover:text-primary">
                  {dropped.length} paragraph{dropped.length === 1 ? ' was' : 's were'} removed — see what and why
                </summary>
                <ul className="mt-2 space-y-2">
                  {dropped.map((d, i) => (
                    <li key={i} className="rounded-lg bg-secondary/60 p-3 text-xs leading-5 text-muted-foreground">
                      <span className="line-through">{d.text}</span>
                      <span className="mt-1 block text-primary">Removed: {d.reason}.</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}

/** Unfilled tags stand out in the preview. Text nodes only. */
function highlightTags(text: string): ReactNode {
  return text.split(/(\[[^\]\n]{1,40}\])/g).map((part, i) =>
    /^\[[^\]]+\]$/.test(part) ? (
      <mark key={i} className="rounded bg-score-mid/25 px-1 font-semibold text-paper-ink">{part}</mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}

function Action({ onClick, icon: Icon, children }: { onClick: () => void; icon: typeof Copy; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-primary hover:border-accent/60"
    >
      <Icon className="size-3.5" />
      {children}
    </button>
  )
}
