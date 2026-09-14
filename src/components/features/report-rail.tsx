'use client'

import { Briefcase, Loader2 } from 'lucide-react'
import type { AtsReport, AtsCategory } from '@/lib/ats-check'
import type { IndexMatchCount } from '@/lib/services/index-match'

/**
 * The left rail: the score, the target, and every check as a row you can click.
 *
 * ⚠️ THIS SHAPE IS TAKEN FROM THE CATEGORY LEADER, DELIBERATELY AND ALMOST
 * EXACTLY. Their report is a fixed rail carrying the gauge and all 27 checks
 * beside a pane that answers one check at a time; ours was a single column that
 * scrolled, where every finding shouted equally and the shape of the problem
 * was invisible. The content was already better — every finding quotes the
 * candidate's own line and nothing is paywalled — and the interface threw that
 * advantage away.
 *
 * ⚠️ ONE DIFFERENCE, AND IT IS THE WHOLE POSITIONING. Their rail shows locked
 * rows: checks you can see and cannot read until you pay, which is what makes
 * the paywall convert. Ours has no locked state because there is nothing to
 * sell, and the rail says so out loud at the bottom. A row you cannot open
 * would be the single fastest way to lose the only thing this product has.
 */

/**
 * ⚠️ ORDER IS EDITORIAL. Machine-readability first, because a document a parser
 * cannot read makes every later finding moot; then the content a person reads;
 * then the three that are about how a career looks rather than how a file
 * parses. A candidate who reads to the bottom has been told the mechanical
 * truth before anything that touches them personally.
 */
const ORDER: AtsCategory[] = [
  'ats_essentials', 'sections', 'content', 'tailoring', 'red_flags', 'seniority', 'bias',
]

export function ReportRail({
  report,
  selected,
  skipped,
  onSelect,
  targetRole,
  postings,
  onChangeRole,
  baseline,
  indexMatch,
  indexBaseline,
  onCheckIndex,
  checkingIndex,
}: {
  report: AtsReport
  /**
   * Findings the candidate has dismissed.
   *
   * ⚠️ THE RAIL USED TO IGNORE THIS AND THE TWO PANES DISAGREED. `skipped` only
   * filtered the detail pane's list, so a dismissed check kept its clickable
   * row here; clicking it set `selected` to an id the pane could not find, the
   * pane silently fell back to a DIFFERENT check, and `aria-current` stayed on
   * the row the candidate had actually clicked. Screen-reader users got the
   * worst of it — announced as current, showing something else.
   */
  skipped: Set<string>
  selected?: string
  onSelect: (findingId: string) => void
  targetRole: string
  postings?: number
  onChangeRole: () => void
  /** The score before any fix was applied, when it differs from the current one. */
  baseline?: number
  /** Live jobs this résumé matches, once the candidate asks for it. */
  indexMatch?: IndexMatchCount
  indexBaseline?: number
  onCheckIndex: () => void
  checkingIndex: boolean
}) {
  const score = report.readability.score
  const moved = baseline !== undefined && baseline !== score
  /**
   * What each finding actually costs this résumé, from the itemised deductions.
   * Computed by rescoring without the finding, so it is reproducible by the
   * reader rather than a severity label dressed as a number.
   */
  const cost = (id: string) => report.readability.deductions.find((d) => d.id === id)?.points ?? 0

  return (
    <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
      <Gauge score={score} baseline={moved ? baseline : undefined} />

      {/*
        ⚠️ THE ONLY NUMBER ON THIS PAGE THAT IS ABOUT THE MARKET RATHER THAN THE
        FILE, and the one a résumé tool without an index cannot print. It sits
        directly under the gauge because "74/100" is a property of a document
        and "85 live jobs" is the thing the document was for — and because it
        was previously the third card down, below two panels explaining the
        score, which buried the single hardest thing here to copy.

        ⚠️ STILL BEHIND A CLICK, DELIBERATELY. This is the heaviest read on any
        public unauthenticated surface in the product — up to 150 postings with
        their requirements — so running it on every upload would turn a free
        tool into an expensive one. What changed is that the OFFER is now
        concrete before the click: the postings count comes from
        role-keywords.json and costs nothing to print, so the reader knows what
        they are asking for rather than being invited to press a button that
        explains itself afterwards.

        Count only — the roles behind it are what signing in buys. See
        src/lib/services/index-match.ts for why that is a moat decision rather
        than a growth one.
      */}
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
          Live jobs you match
        </span>
        {indexMatch ? (
          <>
            <p className="mt-1 font-mono text-3xl tabular-nums text-primary">
              {indexBaseline !== undefined && indexBaseline !== indexMatch.strong ? (
                <>
                  <span className="text-lg text-muted-foreground">{indexBaseline}</span>
                  <span className="text-lg text-muted-foreground"> → </span>
                  <span className="text-accent">{indexMatch.strong}</span>
                </>
              ) : (
                indexMatch.strong
              )}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              scoring {indexMatch.threshold}%+ of the {indexMatch.scoped} {targetRole} postings we
              indexed. Sign in to see them.
            </p>
            <button
              type="button"
              onClick={onCheckIndex}
              disabled={checkingIndex}
              className="mt-2 text-xs font-semibold text-primary underline underline-offset-4 disabled:opacity-50"
            >
              {checkingIndex ? 'Re-checking…' : 'Re-check after your fixes'}
            </button>
          </>
        ) : targetRole ? (
          <>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              We hold <span className="font-mono tabular-nums text-primary">{postings ?? 'live'}</span>{' '}
              {targetRole} postings from company hiring boards. See how many this résumé actually scores
              against — before and after you fix it.
            </p>
            <button
              type="button"
              onClick={onCheckIndex}
              disabled={checkingIndex}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline underline-offset-4 disabled:opacity-50"
            >
              {checkingIndex ? (
                <>
                  <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Scoring against the index…
                </>
              ) : (
                <>
                  <Briefcase className="size-3" aria-hidden="true" /> Count them
                </>
              )}
            </button>
          </>
        ) : (
          /*
            ⚠️ A PROMPT, NOT A DISABLED BUTTON. Without a role this used to render
            the same invitation with the control greyed out and no explanation —
            a dead end on the one feature here that no competitor has.
          */
          <>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              We index live postings from company hiring boards and can tell you how many this résumé
              scores against. Pick the role you are after and the count is one click away.
            </p>
            <button
              type="button"
              onClick={onChangeRole}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline underline-offset-4"
            >
              <Briefcase className="size-3" aria-hidden="true" /> Choose a role
            </button>
          </>
        )}
      </div>


      {/*
        ⚠️ HALF THE SCORE, AND THE HALF THAT WAS INVISIBLE UNTIL NOW.
        `parseSections` has always counted the lines it could not place, and
        sections.ts has always said a surface above ought to report it. None
        did — it was validated in transit by two Zod schemas and rendered
        nowhere. It is also the more useful of the two numbers: a list of rules
        can only penalise faults it has a name for, whereas this says plainly
        how much of the document defeated the parser, which is what actually
        happens to a résumé built in a design tool.

        The rate describes a TYPICAL ATS, not ours — see parseCoverage. Saying
        "we read it fine" about a sidebar résumé because our own extractor
        rebuilds columns would be the most comfortable possible lie.
      */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          What a parser could read
        </span>
        <p className="mt-1 font-mono text-2xl tabular-nums text-primary">{report.coverage.rate}%</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {report.coverage.fieldsMissing.length === 0
            ? `Every field we look for came out clean, and ${report.coverage.linesPlaced} of ${report.coverage.linesTotal} lines landed in a section.`
            : `We could not find your ${new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(report.coverage.fieldsMissing)}.`}
        </p>
        {report.coverage.atsRisk.length > 0 && (
          <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
            Reduced because this document uses{' '}
            {new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(report.coverage.atsRisk)}.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onChangeRole}
        className="rounded-2xl border border-accent/30 bg-accent/5 p-4 text-left transition-colors hover:border-accent/60"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">Target</span>
        <span className="mt-1 block text-sm font-semibold text-primary">
          {targetRole || 'No role chosen'}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {postings ? `measured across ${postings} postings · change` : 'choose a role · change'}
        </span>
      </button>

      <nav className="flex flex-col gap-4" aria-label="Checks">
        {ORDER.filter((key) => report.categories.some((c) => c.key === key)).map((key) => {
          const cat = report.categories.find((c) => c.key === key)!
          const raised = report.findings.filter((f) => f.category === key)
          const failing = raised.filter((f) => !skipped.has(f.id))
          const dismissed = raised.length - failing.length
          return (
            <div key={key} className="border-t border-border pt-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {cat.label}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {cat.passed}/{cat.total}
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-accent" style={{ width: `${cat.score}%` }} />
              </div>

              <ul className="mt-2 flex flex-col">
                {failing.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(f.id)}
                      aria-current={selected === f.id ? 'true' : undefined}
                      className={`flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left text-[12.5px] leading-5 transition-colors ${
                        selected === f.id
                          ? 'bg-secondary font-semibold text-primary'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-primary'
                      }`}
                    >
                      <span className="flex-1">{shortTitle(f.title)}</span>
                      {/*
                        ⚠️ SEVERITY, AS THE NUMBER IT IS WORTH. Every failing row
                        used to render the same ✕, so a finding whose own copy
                        says "blocks parsing" looked identical to a tidy-up. The
                        cost shown is the finding's REAL marginal impact —
                        rescore without it, take the difference — so a reader can
                        check it by applying the fix and watching the gauge.

                        And it is not `destructive`. DESIGN.md reserves that
                        token exclusively for system errors: "a low score is a
                        correct answer, not a failure". The old ✕ was a live
                        violation of that rule, which is why it has gone rather
                        than been recoloured.
                      */}
                      <span
                        className="mt-0.5 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground"
                        aria-label={`costs ${cost(f.id)} points`}
                      >
                        −{cost(f.id)}
                      </span>
                    </button>
                  </li>
                ))}
                {/*
                  ⚠️ "ALL PASSED" MUST MEAN PASSED. Filtering dismissed findings
                  out of this list would otherwise turn a category the candidate
                  waved away into one they cleared — and skipping deliberately
                  does NOT change the score (see ats-flow's skipFinding), so the
                  bar above would still be short while the words said perfect.
                */}
                {failing.length === 0 && dismissed === 0 && (
                  <li className="flex items-center gap-2 px-2 py-1.5 text-[12.5px] text-accent">
                    <span aria-hidden className="font-mono text-[11px]">✓</span>
                    All {cat.total} passed
                  </li>
                )}
                {failing.length === 0 && dismissed > 0 && (
                  <li className="px-2 py-1.5 text-[12.5px] text-muted-foreground">
                    {dismissed === 1 ? 'One check dismissed' : `${dismissed} checks dismissed`} — still counted in the
                    score.
                  </li>
                )}
              </ul>
            </div>
          )
        })}
      </nav>

      {/*
        ⚠️ THE SECOND SENTENCE IS THE SHARPEST HONEST CONTRAST THIS PRODUCT CAN
        DRAW, and until now it was only visible inside one finding's card. Three
        checks here are deliberately ASKS rather than fixes — a missing figure, a
        missing link, a résumé too short — because none can be repaired without
        inventing something. The category leader markets exactly that class of
        change as "AI rewrite suggestions" for quantifying impact, which means a
        model proposing a number for somebody else's achievement.

        Saying so where the whole report can see it costs nothing and is the
        difference between a tool that makes a résumé look better and one that
        makes it truer.
      */}
      <p className="border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
        Nothing here is locked. Every check opens, every finding that has a line to quote shows it, and there is no
        paid tier to upgrade to. Where a fix would need a figure you have not given us — a number, a percentage, a
        link — we ask you for it and will not invent one.
      </p>
    </aside>
  )
}

/** Their gauge, drawn as a half-ring. SVG so it inherits the theme tokens. */
function Gauge({ score, baseline }: { score: number; baseline?: number }) {
  const r = 52
  const circumference = Math.PI * r
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference

  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Your ATS score
      </span>
      <svg viewBox="0 0 130 74" className="mx-auto mt-2 w-[150px]" role="img" aria-label={`${score} out of 100`}>
        <path d="M13 65 A 52 52 0 0 1 117 65" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M13 65 A 52 52 0 0 1 117 65"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
        <text x="65" y="60" textAnchor="middle" className="fill-primary font-mono" fontSize="26" fontWeight="500">
          {score}
        </text>
      </svg>
      {baseline !== undefined ? (
        <p className="font-mono text-xs tabular-nums text-accent">
          {baseline} → {score} as you fix
        </p>
      ) : (
        <p className="font-mono text-xs tabular-nums text-muted-foreground">out of 100</p>
      )}
    </div>
  )
}

/** The rail needs a label, not a sentence. Trim at the first clause. */
function shortTitle(title: string): string {
  const cut = title.replace(/^A parser read your job title as .*/i, 'Job title misread')
  return cut.length > 46 ? `${cut.slice(0, 44)}…` : cut
}
