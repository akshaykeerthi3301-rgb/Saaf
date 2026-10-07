'use client'

import { useState } from 'react'
import { Popover } from '@base-ui/react/popover'
import { Check, ExternalLink, Flag, Link2 } from 'lucide-react'
import { reportJob } from '@/app/actions/job-report'
import { JOB_REPORT_KINDS, publicJobUrl, type JobReportKind } from '@/lib/job-share'

/**
 * Share · Report a problem · Original posting (F-301, F-309). Three quiet icon
 * buttons in the panel header — the header already carries the apply actions.
 *
 * Share copies the PUBLIC page (`/jobs/<id>`), which opens without signing in,
 * and uses the phone's own share sheet where there is one. Report asks what is
 * wrong (one tap, optional note) and files it to `job_reports`.
 */
const icon = 'flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary'

export function JobActions({ roleId, applyUrl, title }: { roleId: string; applyUrl: string; title: string }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = publicJobUrl(window.location.origin, roleId)
    if (!url) return
    try {
      if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* cancelled share sheet, or no clipboard permission: nothing to report */ }
  }

  return (
    <div className="ml-auto flex items-center gap-0.5">
      <button type="button" onClick={share} className={icon} title={copied ? 'Link copied' : 'Copy a link to this job'} aria-label={copied ? 'Link copied' : 'Copy a link to this job'}>
        {copied ? <Check className="size-4 text-score-high" /> : <Link2 className="size-4" />}
      </button>
      <ReportJob roleId={roleId} />
      <a href={applyUrl} target="_blank" rel="noopener noreferrer" className={icon} title="Open the employer's original posting" aria-label="Open the employer's original posting">
        <ExternalLink className="size-4" />
      </a>
    </div>
  )
}

function ReportJob({ roleId }: { roleId: string }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<JobReportKind>()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string>()

  async function send() {
    if (!kind) { setError('Pick what is wrong.'); return }
    setBusy(true); setError(undefined)
    const res = await reportJob({ roleId, kind, note: note.trim() || undefined }).catch(() => ({ ok: false as const, error: 'That did not send — check your connection.' }))
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    setSent(true)
  }

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(undefined) }}>
      <Popover.Trigger className={`${icon} ${sent ? 'text-accent' : ''}`} title="Report a problem with this posting" aria-label="Report a problem with this posting">
        <Flag className="size-4" fill={sent ? 'currentColor' : 'none'} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="w-72 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-border bg-card p-4 shadow-sm outline-none">
            {sent ? (
              <>
                <Popover.Title className="text-sm font-semibold text-primary">Thank you</Popover.Title>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">We read these. A posting reported closed or fake is checked against the employer&apos;s board.</p>
              </>
            ) : (
              <>
                <Popover.Title className="text-sm font-semibold text-primary">What is wrong with this posting?</Popover.Title>
                <fieldset className="mt-3 space-y-1.5">
                  <legend className="sr-only">What is wrong with this posting?</legend>
                  {JOB_REPORT_KINDS.map((k) => (
                    <label key={k.kind} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-xs transition-colors ${kind === k.kind ? 'border-accent bg-accent/10 text-primary' : 'border-border text-muted-foreground hover:text-primary'}`}>
                      <input type="radio" name={`job-report-${roleId}`} checked={kind === k.kind} onChange={() => { setKind(k.kind); setError(undefined) }} className="accent-accent" />
                      {k.label}
                    </label>
                  ))}
                </fieldset>
                <textarea
                  aria-label="Anything to add — optional" placeholder="Anything to add — optional" value={note} maxLength={450} rows={2}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-input bg-card p-3 text-xs leading-5 text-primary outline-none placeholder:text-muted-foreground focus:border-accent"
                />
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Popover.Close className="rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-primary">Cancel</Popover.Close>
                  <button type="button" onClick={send} disabled={busy} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
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
