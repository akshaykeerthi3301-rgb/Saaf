'use client'

import { useState, useSyncExternalStore, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@base-ui/react/dialog'
import Link from 'next/link'
import {
  AlertTriangle, Building2, CheckCircle2, ChevronRight, CircleHelp, FileText, Loader2, Mail, MapPin,
  MessageCircle, PenLine, Quote, Sparkles, Tag, X,
} from 'lucide-react'
import { useFeed } from '@/components/features/feed-selection'
import { QuickApply } from '@/components/features/quick-apply'
import { TrackRole } from '@/components/features/track-role'
import { ReviewDrawer } from '@/components/features/review-drawer'
import { HideRole } from '@/components/features/feed-controls'
import { correctSkillFromJob } from '@/app/actions/feed-prefs'
import { CompanyFactsCard } from '@/components/features/company-facts'
import { ConnectionsAt } from '@/components/features/connections-at'
import { ApplyForMe } from '@/components/features/apply-for-me'
import { ScoreRing, ringBand } from '@/components/ui/score-ring'
import { ReportScore } from '@/components/features/report-score'
import { JobActions } from '@/components/features/job-actions'
import { barsFromShares } from '@/lib/score-bars'
import { bandFor } from '@/components/ui/fit-ring'
import { postedAgo } from '@/lib/day'
import type { JobInsight } from '@/lib/services/job-insight'
import type { FitSection } from '@/lib/fit-sections'

/**
 * The right-hand Deep Match Analysis panel.
 *
 * Two views of one FeedProvider: `JobPanel` fills the shell's context column at
 * xl and above; `JobSheet` covers the screen below xl, and only when the
 * candidate chose a job (never on load). Neither fetches — the provider does,
 * once per job.
 *
 * Three tabs: Match Analysis, AI Co-Pilot, Job Description. Everything in the
 * first and third is read from our own data; the Co-Pilot tab hands the role to
 * the tools that call a model, each of which runs its own grounding check.
 */

type Tab = 'overview' | 'company' | 'tools' | 'jd'

export function JobPanel({ idle }: { idle: ReactNode }) {
  const { selection } = useFeed()
  if (!selection.roleId) return <div className="p-5">{idle}</div>
  return <PanelBody />
}

/** True at xl and above, where the panel is a column rather than a sheet. */
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia('(min-width: 1280px)')
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia('(min-width: 1280px)').matches,
    () => true,
  )
}

/**
 * The phone/tablet view: a full-screen dialog, on @base-ui's Dialog for the
 * same reasons as src/components/ui/sheet.tsx — Escape, the focus trap, focus
 * return and scroll lock (docs/QA-AUDIT.md QA-13 is the hand-rolled version of
 * this going wrong). Never open at xl: there the column shows the same job,
 * and an invisible open dialog would lock the page's scroll.
 */
export function JobSheet() {
  const { selection, close } = useFeed()
  const desktop = useIsDesktop()
  const open = selection.opened && !!selection.roleId && !desktop
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) close() }}>
      <Dialog.Portal>
        <Dialog.Popup
          aria-label="Job match analysis"
          className="fixed inset-0 z-50 overflow-y-auto bg-background outline-none"
        >
          <Dialog.Title className="sr-only">Job match analysis</Dialog.Title>
          <div className="glass sticky top-0 z-10 flex items-center justify-end border-b border-border px-4 py-2">
            <Dialog.Close className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-primary hover:bg-secondary">
              <X className="size-4" />
              Close
            </Dialog.Close>
          </div>
          <PanelBody />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function PanelBody() {
  const { current } = useFeed()
  const [tab, setTab] = useState<Tab>('overview')

  if (current.status === 'loading' || current.status === 'idle') {
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Reading this posting against your profile…
      </p>
    )
  }
  if (!current.result.ok) {
    return <p className="p-6 text-sm text-muted-foreground">{current.result.error}</p>
  }
  const j = current.result.insight

  return (
    <div>
      <PanelHeader j={j} />
      <div role="tablist" aria-label="Job details" className="sticky top-0 z-10 flex gap-5 border-b border-border bg-background/95 px-5 backdrop-blur xl:top-0">
        {([
          ['overview', 'Overview'],
          ['company', 'Company'],
          ['tools', 'AI tools'],
          ['jd', 'Description'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`relative py-3 text-xs font-semibold transition-colors ${
              tab === key ? 'text-primary after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-accent' : 'text-muted-foreground hover:text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="p-5" role="tabpanel">
        {tab === 'overview' ? <OverviewTab j={j} /> : tab === 'company' ? <CompanyTab j={j} /> : tab === 'tools' ? <CopilotTab j={j} /> : <DescriptionTab j={j} />}
      </div>
    </div>
  )
}

/**
 * Title, one line of facts, and the actions — no ring (it is the first thing in the
 * Overview), no band tag, no chip row, no reason line (it is in the score card). The
 * header had five rows of its own above the tabs.
 */
function PanelHeader({ j }: { j: JobInsight }) {
  const posted = postedAgo(j.postedAt)
  const facts = [j.company, j.city, j.seniority, posted, j.statedPay].filter(Boolean)
  return (
    <div className="px-5 pb-3 pt-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-lg font-semibold text-primary">
          {(j.company || j.title).trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-snug tracking-[-0.02em] text-primary">{j.title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{facts.join(' · ')}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <QuickApply roleId={j.roleId} company={j.company} title={j.title} applyUrl={j.applyUrl} easy={j.easyApply} size="lg" />
        <ApplyForMe url={j.applyUrl} title={j.title} company={j.company} />
        <TrackRole roleId={j.roleId} company={j.company} title={j.title} applyUrl={j.applyUrl} trackedStatus={j.trackedStatus ?? undefined} />
        <HideRole roleId={j.roleId} />
        <JobActions roleId={j.roleId} applyUrl={j.applyUrl} title={j.title} />
      </div>
    </div>
  )
}

const BAND_TONE = { high: 'text-score-high', mid: 'text-score-mid', low: 'text-muted-foreground' } as const
const BAR_TONE = { high: 'bg-score-high', mid: 'bg-score-mid', low: 'bg-muted-foreground/50' } as const

/** The ring, its word, and the three bars it is made of — then the one-line reason. */
function ScoreCard({ j }: { j: JobInsight }) {
  const bars = barsFromShares(j.analysis.factors)
  if (j.score === null) {
    return <p className="mb-6 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">This role is not scored for you.</p>
  }
  return (
    <div className="mb-6 flex gap-4 rounded-2xl border border-border bg-secondary/30 p-4">
      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <ScoreRing score={j.score} size={84} stroke={7} />
        <span className={`max-w-[92px] text-center text-[10px] font-bold uppercase leading-3 tracking-[0.08em] ${BAND_TONE[ringBand(j.score)]}`}>{bandFor(j.score)}</span>
      </div>
      <div className="min-w-0 flex-1">
        {bars.length ? (
          <ul className="space-y-2" aria-label="Score parts">
            {bars.map((b) => {
              const tone = b.share >= 0.7 ? 'high' : b.share >= 0.5 ? 'mid' : 'low'
              return (
                <li key={b.label}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium text-primary">{b.label}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">{Math.round(b.share * 100)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className={`h-full rounded-full ${BAR_TONE[tone]}`} style={{ width: `${Math.max(4, b.share * 100)}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
        {j.reason ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{j.reason}</p> : null}
      </div>
    </div>
  )
}

/**
 * The long reading, closed by default and one click away — what the feed card's
 * "Insights" was, plus what the old Why / Gaps / Factors sections said, without
 * the same note appearing twice. The arithmetic is never behind a request: it is
 * in the page already.
 */
function HowItIsBuilt({ j }: { j: JobInsight }) {
  const a = j.analysis
  const noteSet = new Set(a.factors.map((f) => f.note))
  // Lines the factor notes do not already say: "you hold 1 of 12 skills", the years sentence with its quote, the cap.
  const extra = [...new Set([...a.whyFit, ...a.gaps])].filter((t) => !noteSet.has(t))
  return (
    <details className="group mb-6 rounded-2xl border border-border bg-card p-4" data-breakdown="score">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
        How this score is built
        <span className="font-mono text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
          {a.strongFactors} of {a.totalFactors} parts strong
        </span>
      </summary>

      {a.factors.length ? (
        <ul className="mt-4 space-y-3">
          {a.factors.map((f) => (
            <li key={f.key}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-primary">{f.label}</span>
                <span className="font-mono tabular-nums text-muted-foreground">{Math.round(f.share * 100)}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className={`h-full rounded-full ${BAR_TONE[f.share >= 0.7 ? 'high' : f.share >= 0.5 ? 'mid' : 'low']}`} style={{ width: `${Math.max(3, f.share * 100)}%` }} />
              </div>
              {f.note ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{f.note}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {extra.length ? (
        <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
          {extra.map((t) => (
            <li key={t} className="flex gap-2 text-xs leading-5 text-muted-foreground">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      ) : null}

      {j.evidence.length ? (
        <div className="mt-4 space-y-3 border-t border-border pt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">What we read from the posting</p>
          {j.evidence.map((e, i) => (
            <div key={i}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {e.label}
                {e.lowConfidence ? ' · read with low confidence' : ''}
              </p>
              <blockquote className="mt-1 flex gap-2 text-xs leading-5 text-muted-foreground">
                <Quote className="mt-0.5 size-3 shrink-0 text-accent" aria-hidden="true" />
                <span>{e.quote}</span>
              </blockquote>
            </div>
          ))}
        </div>
      ) : null}

      {j.gateResultId ? (
        <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          Score look wrong?
          <ReportScore gateResultId={j.gateResultId} />
        </div>
      ) : null}
    </details>
  )
}

/** Employer facts, from our own index and open data — moved out of the Overview, where it was the sixth stacked section. */
function CompanyTab({ j }: { j: JobInsight }) {
  return (
    <>
      <Section title="Company snapshot" icon={Building2}>
        <dl className="grid grid-cols-2 gap-2">
          <Stat label="Open roles in India" value={j.snapshot.openRoles.toLocaleString('en-IN')} />
          <Stat label="Hiring system" value={j.snapshot.ats ?? 'Own careers site'} />
        </dl>
        {j.snapshot.cities.length ? (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Hiring in <span className="text-primary">{j.snapshot.cities.join(', ')}</span>
          </p>
        ) : null}
        {j.snapshot.culture.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {j.snapshot.culture.map((c) => (
              <span
                key={c.tag}
                title={`The posting says “${c.evidence}”`}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-xs text-primary"
              >
                <Tag className="size-3 text-accent" aria-hidden="true" />
                {c.tag}
              </span>
            ))}
          </div>
        ) : null}
        {/* Stated, not left blank: an empty space where funding and ratings
            "should" be reads as a loading failure. */}
        <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
          Counts are from the boards we index. Culture tags come from this posting&apos;s own words (hover
          to see them).
        </p>
        <CompanyFactsCard company={j.company} />
      </Section>
    </>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof MapPin; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
        <Icon className="size-3.5 text-accent" />
        {title}
      </h3>
      {children}
    </section>
  )
}

/**
 * The four-section fit analysis (TASK-160): each section is aligned, not aligned
 * or "can't check", and opens to the words it rests on — a quote from the posting
 * and the fact from your profile it was checked against. Text only.
 */
const FIT_LABEL: Record<FitSection['status'], string> = { aligned: 'Aligned', not_aligned: 'Not aligned', unknown: 'Can’t check' }

function FitSections({ sections }: { sections: FitSection[] }) {
  return (
    <Section title="Fit analysis" icon={CheckCircle2}>
      <ul className="space-y-2">
        {sections.map((s) => {
          const Icon = s.status === 'aligned' ? CheckCircle2 : s.status === 'not_aligned' ? AlertTriangle : CircleHelp
          const tone = s.status === 'aligned' ? 'text-score-high' : s.status === 'not_aligned' ? 'text-score-mid' : 'text-muted-foreground'
          const head = (
            <span className="flex items-start gap-2">
              <Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} aria-hidden="true" />
              <span className="min-w-0">
                <span className="text-sm font-semibold text-primary">{s.title}</span>
                <span className={`ml-2 text-[10px] font-bold uppercase tracking-[0.12em] ${tone}`}>{FIT_LABEL[s.status]}</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{s.summary}</span>
              </span>
            </span>
          )
          return (
            <li key={s.key} className="rounded-lg border border-border bg-card px-3 py-2.5">
              {s.evidence.length ? (
                <details>
                  <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">{head}</summary>
                  <ul className="mt-2 space-y-2 border-t border-border pt-2">
                    {s.evidence.map((e, i) => (
                      <li key={i} className="space-y-0.5 text-xs leading-5">
                        {e.posting ? <p className="text-muted-foreground"><span className="font-semibold text-primary">Posting:</span> “{e.posting}”</p> : null}
                        {e.you ? <p className="text-muted-foreground"><span className="font-semibold text-primary">You:</span> {e.you}</p> : null}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : head}
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

/**
 * Correct your skills from the job (Phase 15; Jobright lets you click a skill
 * tag to say you do or do not have it). Writes the profile, rescores every
 * role, then refetches this panel and the feed — and says what moved.
 */
function useSkillCorrection(roleId: string) {
  const router = useRouter()
  const { reload } = useFeed()
  const [pending, start] = useTransition()
  const [busy, setBusy] = useState<string>()
  const [note, setNote] = useState<string>()
  const run = (skill: string, have: boolean) => {
    setBusy(skill); setNote(undefined)
    start(async () => {
      const r = await correctSkillFromJob({ roleId, skill, have }).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
      setBusy(undefined)
      if (!r.ok) { setNote(r.error); return }
      const moved = r.before !== null && r.after !== null && r.before !== r.after ? ` This job went from ${r.before} to ${r.after}.` : ' This job’s score did not change.'
      setNote(`${have ? 'Added' : 'Removed'} “${skill}” ${have ? 'to' : 'from'} your profile and rescored ${r.rescored} roles.${moved}`)
      reload(roleId)
      router.refresh()
    })
  }
  return { run, pending, busy, note }
}

/**
 * Overview (the feed redesign of 2026-10-08, from the teardown's UI spec §S5): the
 * score card first, then whether you line up, then your skills against the posting —
 * and the long reading (every factor with its note, every requirement quote, the
 * report button) behind one disclosure instead of five stacked sections.
 */
function OverviewTab({ j }: { j: JobInsight }) {
  const a = j.analysis
  const skill = useSkillCorrection(j.roleId)
  return (
    <>
      <ScoreCard j={j} />
      <FitSections sections={j.sections} />
      <Section title="Your skills against this posting" icon={Sparkles}>
        <p className="mb-3 text-[11px] leading-4 text-muted-foreground">
          Wrong? Click a skill to add it to your profile or take it off — only claim what you would defend in an interview.
        </p>
        {skill.note ? <p role="status" className="mb-3 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-xs text-primary">{skill.note}</p> : null}
        <p className="mb-2 text-[11px] font-semibold text-score-high">Matched skills · {a.matched.length}</p>
        {a.matched.length ? (
          <div className="flex flex-wrap gap-1.5">
            {a.matched.map((s) => (
              <button
                key={s}
                type="button"
                disabled={skill.pending}
                onClick={() => skill.run(s, false)}
                title="I don't have this — take it off my profile"
                className="inline-flex items-center gap-1 rounded-md border border-score-high/30 bg-score-high/10 px-2 py-1 text-xs text-score-high transition hover:border-score-high disabled:opacity-60"
              >
                {skill.busy === s ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-3" aria-hidden="true" />}
                {s}
                <X className="size-3 opacity-60" aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">None of the skills on your profile appear in this posting.</p>
        )}

        <p className="mb-2 mt-4 text-[11px] font-semibold text-score-mid">Missing keywords · {a.missing.length}</p>
        {a.missing.length ? (
          <div className="flex flex-wrap gap-1.5">
            {a.missing.map((m) => (
              <button
                key={m.term}
                type="button"
                disabled={skill.pending}
                onClick={() => skill.run(m.term, true)}
                title={`I have this — add it to my profile${m.employers ? ` (named by ${m.employers} employers in our index)` : ''}`}
                className="inline-flex items-center gap-1 rounded-md border border-score-mid/30 bg-score-mid/10 px-2 py-1 text-xs text-score-mid transition hover:border-score-mid disabled:opacity-60"
              >
                {skill.busy === m.term ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : <span aria-hidden="true">+</span>}
                {m.term}
                {m.employers ? <span className="font-mono text-[10px] opacity-80">{m.employers}</span> : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Every skill this posting names is on your profile.</p>
        )}
        {a.missing.some((m) => m.employers) ? (
          <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
            The number on a keyword is how many employers in our index ask for it — lead with the big ones.
          </p>
        ) : null}
      </Section>

      <ConnectionsAt company={j.company} />

      <HowItIsBuilt j={j} />
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <dt className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-primary">{value}</dd>
    </div>
  )
}

function CopilotTab({ j }: { j: JobInsight }) {
  const q = `?role=${j.roleId}`
  const tools: { href: string; icon: typeof FileText; title: string; body: string }[] = [
    { href: `/resume/tailor${q}`, icon: FileText, title: 'Tailor Resume', body: 'Your saved résumé beside a version rewritten for this posting, with every change marked.' },
    { href: `/cover-letter${q}`, icon: PenLine, title: 'Generate Cover Letter', body: 'Pick a tone, edit live, copy or download.' },
    { href: `/outreach${q}`, icon: Mail, title: 'Draft Cold Email', body: 'Messages for the recruiter, the hiring manager and a future teammate.' },
    { href: `/interview-prep${q}`, icon: MessageCircle, title: 'Mock Interview', body: 'Questions built from your gaps for this role, with scored practice answers.' },
  ]
  return (
    <>
      <div className="grid gap-3">
        {tools.map(({ href, icon: Icon, title, body }) => (
          <Link
            key={href}
            href={href}
            className="glow-hover group flex gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <span className="bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-xl">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-primary">{title}</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{body}</span>
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-border bg-secondary/40 p-4">
        <p className="text-xs font-semibold text-primary">Quick draft</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Three tailored bullets and a short note in a side panel — every line checked against your profile
          before you see it.
        </p>
        <div className="mt-3">
          <ReviewDrawer roleId={j.roleId} title={j.title} company={j.company} applyUrl={j.applyUrl} />
        </div>
      </div>
    </>
  )
}

/** One run of description blocks. Untrusted text: rendered as text nodes only. */
function Blocks({ blocks, mark }: { blocks: JobInsight['description']; mark: (t: string) => ReactNode }) {
  return (
    <div className="space-y-2.5 text-sm leading-6 text-muted-foreground">
      {blocks.map((b, i) =>
        b.kind === 'heading' ? (
          <h5 key={i} className="pt-3 text-sm font-semibold text-primary">{b.text}</h5>
        ) : (
          <p
            key={i}
            className={`${b.kind === 'bullet' ? 'pl-4' : ''} ${
              b.requirement ? 'rounded-r-lg border-l-2 border-brand bg-brand/10 py-1 pl-3 pr-2 text-primary' : ''
            }`}
          >
            {b.kind === 'bullet' && !b.requirement ? <span className="-ml-3 mr-1.5 text-accent">•</span> : null}
            {b.requirement ? <Quote className="mr-1.5 inline size-3 text-accent" aria-hidden="true" /> : null}
            {mark(b.text)}
          </p>
        ),
      )}
    </div>
  )
}

function DescriptionTab({ j }: { j: JobInsight }) {
  const matched = j.analysis.matched
  const missing = j.analysis.missing.map((m) => m.term)
  const terms = [...matched, ...missing].filter((t) => t.length > 1)
  const re = terms.length
    ? new RegExp(`\\b(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi')
    : null

  // Untrusted text: rendered as text nodes only. Terms are wrapped, never injected.
  const mark = (text: string) => {
    if (!re) return text
    return text.split(re).map((part, i) => {
      const lower = part.toLowerCase()
      if (matched.some((m) => m.toLowerCase() === lower)) {
        return <mark key={i} className="rounded bg-score-high/15 px-0.5 text-score-high">{part}</mark>
      }
      if (missing.some((m) => m.toLowerCase() === lower)) {
        return <mark key={i} className="rounded bg-score-mid/15 px-0.5 text-score-mid">{part}</mark>
      }
      return <span key={i}>{part}</span>
    })
  }

  if (!j.description.length) {
    return <p className="text-sm text-muted-foreground">The employer&apos;s board sent no description for this role.</p>
  }

  return (
    <div>
      <p className="mb-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-score-high" /> on your profile</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-score-mid" /> missing</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-brand" /> key requirement</span>
      </p>
      {j.jobSections ? (
        <>
          <p className="mb-3 text-[11px] leading-4 text-muted-foreground">
            Sorted under the employer’s own headings by what they say. The original wording is unchanged.
          </p>
          <div className="space-y-6">
            {j.jobSections.map((s, i) => (
              <section key={i} data-section={s.key}>
                <h4 className="mb-2 text-sm font-semibold text-primary">
                  {s.label}
                  {s.heading && s.heading.toLowerCase() !== s.label.toLowerCase() ? (
                    <span className="ml-2 text-[11px] font-normal text-muted-foreground">“{s.heading}”</span>
                  ) : null}
                </h4>
                <Blocks blocks={s.blocks} mark={mark} />
              </section>
            ))}
          </div>
        </>
      ) : (
        <Blocks blocks={j.description} mark={mark} />
      )}
      <a
        href={j.applyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-block text-xs font-semibold text-accent underline underline-offset-4"
      >
        Open the original posting ↗
      </a>
      <Link
        href={`/jobs/${j.roleId}`}
        target="_blank"
        className="ml-4 mt-6 inline-block text-xs font-semibold text-accent underline underline-offset-4"
      >
        Shareable page ↗
      </Link>
    </div>
  )
}
