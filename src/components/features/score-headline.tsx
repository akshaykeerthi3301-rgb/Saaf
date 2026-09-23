import { Card, Eyebrow } from '@/components/ui/card'
import { Gauge } from '@/components/ui/gauge'
import type { AtsReport } from '@/lib/ats-check'

/**
 * Stage 1 of the Résumé Studio: the score, said once, as a sentence.
 *
 * ⚠️ IT REPLACES TWO CARDS THAT NEVER REFERRED TO EACH OTHER. `report-rail.tsx`
 * shows a gauge reading "74 out of 100" and, three cards below, "What a parser
 * could read — 91%". Those are the two halves the score is actually made of —
 * `PARSE_WEIGHT = 0.35` of parse coverage plus the weighted category
 * assessment — and a reader had no way to know that. A number and its own
 * ingredients presented as unrelated panels is the failure `docs/DESIGN.md:404`
 * describes as captioning a screen three times.
 *
 * ⚠️ THE CHECK COUNT IS NOT A CLAIM ABOUT THE ROLE, AND THE PLAN SAID IT WAS.
 * `~/.claude/plans/…` specified the sentence "what it reads matches this role
 * on 24 of 31 checks". Measured on 2026-09-15, a résumé checked against Backend
 * Engineer runs **40 checks of which exactly 3 are about the role** — the
 * `tailoring` category. The other 37 are formatting, sections, content, red
 * flags, bias and seniority, which are true of the document whoever reads it.
 * Describing all 40 as role-matching would put a number on screen that means
 * something other than what it says, which is the defect this whole product
 * argues against. The role's own 3 are called out separately or not at all.
 *
 * ⚠️ NO HUE CARRIES THE OUTCOME. `docs/DESIGN.md:397` bans a green/red/amber
 * trio and `:212-217` says a low score "is a correct answer, not a failure".
 * The gauge's arc length is the value; the sentence carries the rest.
 */

/** The denominator is trustworthy because a test keeps `RULES` exhaustive —
 *  see `categoryOf()`, whose comment explains that an unregistered rule would
 *  make "passed 6 of 8" arithmetic over the wrong denominator. */
export function checkTally(report: AtsReport): { passed: number; total: number } {
  return report.categories.reduce(
    (acc, c) => ({ passed: acc.passed + c.passed, total: acc.total + c.total }),
    { passed: 0, total: 0 },
  )
}

export function ScoreHeadline({
  report,
  baseline,
  targetRole,
}: {
  report: AtsReport
  /** The score before any fix, when it differs — the gauge renders the delta. */
  baseline?: number
  targetRole?: string
}) {
  const score = report.readability.score
  const { passed, total } = checkTally(report)
  const failed = total - passed
  const tailoring = report.categories.find((c) => c.key === 'tailoring')

  return (
    <Card>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="shrink-0">
          <Gauge score={score} baseline={baseline} size="lg" caption="out of 100" />
        </div>

        <div className="min-w-0 text-center sm:text-left">
          <Eyebrow>Your ATS score</Eyebrow>
          {/*
            The two halves, in the order the score is computed: what a typical
            ATS could interpret at all, then what the interpretable part
            contained. "A typical ATS", not "a parser": the page also shows what
            WE read, and the two differ by design (coverageNote, QA-04).
          */}
          <p className="mt-2 text-lg leading-7 text-primary">
            A typical ATS reads{' '}
            <span className="font-mono font-semibold tabular-nums">{report.coverage.rate}%</span> of
            your document, and{' '}
            <span className="font-mono font-semibold tabular-nums">
              {passed} of {total}
            </span>{' '}
            checks on what it read came back clean.
          </p>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {failed === 0
              ? 'Nothing is outstanding. The next two steps are about this specific job rather than the document.'
              : `${failed} ${failed === 1 ? 'check' : 'checks'} did not pass. Every one names the line it came from, and most can be fixed in one click with no model running.`}
            {report.coverage.rate < 100 && report.coverage.atsRisk.length > 0 && (
              <>
                {' '}
                The parse figure is below 100% because this document uses{' '}
                {new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(
                  report.coverage.atsRisk,
                )}
                .
              </>
            )}
          </p>

          {/*
            ⚠️ THE ROLE'S OWN CHECKS, COUNTED HONESTLY AND SEPARATELY. Three out
            of forty is a small number and printing it small is the point: a
            candidate who reads "37 of 40" should not walk away believing their
            résumé was measured against this job forty times.
          */}
          {targetRole && tailoring && (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Only <span className="font-mono tabular-nums">{tailoring.total}</span> of those checks
              are about {targetRole} specifically, and you pass{' '}
              <span className="font-mono tabular-nums">{tailoring.passed}</span>. The rest describe
              the document, and are true whoever reads it.
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
