'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Briefcase, Calendar, ExternalLink, Loader2, MapPin, Signal, Wallet, Wifi, X } from 'lucide-react'
import { useFeed } from '@/components/features/feed-selection'
import { AiToolsRail } from '@/components/features/job-tools'
import { CompanyTab, DescriptionTab, ScoreCard, useIsDesktop } from '@/components/features/job-panel'
import { QuickApply } from '@/components/features/quick-apply'
import { TrackRole } from '@/components/features/track-role'
import { HideRole } from '@/components/features/feed-controls'
import { isEarlyPosting } from '@/lib/job-facts'
import { postedAgo } from '@/lib/day'
import type { JobInsight } from '@/lib/services/job-insight'

/**
 * The feed's two states, as in the reference product: the LIST (cards in the centre, a quiet sidebar on the right)
 * and the JOB (its detail replaces the list in the centre, the AI tools replace the sidebar). Opening a job never
 * leaves the page; the X, or Escape, brings the list back where it was.
 *
 * Below xl nothing here changes: the phone keeps its full-screen sheet (JobSheet in job-panel.tsx).
 */

export function JobsStage({ children }: { children: ReactNode }) {
  const { selection, close } = useFeed()
  const desktop = useIsDesktop()
  const open = selection.opened && !!selection.roleId && desktop
  const scrollBack = useRef(0)
  const wasOpen = useRef(false)

  // Remember where the list was, and put the reader back there.
  useEffect(() => {
    if (open && !wasOpen.current) { scrollBack.current = window.scrollY; window.scrollTo(0, 0) }
    if (!open && wasOpen.current) window.scrollTo(0, scrollBack.current)
    wasOpen.current = open
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  return (
    <>
      <div className={open ? 'hidden' : undefined}>{children}</div>
      {open ? <JobDetailView /> : null}
    </>
  )
}

/** The right column: the sidebar while browsing, the AI tools while a job is open. */
export function JobRail({ idle }: { idle: ReactNode }) {
  const { selection, current } = useFeed()
  const desktop = useIsDesktop()
  if (!(selection.opened && selection.roleId && desktop)) return <div className="p-5">{idle}</div>
  const title = current.status === 'done' && current.result.ok ? current.result.insight.title : ''
  return <AiToolsRail roleId={selection.roleId} title={title} />
}

function Fact({ icon: Icon, children }: { icon: typeof MapPin; children: ReactNode }) {
  return <li className="flex items-center gap-2.5 text-sm text-primary"><Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />{children}</li>
}

const WORK_MODE = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' } as const
const EMPLOYMENT = { fulltime: 'Full-time', parttime: 'Part-time', contract: 'Contract', intern: 'Internship', temporary: 'Temporary' } as const

function JobDetailView() {
  const { current, close } = useFeed()
  const [tab, setTab] = useState<'overview' | 'company'>('overview')

  if (current.status !== 'done') {
    return <p className="flex items-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Reading this posting against your profile…</p>
  }
  if (!current.result.ok) {
    return (
      <div className="p-10 text-sm text-muted-foreground">
        {current.result.error}
        <button type="button" onClick={close} className="ml-3 font-semibold text-primary underline underline-offset-4">Back to the list</button>
      </div>
    )
  }
  const j: JobInsight = current.result.insight
  const posted = postedAgo(j.postedAt)
  const skills = [...j.analysis.matched.map((t) => ({ t, has: true })), ...j.analysis.missing.map((m) => ({ t: m.term, has: false }))].slice(0, 24)

  return (
    <div className="mx-auto max-w-[940px] px-5 pb-20 sm:px-8" data-testid="job-detail">
      <div className="sticky top-14 z-10 -mx-5 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <button type="button" onClick={close} aria-label="Back to the list" className="rounded-xl border border-border p-2 text-primary hover:bg-secondary"><X className="size-4" /></button>
        {isEarlyPosting(j.postedAt) ? <span className="rounded-lg bg-score-high/10 px-2.5 py-1 text-xs font-semibold text-score-high">Early applicant</span> : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <HideRole roleId={j.roleId} />
          <TrackRole roleId={j.roleId} company={j.company} title={j.title} applyUrl={j.applyUrl} trackedStatus={j.trackedStatus ?? undefined} />
          <QuickApply roleId={j.roleId} company={j.company} title={j.title} applyUrl={j.applyUrl} easy={j.easyApply} size="lg" />
        </div>
      </div>

      <div className="flex items-center gap-6 border-b border-border" role="tablist" aria-label="Job details">
        {([['overview', 'Overview'], ['company', 'Company']] as const).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`relative py-3.5 text-sm font-semibold transition-colors ${tab === k ? 'text-primary after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-accent' : 'text-muted-foreground hover:text-primary'}`}
          >
            {label}
          </button>
        ))}
        <a href={j.applyUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary">
          <ExternalLink className="size-3.5" /> Original job post
        </a>
      </div>

      {tab === 'company' ? (
        <div className="pt-6"><CompanyTab j={j} /></div>
      ) : (
        <div className="pt-6">
          <div className="grid gap-6 md:grid-cols-[1fr_300px]">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-lg font-semibold text-primary">
                  {(j.company || j.title).trim().charAt(0).toUpperCase()}
                </span>
                <p className="text-sm text-muted-foreground"><span className="font-semibold text-primary">{j.company}</span>{posted ? ` · ${posted}` : ''}</p>
              </div>
              <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-[-0.035em] text-primary sm:text-3xl">{j.title}</h1>
              <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {j.city ? <Fact icon={MapPin}>{j.city}</Fact> : null}
                {j.employmentType ? <Fact icon={Briefcase}>{EMPLOYMENT[j.employmentType]}</Fact> : null}
                {j.workMode ? <Fact icon={Wifi}>{WORK_MODE[j.workMode]}</Fact> : null}
                {j.seniority ? <Fact icon={Signal}>{j.seniority}</Fact> : null}
                {j.minYears !== null ? <Fact icon={Calendar}>{j.minYears}+ years experience</Fact> : null}
                {j.statedPay ? <Fact icon={Wallet}>{j.statedPay}</Fact> : null}
              </ul>
            </div>
            <div><ScoreCard j={j} /></div>
          </div>

          {skills.length ? (
            <section className="mt-2" aria-label="Skills">
              <h2 className="text-base font-semibold tracking-[-0.02em] text-primary">Skills</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Green: on your profile. Grey: the job asks, your profile does not say.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.map(({ t, has }) => (
                  <span key={t} className={`rounded-lg px-3 py-1.5 text-sm ${has ? 'bg-score-high/15 text-score-high' : 'bg-secondary text-muted-foreground'}`}>{t}</span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-8" aria-label="The posting">
            <DescriptionTab j={j} />
          </section>
        </div>
      )}
    </div>
  )
}
