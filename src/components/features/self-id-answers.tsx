'use client'

import { useId, useState } from 'react'
import { saveSelfId } from '@/app/actions/self-id'
import { SELF_ID_FIELDS, type SelfIdAnswers } from '@/lib/self-id'

/**
 * "Questions only you can answer" — the lawful substitute for answering
 * demographic questions (F-602). Every question starts on "Prefer not to say",
 * which stores nothing; the extension fills only a question you have answered
 * here, with only your words. Own Save: nothing here moves a score, so it must
 * not re-run your matches the way the main Save does.
 */
export function SelfIdAnswers({ initial, stored }: { initial: SelfIdAnswers; stored: boolean }) {
  const id = useId()
  const [a, setA] = useState<Record<string, string>>({ ...initial })
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string>()

  async function save() {
    setBusy(true); setNote(undefined)
    const r = await saveSelfId(a).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
    setBusy(false)
    setNote(r.ok ? 'Saved. Questions left on “Prefer not to say” stay for you to answer.' : r.error)
  }

  const input = 'w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/10'

  return (
    <div className="mt-8 border-t border-border pt-6" data-testid="self-id">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Questions only you can answer</p>
      <p className="mb-4 mt-1 text-sm leading-6 text-muted-foreground">
        Some forms ask about gender, disability, caste or religion. Saaf never answers these for you and never guesses.
        If you want the extension to answer one, type your own answer here. Anything left on
        {' '}<span className="font-semibold text-primary">Prefer not to say</span>{' '}is left blank on the form for you. Stored
        privately, never scored, never shown to an employer by us, and filled only when you press Fill.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {SELF_ID_FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`${id}-${f.key}`} className="mb-1.5 block text-sm font-semibold text-primary">{f.label}</label>
            {f.kind === 'yesno' ? (
              <select id={`${id}-${f.key}`} value={a[f.key] ?? ''} onChange={(e) => setA({ ...a, [f.key]: e.target.value })} className={input}>
                <option value="">Prefer not to say</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            ) : (
              <>
                <input
                  id={`${id}-${f.key}`} value={a[f.key] ?? ''} maxLength={60} placeholder="Prefer not to say"
                  list={f.suggestions ? `${id}-${f.key}-list` : undefined}
                  onChange={(e) => setA({ ...a, [f.key]: e.target.value })} className={input}
                />
                {f.suggestions ? <datalist id={`${id}-${f.key}-list`}>{f.suggestions.map((s) => <option key={s} value={s} />)}</datalist> : null}
              </>
            )}
            {f.hint ? <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{f.hint}</p> : null}
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] leading-4 text-muted-foreground">
        Date of birth, age and pregnancy are never filled, whatever you enter anywhere.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy || !stored} className="bg-brand-gradient rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {busy ? 'Saving…' : 'Save these answers'}
        </button>
        {!stored ? <span className="text-xs text-muted-foreground">Saving these needs a database update (0038) that has not been applied yet.</span> : null}
        {note ? <span role="status" className="text-xs text-muted-foreground">{note}</span> : null}
      </div>
    </div>
  )
}
