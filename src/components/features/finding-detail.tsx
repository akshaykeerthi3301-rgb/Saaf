'use client'

import { useState } from 'react'
import { Check, Info, Sparkles, Wand2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AtsFinding, TermCoverage } from '@/lib/ats-check'
import type { Fix, FixEdit } from '@/lib/resume-fix'

/**
 * One check, answered — and, where a machine honestly can, fixed.
 *
 * ⚠️ THE THREE FIX KINDS ARE A PRODUCT POSITION, NOT AN IMPLEMENTATION DETAIL.
 *
 *  `edit`   — a substitution we can make from the candidate's own words. Shown
 *             as before/after, accepted one line at a time. No model runs.
 *  `layout` — fixed by rebuilding the document, so there is nothing to review.
 *  `ask`    — WE CANNOT FIX THIS WITHOUT INVENTING SOMETHING, so we ask. A
 *             missing figure is the clearest case: the category leader ships
 *             "AI rewrite suggestions" for quantifying impact, which means a
 *             model proposing a number for a candidate's achievement. Asking is
 *             slower, and it is the only version of this feature that cannot
 *             put a figure into someone's résumé that they cannot defend.
 */

export function FindingDetail({
  finding,
  fix,
  coverage,
  appliedEdits,
  onApplyEdit,
  onApplyLayout,
  onAnswer,
  onSkip,
  onRewrite,
  rewriting,
}: {
  finding: AtsFinding
  fix: Fix | null
  /** Only for the tailoring finding — the market column. */
  coverage?: TermCoverage[]
  appliedEdits: Set<string>
  onApplyEdit: (edit: FixEdit, key: string) => void
  onApplyLayout: () => void
  onAnswer: (findingId: string, value: string) => void
  onSkip: (findingId: string) => void
  onRewrite: (entry: number, bullet: number) => void
  rewriting?: string
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {finding.category.replace('_', ' ')} › {finding.severity === 'high' ? 'blocks parsing' : finding.severity === 'medium' ? 'degrades parsing' : 'worth tidying'}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-primary">{finding.title}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{finding.detail}</p>
        {finding.evidence && (
          <p className="mt-4 border-l-2 border-border pl-3 font-mono text-xs leading-5 text-muted-foreground">
            {finding.evidence}
          </p>
        )}
      </div>

      {coverage && coverage.length > 0 && <MarketColumn coverage={coverage} />}

      {fix?.kind === 'edit' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-6 text-primary">{fix.note}</p>
          {fix.edits.map((edit) => {
            const key = `${fix.findingId}:${edit.entry}:${edit.bullet}`
            const done = appliedEdits.has(key)
            const busy = rewriting === `${edit.entry}:${edit.bullet}`
            return (
              <div
                key={key}
                className={`rounded-2xl border p-4 ${done ? 'border-accent/40 bg-accent/5' : 'border-border bg-card'}`}
              >
                <p className="text-xs leading-5 text-muted-foreground line-through">{edit.before}</p>
                <p className="mt-1.5 text-sm leading-6 text-primary">{edit.after}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {done ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
                      <Check className="size-3.5" aria-hidden="true" /> Applied
                    </span>
                  ) : (
                    <>
                      <Button type="button" onClick={() => onApplyEdit(edit, key)} className="!px-3 !py-1.5 !text-xs">
                        Apply this fix
                      </Button>
                      <button
                        type="button"
                        onClick={() => onRewrite(edit.entry, edit.bullet)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-secondary disabled:opacity-50"
                      >
                        <Wand2 className="size-3.5" aria-hidden="true" />
                        {busy ? 'Rewriting…' : 'Rewrite with AI instead'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
          <p className="text-xs leading-5 text-muted-foreground">
            The suggestion above uses only words already in your line — no model runs unless you ask for
            one. “Rewrite with AI” goes through the same filter that refuses any figure, employer or
            qualification not already in that line.
          </p>
        </div>
      )}

      {fix?.kind === 'layout' && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
          <p className="text-sm leading-6 text-primary">{fix.note}</p>
          <Button type="button" onClick={onApplyLayout} className="mt-4 !px-3 !py-1.5 !text-xs">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Rebuild the layout
            </span>
          </Button>
        </div>
      )}

      {fix?.kind === 'ask' && <AskFix fix={fix} onAnswer={onAnswer} />}

      {!fix && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="inline-flex items-start gap-2 text-sm leading-6 text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {finding.fix}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => onSkip(finding.id)}
        className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-muted-foreground underline underline-offset-4 hover:text-primary"
      >
        <X className="size-3.5" aria-hidden="true" />
        Skip this — it does not apply to me
      </button>
    </div>
  )
}

function AskFix({ fix, onAnswer }: { fix: Extract<Fix, { kind: 'ask' }>; onAnswer: (id: string, v: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-semibold text-primary">{fix.question}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={fix.placeholder}
          className="min-w-[240px] flex-1 rounded-xl border border-input bg-card px-3 py-2 text-sm text-primary outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/10"
        />
        <Button
          type="button"
          disabled={value.trim().length < 2}
          onClick={() => onAnswer(fix.findingId, value.trim())}
          className="!px-3 !py-2 !text-xs"
        >
          Add it
        </Button>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{fix.note}</p>
    </div>
  )
}

/**
 * The market column.
 *
 * ⚠️ THE PERCENTAGES ARE THE PRODUCT. "Missing: platform, performance, cloud"
 * is a list anybody can print. "‘platform’ is in 72% of the 199 postings we
 * index for this role and ‘settlement’ is in 4%" tells the candidate which
 * missing word is worth changing their résumé for — and it cannot be computed
 * from the one job ad a competitor's tailoring reads. Every figure here comes
 * from scripts/build-role-keywords.ts counting real postings.
 */
function MarketColumn({ coverage }: { coverage: TermCoverage[] }) {
  const missing = coverage.filter((c) => !c.present)
  const have = coverage.filter((c) => c.present)

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        What this role&rsquo;s postings actually ask for
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Measured across the postings we index — not a recommended-keywords list. Fix the common ones
        first; a term used by a tenth of employers is not worth reshaping your résumé around.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {missing.map((c) => (
          <TermRow key={c.term} c={c} />
        ))}
      </div>

      {have.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold text-accent">Already in your résumé</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {have.map((c) => (
              <span key={c.term} className="rounded-lg bg-accent/10 px-2 py-1 text-xs font-medium text-accent">
                {c.term} <span className="font-mono opacity-70">{c.pct}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Only add a term if the work behind it is genuinely yours. A word you cannot speak to in the
        interview costs more than the ranking it buys.
      </p>
    </div>
  )
}

function TermRow({ c }: { c: TermCoverage }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-sm text-primary">{c.term}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <span className="block h-full rounded-full bg-primary/60" style={{ width: `${c.pct}%` }} />
      </span>
      <span className="w-24 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
        {c.pct}% · {c.count} ads
      </span>
    </div>
  )
}
