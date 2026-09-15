'use client'

import { useState } from 'react'
import { Check, ChevronDown, Minus, X } from 'lucide-react'
import { Card, Eyebrow } from '@/components/ui/card'
import type { GapRow, GapStatus, GapTable as GapTableData } from '@/lib/gap-table'

/**
 * Stage 2 of the Résumé Studio: this posting, beside this résumé.
 *
 * ⚠️ SIDE-BY-SIDE IS THE HOUSE FORMAT, NOT A BORROWED ONE.
 * `productos/design/1-Product-Identity.md:157-168` calls it "the hero format…
 * one recurring composition, used everywhere" and "arithmetic visible — always
 * show the subtraction". The audit strip, the score breakdown and the refusal
 * report are all this shape already. What is new here is only what is being
 * subtracted.
 *
 * ⚠️ THE STATUS IS A WORD AND A GLYPH. IT IS NEVER A COLOUR, and that is the
 * one place this screen deliberately diverges from every competitor's version
 * of it. `docs/DESIGN.md:397` forbids a green/red/amber trio, `:212-217` says
 * the single accent "never carries a match outcome", and `:393` reserves
 * destructive for system errors. A red row would tell a candidate that a
 * posting asking for ten years is an emergency; it is a fact. The one use of
 * accent below is on a term the résumé ALREADY CONTAINS — a confirmed state,
 * which is exactly what the token is for.
 *
 * ⚠️ EVERY ROW OPENS INTO WHERE IT CAME FROM. A closed row is a claim; an open
 * one shows the sentence in the posting it was read from and the terms behind
 * the count. That is the difference between this and a score: the candidate can
 * check it, and this repository's whole argument is that a number they cannot
 * check is worth less than no number.
 */

const STATUS_WORD: Record<GapStatus, string> = {
  match: 'answered',
  partial: 'partly',
  gap: 'not answered',
  unknown: 'not stated',
}

function StatusMark({ status }: { status: GapStatus }) {
  const Icon = status === 'match' ? Check : status === 'gap' ? X : Minus
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon
        className={`size-3.5 shrink-0 ${status === 'unknown' ? 'text-muted-foreground' : 'text-primary'}`}
        aria-hidden="true"
      />
      <span
        className={`text-xs ${
          status === 'gap' ? 'font-semibold text-primary' : 'text-muted-foreground'
        }`}
      >
        {STATUS_WORD[status]}
      </span>
    </span>
  )
}

export function GapTable({ table, roleName }: { table: GapTableData; roleName?: string }) {
  const [open, setOpen] = useState<string>()

  return (
    <Card>
      <Eyebrow>This job, beside your résumé</Eyebrow>
      <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-primary">
        {/*
          ⚠️ THE DENOMINATOR IS DELIBERATELY ABSENT. A first version read "1 of
          4 things this posting asks for", which overstated twice: it agreed the
          verb with the wrong number ("1 of 4 thing"), and it counted the rows
          the posting is SILENT on among the things it asks for. A posting that
          states nothing about a qualification has not asked for one.
        */}
        {table.gaps > 0
          ? `${table.gaps} ${table.gaps === 1 ? 'thing' : 'things'} this posting states ${table.gaps === 1 ? 'is' : 'are'} not answered on your résumé.`
          : table.unknowns > 0
            ? /*
                ⚠️ WEAKER ON PURPOSE WHEN ROWS ARE UNKNOWN. "Answers everything
                this posting states" read as a clean bill of health while two of
                four rows said "not stated" — measured in a browser 2026-09-15
                against an advert that asked for "6+ years building distributed
                systems". `extractAll()` will not read a bar from that phrasing
                without "of experience", and refusing a low-confidence
                extraction is the gate engine's documented policy. The table is
                right to stay silent; the headline was wrong to sound certain.
              */
              'Nothing this posting clearly states goes unanswered on your résumé.'
            : 'Your résumé answers everything this posting states.'}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {/*
          The silent rows are named rather than hidden. A table that quietly
          drops the dimensions a posting did not mention reads as though it
          checked four things and found three — which overstates what we know.
        */}
        Read from the posting you pasted and the document we parsed — nothing here was generated.
        {table.unknowns > 0 && (
          <>
            {' '}
            {table.unknowns} {table.unknowns === 1 ? 'row is' : 'rows are'} marked{' '}
            <span className="font-semibold text-primary">not stated</span>: this posting does not say,
            so neither do we.
          </>
        )}
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[440px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="w-[26%] pb-2 pr-3">
                <Eyebrow>Dimension</Eyebrow>
              </th>
              <th scope="col" className="w-[28%] pb-2 pr-3">
                <Eyebrow>This job</Eyebrow>
              </th>
              <th scope="col" className="w-[28%] pb-2 pr-3">
                <Eyebrow>Your résumé</Eyebrow>
              </th>
              <th scope="col" className="pb-2">
                <span className="sr-only">Result</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <Row
                key={row.id}
                row={row}
                open={open === row.id}
                onToggle={() => setOpen((cur) => (cur === row.id ? undefined : row.id))}
              />
            ))}
          </tbody>
        </table>
      </div>

      {roleName && (
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Skill terms are measured across every {roleName} posting we index, not recommended. A term
          is listed only when at least twelve separate employers name it in their own words.
        </p>
      )}
    </Card>
  )
}

function Row({ row, open, onToggle }: { row: GapRow; open: boolean; onToggle: () => void }) {
  const detailId = `gap-${row.id}-detail`

  return (
    <>
      <tr className="border-b border-border">
        <th scope="row" className="py-3 pr-3 align-top">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={detailId}
            className="inline-flex items-center gap-1.5 text-left text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {row.label}
            <ChevronDown
              className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </th>
        <td className="py-3 pr-3 align-top text-sm text-primary">
          {row.job ?? <span className="italic text-muted-foreground">does not say</span>}
        </td>
        <td className="py-3 pr-3 align-top text-sm text-primary">
          {row.resume ?? <span className="italic text-muted-foreground">nothing read</span>}
        </td>
        <td className="py-3 align-top">
          <StatusMark status={row.status} />
        </td>
      </tr>

      {open && (
        <tr id={detailId} className="border-b border-border">
          <td colSpan={4} className="bg-secondary/50 px-3 py-4">
            <p className="text-sm leading-6 text-muted-foreground">{row.note}</p>

            {row.evidence && (
              <blockquote className="mt-3 border-l-2 border-accent/40 pl-3">
                <p className="text-sm italic leading-6 text-primary">
                  &ldquo;{row.evidence.trim()}&rdquo;
                </p>
                <footer className="mt-1 text-xs text-muted-foreground">
                  — the sentence in the posting this row was read from
                </footer>
              </blockquote>
            )}

            {row.terms && row.terms.length > 0 && <Terms terms={row.terms} />}
          </td>
        </tr>
      )}
    </>
  )
}

function Terms({ terms }: { terms: NonNullable<GapRow['terms']> }) {
  const present = terms.filter((t) => t.present)
  const missing = terms.filter((t) => !t.present)

  return (
    <div className="mt-4 flex flex-col gap-3">
      {missing.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-primary">
            Named by this posting, not on your résumé
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {missing.map((t) => (
              <span
                key={t.term}
                className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-primary"
              >
                {t.term}
                {/*
                  The dispersion figure is the thing a tool reading one advert
                  cannot print, so it goes beside the term rather than in a
                  footnote. Absent when the term is outside the measured
                  vocabulary — a 0 there would read as a measurement.
                */}
                {t.boards !== undefined && (
                  <span className="ml-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {t.boards}
                  </span>
                )}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            The figure is how many separate employers in our index name that term. Fix the
            widely-named ones first — and only add one if the work behind it is genuinely yours. A
            word you cannot speak to in the interview costs more than the ranking it buys.
          </p>
        </div>
      )}

      {present.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-accent">Already on your résumé</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {present.map((t) => (
              <span
                key={t.term}
                className="rounded-lg bg-accent/10 px-2 py-1 text-xs font-medium text-accent"
              >
                {t.term}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
