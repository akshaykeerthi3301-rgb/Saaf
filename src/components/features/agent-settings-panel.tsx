'use client'

import { useId, useState } from 'react'
import { saveAgentSettings } from '@/app/actions/agent'
import { MIN_SCORES, MODES, TARGETS, type AgentMode, type AgentSettings } from '@/lib/agent'

/**
 * The agent's mode, weekly target and minimum score (F-706/707). It adds to the Apply-for-me queue and
 * nothing more: an application goes out only when you have switched "Apply for me" on in the extension and
 * pressed Start there (extension/autoapply.js). Own Save — nothing here moves a score.
 */
export function AgentSettingsPanel({ initial, stored }: { initial: AgentSettings; stored: boolean }) {
  const id = useId()
  const [mode, setMode] = useState<AgentMode>(initial.mode)
  const [target, setTarget] = useState(initial.weeklyTarget)
  const [min, setMin] = useState(initial.minScore)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string>()
  const field = 'w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/10'

  async function save() {
    setBusy(true); setNote(undefined)
    const r = await saveAgentSettings({ mode, weeklyTarget: target, minScore: min }).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
    setBusy(false)
    setNote(r.ok ? 'Saved.' : r.error)
  }

  return (
    <div className="mt-8 border-t border-border pt-6" data-testid="agent-settings">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Your job-search agent</p>
      <p className="mb-4 mt-1 text-sm leading-6 text-muted-foreground">
        The agent only adds roles to your Apply-for-me queue — and only Easy-apply roles, never one you have already tracked or hidden. It never submits anything:
        that happens only when you switch “Apply for me” on in the extension and press Start, and never past a CAPTCHA or with a guessed answer.
      </p>
      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-primary">Mode</legend>
        <div className="space-y-2">
          {MODES.map((m) => (
            <label key={m.value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-sm has-[:checked]:border-accent/60 has-[:checked]:bg-accent/5">
              <input type="radio" name={`${id}-mode`} value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} className="mt-1" />
              <span><span className="font-semibold text-primary">{m.label}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{m.help}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-primary" htmlFor={`${id}-t`}>
          Applications a week I am aiming for
          <select id={`${id}-t`} className={`${field} mt-1`} value={target} onChange={(e) => setTarget(Number(e.target.value))}>
            {TARGETS.map((t) => <option key={t} value={t}>{t === 0 ? 'No target' : t}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold text-primary" htmlFor={`${id}-m`}>
          Only roles scoring
          <select id={`${id}-m`} className={`${field} mt-1`} value={min} onChange={(e) => setMin(Number(e.target.value))}>
            {MIN_SCORES.map((m) => <option key={m} value={m}>{m} or above</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy || !stored} className="bg-brand-gradient rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">{busy ? 'Saving…' : 'Save agent settings'}</button>
        {!stored ? <span className="text-xs text-muted-foreground">Saving these needs a database update (0048) that has not been applied yet.</span> : null}
        {note ? <span role="status" className="text-xs text-muted-foreground">{note}</span> : null}
      </div>
    </div>
  )
}
