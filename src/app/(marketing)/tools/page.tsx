import type { Metadata } from 'next'
import Link from 'next/link'
import { FileSearch, ListChecks, Target } from 'lucide-react'
import { ToolPage } from '@/components/features/tool-page'

/**
 * The free-tools hub.
 *
 * Two jobs. First, it is a real destination for a visitor who arrives on one
 * tool and wonders what else is here — before this existed, the only route
 * between the two was a sentence in a footer. Second, it gives the tools an
 * internal link structure: a crawler that finds one page now finds both, and
 * both link back, which is the cheapest ranking signal available.
 *
 * Deliberately thin. It exists to route, not to sell — the tools do that
 * themselves, and a hub that repeats their pitch just adds a page between the
 * visitor and the box they came to type in.
 */
export const metadata: Metadata = {
  title: 'Free Resume & Job Search Tools — No Sign-up | Saaf',
  description:
    'Free tools for Indian job seekers: check your resume ATS score, and score any job posting against your resume. No sign-up, nothing stored, ₹0.',
  alternates: { canonical: '/tools' },
  openGraph: {
    title: 'Free Resume & Job Search Tools — No Sign-up',
    description:
      'Check your resume ATS score, and score any job posting against your resume. Free, no sign-up.',
    url: '/tools',
    type: 'website',
  },
}

const TOOLS = [
  {
    href: '/tools/ats-checker',
    icon: FileSearch,
    name: 'ATS resume score checker',
    what: 'See exactly what an applicant tracking system reads out of your résumé, every place it will struggle, and the line causing each problem.',
    note: 'No AI. Every finding is a rule you can check.',
  },
  {
    href: '/tools/paste-jd',
    icon: Target,
    name: 'Should I apply?',
    what: 'Paste any job description and your résumé, and get a match score broken into its parts — with the sentences from the posting each part came from.',
    note: 'The same scorer the signed-in shortlist uses.',
  },
  {
    href: '/tools/resume-keywords',
    icon: ListChecks,
    name: 'Résumé keywords by role',
    what: 'For each role, the words its real job postings use most and the share of postings that contain each — counted, not guessed.',
    note: 'Measured across the postings Saaf reads.',
  },
]

export default function ToolsHubPage() {
  return (
    <ToolPage
      eyebrow="Free tools"
      title="Three free tools. No account needed."
      standfirst="None needs a sign-up; none stores what you paste; all cost ₹0. They are the same machinery the product runs on — not a demo of it."
      promises={
        <>
          <li>No sign-up, no email, ₹0.</li>
          <li>Nothing you paste is stored, on any tool.</li>
          <li>Every number opens to show where it came from.</li>
        </>
      }
      footer={
        <p className="text-sm leading-6 text-muted-foreground">
          These answer one question each. To get roles scored for you daily, without
          hunting for them,{' '}
          <Link href="/" className="font-semibold text-primary underline underline-offset-4">
            see what Saaf does
          </Link>
          .
        </p>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map(({ href, icon: Icon, name, what, note }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-foreground/20 sm:p-6"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
              <Icon className="size-4" />
            </span>
            <h2 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-primary">{name}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{what}</p>
            <p className="mt-3 text-xs font-medium text-accent">{note}</p>
          </Link>
        ))}
      </div>
    </ToolPage>
  )
}
