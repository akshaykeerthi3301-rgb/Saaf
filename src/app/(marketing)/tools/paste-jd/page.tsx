import type { Metadata } from 'next'
import Link from 'next/link'
import { DocPage } from '@/components/features/doc-page'
import { JdMatchForm } from '@/components/features/jd-match-form'

/**
 * TASK-060 — "Should I apply?" for a posting we do not have.
 *
 * Saaf's shortlist can only score what the daily pipeline indexed. This scores
 * a role found anywhere — a WhatsApp forward, a referral, a board we do not
 * crawl — through the SAME scorer, so the two numbers are comparable by
 * construction rather than by coincidence.
 *
 * ⚠️ IT IS FIVE COMPONENTS HERE, NOT THE SHORTLIST'S SIX. src/lib/jd-match.ts
 * omits work mode: workModeFit() awards full marks when no preference is set,
 * and nobody sets one when pasting a JD, so including it handed every result 7
 * free points. The total is normalised over the components that apply, so the
 * two surfaces stay comparable — but DO NOT reintroduce a component count into
 * the copy below. It said "six-component" until 2026-09-08 while the panel
 * rendered five, on the one page whose whole pitch is that the number can be
 * checked rather than taken. A reader who counted the rows caught us.
 *
 * PUBLIC AND UNAUTHENTICATED ON PURPOSE. src/proxy.ts's matcher does not cover
 * /tools, so no session is required and none is created. That is the point: the
 * tool has to be useful before anybody signs up, which is also why it stores
 * nothing — see src/app/actions/jd-match.ts for what makes that safe.
 */
export const metadata: Metadata = {
  title: 'Should I apply? — Saaf',
  description:
    'Paste any job description and your résumé. Get the same match score Saaf uses, with the working shown. Free, no sign-up, nothing stored.',
}

export default function PasteJdPage() {
  return (
    <DocPage eyebrow="Paste a JD" title="Should I apply?">
      <p className="mt-6 text-sm leading-6 text-muted-foreground">
        Paste any posting and your résumé. You get the same score the shortlist
        uses, broken into its parts, the one line explaining it, and the
        sentences we read it out of — so you can check the number rather than
        take it.
      </p>

      {/* The three promises, said once, before anything is typed rather than
          after. A résumé box on a public page is the moment a visitor decides
          whether to trust this, and the answer has to be above the box. */}
      <ul className="mt-5 space-y-2 border-l-2 border-accent/30 pl-4 text-sm leading-6 text-muted-foreground">
        <li>No sign-up, no email, ₹0.</li>
        <li>
          Nothing is stored. Your résumé is read in the request and dropped when it
          ends — contact details are stripped before any of it is read.
        </li>
        <li>Every number opens to show where it came from, including what we could not read.</li>
      </ul>

      <JdMatchForm />

      <p className="mt-10 border-t border-border pt-6 text-xs leading-5 text-muted-foreground">
        This scores one posting you already found. To get scored roles daily
        without hunting for them,{' '}
        <Link href="/" className="font-semibold text-primary hover:underline">
          see what Saaf does
        </Link>
        . How we read postings is published on the{' '}
        <Link href="/audit" className="font-semibold text-primary hover:underline">
          index audit
        </Link>
        .
      </p>
    </DocPage>
  )
}
