'use client'

import { useState } from 'react'
import { Popover } from '@base-ui/react/popover'
import { Flag } from 'lucide-react'
import { reportRefusal, withdrawReport } from '@/app/actions/report-refusal'
import { track } from '@/lib/analytics'

/** One tap each. "Something else" plus the note covers what these miss. */
const REASONS = ['The score is too high', 'The score is too low', 'It misread the posting', 'Something else'] as const

/**
 * "This score looks wrong."
 *
 * The other half of success criterion 2, and the reason the report action and
 * the `refusal_reports` table were kept when the withheld section was orphaned.
 * A score that is too HIGH is the more dangerous error — a role the candidate
 * cannot get, presented as a strong fit, is the exact injury this product
 * exists to fix — so this sits on every card rather than only on weak ones.
 *
 * ⚠️ IT USED TO FILE ON THE FIRST TAP, WITH NO REASON AND NO WAY BACK
 * (docs/QA-AUDIT.md QA-14). A report with no reason is a defect ticket nobody
 * can triage, and a flag that files on a mis-tap — this button sits beside
 * Track on a phone — is noise in the one queue that is supposed to be signal.
 * It now asks what looks wrong (one tap, optional note) and can be withdrawn.
 * The action already accepted a note; the button never sent one.
 */
export function ReportScore({ gateResultId }: { gateResultId: string }) {
  const [open, setOpen] = useState(false)
  const [reported, setReported] = useState(false)
  const [reason, setReason] = useState<string>()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function send() {
    if (!reason) { setError('Pick what looks wrong.'); return }
    setBusy(true); setError(undefined)
    const res = await reportRefusal({ gateResultId, note: note.trim() ? `${reason}: ${note.trim()}` : reason })
      .catch(() => ({ ok: false as const }))
    setBusy(false)
    if (!res.ok) { setError('That did not send — check your connection.'); return }
    track('score_reported', { gate_result_id: gateResultId, reason })
    setReported(true)
  }

  async function withdraw() {
    setBusy(true); setError(undefined)
    const res = await withdrawReport({ gateResultId }).catch(() => ({ ok: false as const }))
    setBusy(false)
    if (!res.ok) { setError('That did not withdraw — check your connection.'); return }
    setReported(false); setReason(undefined); setNote(''); setOpen(false)
  }

  const label = reported ? 'Reported — open to withdraw' : 'This score looks wrong'

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        title={label}
        aria-label={label}
        className={`flex size-8 items-center justify-center rounded-lg hover:bg-secondary ${
          reported ? 'text-accent' : 'text-muted-foreground hover:text-primary'
        }`}
      >
        <Flag className="size-4" fill={reported ? 'currentColor' : 'none'} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} className="z-50">
          <Popover.Popup className="w-72 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-border bg-card p-4 shadow-sm outline-none">
            {reported ? (
              <>
                <Popover.Title className="text-sm font-semibold text-primary">Reported</Popover.Title>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  We triage these as defects in the scorer, not as feedback.
                </p>
                <button
                  type="button"
                  onClick={withdraw}
                  disabled={busy}
                  className="mt-3 text-xs font-semibold text-primary underline underline-offset-4 hover:text-accent disabled:opacity-50"
                >
                  {busy ? 'Withdrawing…' : 'Withdraw report'}
                </button>
              </>
            ) : (
              <>
                <Popover.Title className="text-sm font-semibold text-primary">What looks wrong?</Popover.Title>
                <fieldset className="mt-3 space-y-1.5">
                  <legend className="sr-only">What looks wrong?</legend>
                  {REASONS.map((r) => (
                    <label
                      key={r}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-xs transition-colors ${
                        reason === r ? 'border-accent bg-accent/10 text-primary' : 'border-border text-muted-foreground hover:text-primary'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`report-${gateResultId}`}
                        value={r}
                        checked={reason === r}
                        onChange={() => { setReason(r); setError(undefined) }}
                        className="accent-accent"
                      />
                      {r}
                    </label>
                  ))}
                </fieldset>
                <textarea
                  aria-label="Anything to add — optional"
                  placeholder="Anything to add — optional"
                  value={note}
                  maxLength={450}
                  rows={2}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-input bg-card p-3 text-xs leading-5 text-primary outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/10"
                />
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Popover.Close className="rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-primary">
                    Cancel
                  </Popover.Close>
                  <button
                    type="button"
                    onClick={send}
                    disabled={busy}
                    className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {busy ? 'Sending…' : 'Send report'}
                  </button>
                </div>
              </>
            )}
            {error ? <p role="status" className="mt-2 text-xs text-muted-foreground">{error}</p> : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
