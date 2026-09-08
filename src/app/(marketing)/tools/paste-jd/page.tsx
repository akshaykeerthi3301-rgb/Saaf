import type { Metadata } from 'next'
import Link from 'next/link'
import { ToolPage } from '@/components/features/tool-page'
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
 *
 * Moved off DocPage on 2026-09-08 — see src/components/features/tool-page.tsx.
 */
export const metadata: Metadata = {
  title: 'Should I Apply? — Free Job Match Score for Any Posting | Saaf',
  description:
    'Paste any job description and your resume. Get a match score broken into its parts, with the sentences we read it out of — so you can check the number rather than take it. Free, no sign-up, nothing stored.',
  keywords: [
    'job match score',
    'should I apply',
    'resume job description match',
    'JD match checker',
    'job fit score',
  ],
  alternates: { canonical: '/tools/paste-jd' },
  openGraph: {
    title: 'Should I Apply? — Free Job Match Score for Any Posting',
    description:
      'Paste a job description and your resume. Get a match score that shows its working.',
    url: '/tools/paste-jd',
    type: 'website',
  },
}

export default function PasteJdPage() {
  return (
    <ToolPage
      eyebrow="Free match score"
      title="Should I apply?"
      standfirst="Paste any posting and your résumé. You get the same score the shortlist uses, broken into its parts, the one line explaining it, and the sentences we read it out of."
      promises={
        <>
          <li>No sign-up, no email, ₹0.</li>
          <li>
            Nothing is stored. Your résumé is read in the request and dropped when it
            ends — contact details are stripped before any of it is read.
          </li>
          <li>Every number opens to show where it came from, including what we could not read.</li>
        </>
      }
      footer={
        <p className="text-sm leading-6 text-muted-foreground">
          Before you apply anywhere, check that a machine can read your résumé at all —{' '}
          <Link
            href="/tools/ats-checker"
            className="font-semibold text-primary underline underline-offset-4"
          >
            run the free ATS check
          </Link>
          . To get scored roles daily without hunting for them,{' '}
          <Link href="/" className="font-semibold text-primary underline underline-offset-4">
            see what Saaf does
          </Link>
          . How we read postings is published on the{' '}
          <Link href="/audit" className="font-semibold text-primary underline underline-offset-4">
            index audit
          </Link>
          .
        </p>
      }
    >
      <JdMatchForm />
    </ToolPage>
  )
}
