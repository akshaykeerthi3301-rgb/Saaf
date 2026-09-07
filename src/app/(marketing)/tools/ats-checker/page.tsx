import type { Metadata } from 'next'
import Link from 'next/link'
import { DocPage } from '@/components/features/doc-page'
import { AtsCheckForm } from '@/components/features/ats-check-form'

/**
 * TASK-061 — "will a machine read this?"
 *
 * The sibling of /tools/paste-jd, and public for the same reason: it has to be
 * useful before anybody signs up. src/proxy.ts's matcher does not cover /tools,
 * so no session is required and none is created.
 *
 * ⚠️ NO LANGUAGE MODEL IS ON THIS PATH AT ALL — unlike paste-jd, which uses one
 * to read skills. Every finding is a rule with a reason and a line quoted from
 * the candidate's own document. That is a product decision before it is a cost
 * one: a model asked "is this résumé good?" returns confident advice it cannot
 * justify, and a checker that cannot show the line it objected to is a
 * horoscope. It also means this surface costs nothing to run and cannot be
 * made to hallucinate a defect that is not in the file.
 *
 * The strongest panel is not the score — it is "what a parser read out of it",
 * which reuses src/lib/parse/extract.ts, the same parser onboarding uses. A
 * candidate seeing `Current title: nothing` next to a résumé that plainly
 * states their title has learned something no advice article can tell them.
 */
export const metadata: Metadata = {
  title: 'ATS résumé checker — Saaf',
  description:
    'Paste your résumé and see exactly what an applicant tracking system reads out of it. Deterministic, no AI, free, nothing stored.',
}

export default function AtsCheckerPage() {
  return (
    <DocPage eyebrow="Résumé checker" title="Will a machine read this?">
      <p className="mt-6 text-sm leading-6 text-muted-foreground">
        Most applications are read by a parser before a person sees them. Paste
        your résumé and you get what that parser extracts, every place it will
        struggle, and the specific change that fixes each one — with the line
        from your own document that caused it.
      </p>

      <ul className="mt-6 space-y-2 border-l-2 border-accent/30 pl-4 text-sm leading-6 text-muted-foreground">
        <li>No sign-up, no email, ₹0.</li>
        <li>
          Nothing is stored. Your résumé is read in the request and dropped when it ends.
        </li>
        <li>
          <strong className="font-semibold text-primary">No AI is involved.</strong> Every
          finding is a rule with a reason, so it can be checked rather than trusted.
        </li>
      </ul>

      <AtsCheckForm />

      <p className="mt-10 border-t border-border pt-6 text-xs leading-5 text-muted-foreground">
        A readable résumé is only half the question — the other half is whether the
        role is worth the application at all. To score one you have already found,
        use <Link href="/tools/paste-jd" className="text-primary underline underline-offset-4">Should I apply?</Link>{' '}
        To get scored roles daily without hunting for them,{' '}
        <Link href="/" className="text-primary underline underline-offset-4">see what Saaf does</Link>.
      </p>
    </DocPage>
  )
}
