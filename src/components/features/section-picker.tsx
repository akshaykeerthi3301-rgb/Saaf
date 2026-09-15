'use client'

import { Check } from 'lucide-react'
import { Card, Eyebrow } from '@/components/ui/card'
import type { GapTerm } from '@/lib/gap-table'
import type { ResumeSections } from '@/lib/parse/sections'

/**
 * Stage 3 of the Résumé Studio: what the candidate wants changed.
 *
 * ⚠️ THIS SCREEN EXISTS TO MAKE THE COST VISIBLE BEFORE IT IS SPENT. Stages 1,
 * 2 and 4 are free; stage 5 is the only model call in the product's résumé path
 * and a whole-document rewrite is ~1,360 tokens against a ceiling of 8,000 per
 * minute shared site-wide (`llm.ts:200`). Choosing sections first means the
 * spend tracks what was actually asked for rather than rewriting three sections
 * to fix one.
 *
 * ⚠️ SKILLS IS MARKED FREE, AND THE LABEL IS LOAD-BEARING. `reorderSkills()`
 * is a stable sort against words the posting already uses — it adds nothing and
 * removes nothing, so it cannot fabricate and costs no tokens. A candidate
 * should be able to take that and stop. Hiding it among options that DO spend
 * would make this screen an upsell, which is the one thing a ₹0 product cannot
 * afford to look like.
 *
 * ⚠️ THE EMPTY STATE IS BETTER THAN THE CATEGORY LEADER'S AND THAT IS THE POINT.
 * Their picker lists missing keywords with no provenance. Ours can say how many
 * separate employers name each term, because we hold the index — see
 * `skillDispersion()`. A term with no figure renders bare rather than as a zero.
 */

export type SectionKey = 'summary' | 'skills' | 'experience'

export type Selection = {
  sections: Set<SectionKey>
  terms: Set<string>
}

type SectionDef = {
  key: SectionKey
  label: string
  /** True when no model is involved. Shown, because it changes the decision. */
  free: boolean
  describe: (s: ResumeSections) => string
  available: (s: ResumeSections) => boolean
}

const SECTIONS: SectionDef[] = [
  {
    key: 'summary',
    label: 'Summary',
    free: false,
    describe: (s) =>
      s.summary
        ? `${s.summary.trim().split(/\s+/).length} words today`
        : 'You do not have one — a parser has nothing to read first',
    available: () => true,
  },
  {
    key: 'skills',
    label: 'Skills',
    free: true,
    describe: (s) =>
      s.skills.length
        ? `${s.skills.length} listed — reordered so the ones this job names come first`
        : 'No skills section found',
    available: (s) => s.skills.length > 0,
  },
  {
    key: 'experience',
    label: 'Experience',
    free: false,
    describe: (s) => {
      const bullets = s.experience.reduce((n, e) => n + e.bullets.length, 0)
      return `${s.experience.length} ${s.experience.length === 1 ? 'role' : 'roles'}, ${bullets} ${bullets === 1 ? 'line' : 'lines'}`
    },
    available: (s) => s.experience.length > 0,
  },
]

export function SectionPicker({
  sections,
  terms,
  selection,
  onToggleSection,
  onToggleTerm,
}: {
  sections: ResumeSections
  /** Missing terms from the gap table's skills row. Empty without a posting. */
  terms: GapTerm[]
  selection: Selection
  onToggleSection: (key: SectionKey) => void
  onToggleTerm: (term: string) => void
}) {
  const missing = terms.filter((t) => !t.present)
  const free = [...selection.sections].every((k) => SECTIONS.find((s) => s.key === k)?.free)

  return (
    <Card>
      <Eyebrow>What should change</Eyebrow>
      <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-primary">
        Pick the parts worth rewriting.
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Nothing here happens yet. Reordering your skills costs nothing and never invents a word;
        rewriting prose asks a model, so it is worth choosing rather than taking wholesale.
      </p>

      <div className="mt-5 flex flex-col gap-2">
        {SECTIONS.map((def) => {
          const on = selection.sections.has(def.key)
          const usable = def.available(sections)
          return (
            <button
              key={def.key}
              type="button"
              role="checkbox"
              aria-checked={on}
              disabled={!usable}
              onClick={() => onToggleSection(def.key)}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                on ? 'border-accent/50 bg-accent/5' : 'border-border bg-card hover:border-foreground/30'
              } ${usable ? '' : 'cursor-not-allowed opacity-50'}`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${
                  on ? 'border-accent bg-accent text-white' : 'border-input bg-card'
                }`}
              >
                {on ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-primary">{def.label}</span>
                  {def.free && (
                    <span className="rounded-lg bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      no model
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {def.describe(sections)}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {missing.length > 0 && (
        <div className="mt-6 border-t border-border pt-5">
          <p className="text-sm font-semibold text-primary">Terms this posting names that you do not</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Pick only the ones the work behind them is genuinely yours. The figure is how many
            separate employers in our index name that term — a word you cannot speak to in the
            interview costs more than the ranking it buys.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {missing.map((t) => {
              const on = selection.terms.has(t.term)
              return (
                <button
                  key={t.term}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => onToggleTerm(t.term)}
                  className={`rounded-lg border px-2 py-1 text-xs transition-colors ${
                    on
                      ? 'border-accent/50 bg-accent/10 font-medium text-accent'
                      : 'border-border bg-card text-primary hover:border-foreground/30'
                  }`}
                >
                  {on ? '✓ ' : ''}
                  {t.term}
                  {t.boards !== undefined && (
                    <span className="ml-1 font-mono text-[11px] tabular-nums opacity-70">
                      {t.boards}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
        {selection.sections.size === 0 && selection.terms.size === 0
          ? 'Nothing selected. You can skip this step entirely — the fixes in the next one are free and need no selection.'
          : free
            ? 'Everything you have selected is deterministic. No model will run.'
            : 'Rewriting prose runs one model call. Every line it returns is shown beside what it replaced, and anything it could not ground in your own document is thrown out and listed.'}
      </p>
    </Card>
  )
}
