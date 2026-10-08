import type { Metadata } from 'next'
import Link from 'next/link'
import { ToolPage } from '@/components/features/tool-page'
import { AtsFlow } from '@/components/features/ats-flow'

/**
 * TASK-061 — the ATS résumé score checker, and the product's acquisition hook.
 *
 * ⚠️ THIS PAGE IS THE TOP OF THE FUNNEL, NOT A UTILITY. People arrive here from
 * a search for "ATS score checker", "resume score" or "ATS score" — they have
 * not heard of Jobinko and did not come looking for a job board. Everything below
 * is arranged for that visitor: the tool above the fold, the trust answers
 * beside it rather than in front of it, and one way further in at the moment
 * they have just been told what is wrong with their résumé.
 *
 * It is deliberately NOT wrapped in DocPage — see src/components/features/tool-page.tsx
 * for why that shell is wrong for a page that has to sell rather than be read.
 *
 * ⚠️ NO LANGUAGE MODEL DECIDES THE SCORE — AND THAT CLAIM WAS NARROWED ON
 * 2026-09-08 RATHER THAN DROPPED. Until the rewrite shipped, this page said "no
 * AI is involved" and it was true of everything on it. It is now true of the
 * upload, the parse, the score and every finding, and false of one step: the
 * optional rewrite the candidate asks for after reading their report, which is
 * a model call and is labelled as one where it sits.
 *
 * Leaving the old sentence up would have been the cheapest possible lie — the
 * page's whole argument is that a number you cannot reproduce is worthless, and
 * a promise the product no longer keeps is the same failure one level up. The
 * narrowed claim is also the stronger one: a model asked "is this résumé good?"
 * returns confident advice it cannot justify, so the DIAGNOSIS stays
 * deterministic, checkable and free to run, while the WRITING — where a model
 * is genuinely better than a regex — is done by one, under a filter that shows
 * every line it refused.
 *
 * The strongest panel is not the score — it is "what a parser read out of it",
 * which reuses src/lib/parse/extract.ts, the same parser onboarding uses. A
 * candidate seeing `Current title: nothing` next to a résumé that plainly
 * states their title has learned something no advice article can tell them.
 */

/**
 * ⚠️ THE TITLE CARRIES THE PHRASE PEOPLE ACTUALLY TYPE, not the phrase we would
 * choose. It read "ATS résumé checker — Jobinko" while the queries this page has to
 * win are "ATS score checker", "resume score checker" and "ATS score". A title
 * that does not contain the search phrase does not get the click even when it
 * ranks. The é is deliberately absent from the title string — nobody types it.
 */
export const metadata: Metadata = {
  title: 'ATS Resume Score Checker — Free, Instant, No Sign-up | Jobinko',
  description:
    'Check your ATS score free. Upload your resume as a PDF or Word file and see exactly what an applicant tracking system reads out of it, every place it will fail to parse, and the fix for each — then get it rewritten for the role you want. No sign-up, nothing stored.',
  keywords: [
    'ATS score checker',
    'ATS resume checker',
    'resume score checker',
    'ATS score',
    'resume checker India',
    'free ATS checker',
    'applicant tracking system checker',
  ],
  alternates: { canonical: '/tools/ats-checker' },
  openGraph: {
    title: 'ATS Resume Score Checker — Free, Instant, No Sign-up',
    description:
      'See exactly what an applicant tracking system reads out of your resume — and the specific line causing each problem.',
    url: '/tools/ats-checker',
    type: 'website',
  },
}

/**
 * FAQ structured data.
 *
 * Every answer below is already true of the page and is stated on it in prose —
 * this marks it up so a search engine can read it, it does not add a claim. If
 * the product changes, these change with it: schema that disagrees with the page
 * is worse than no schema, and Google treats it as a reason to distrust both.
 */
const faqs = [
  {
    q: 'What is a good ATS score?',
    a: 'There is no industry-standard number — each applicant tracking system parses differently. What matters is whether a parser can read your name, title, employer and dates at all. This checker shows you exactly what it extracted, so you can judge that yourself rather than trusting a score.',
  },
  {
    q: 'Is this ATS checker really free?',
    a: 'Yes. No sign-up, no email, no card, and no paid tier. The check runs as a set of deterministic rules on our own server, so it costs us almost nothing to run.',
  },
  {
    q: 'Do you store my resume?',
    a: 'No. Your resume text is read in the request and dropped when it ends. It is never written to storage and never logged.',
  },
  {
    q: 'Does this use AI to check my resume?',
    a: 'Not for the score. Every finding is a rule with a reason and a quoted line from your own document, so you can check it rather than trust it. A model is used for one optional step — rewriting your resume after you have read the report — and it may only reorder and reword what you already wrote. Anything it adds that is not in your own line is shown to you and reverted.',
  },
  {
    q: 'Why does my resume score badly when it looks fine?',
    a: 'Most parsing failures are invisible to a human reader — multi-column layouts, tables, text inside images, and headers built from separators all read cleanly on screen and collapse when a machine reads them. That is the gap this checker exists to show.',
  },
]

export default function AtsCheckerPage() {
  return (
    <>
      {/* JSON-LD, not visible markup. Next renders this into the body, which is
          valid for FAQPage and is what a crawler reads. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />

      <ToolPage
        eyebrow="Free ATS checker"
        title="Check your ATS resume score."
        standfirst="Most applications are read by a parser before a person sees them. Upload your resume, pick the role you are after, and see what that parser actually extracts — every place it will struggle, the specific change that fixes each one, and a rewritten version built from lines you already wrote."
        promises={
          <>
            <li>No sign-up, no email, ₹0.</li>
            <li>Nothing is stored. Your résumé is read in the request and dropped when it ends.</li>
            <li>
              <strong className="font-semibold text-primary">No model decides your score.</strong>{' '}
              Every finding is a rule with a reason, so it can be checked rather than trusted. The
              optional rewrite uses one, and shows you every line it refused to write.
            </li>
          </>
        }
        footer={
          <>
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-primary">
              Common questions
            </h2>
            <dl className="mt-5 space-y-5">
              {faqs.map((f) => (
                <div key={f.q}>
                  <dt className="text-sm font-semibold text-primary">{f.q}</dt>
                  <dd className="mt-1.5 text-sm leading-6 text-muted-foreground">{f.a}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-10 text-sm leading-6 text-muted-foreground">
              A readable résumé is only half the question — the other half is whether the
              role is worth the application at all. To score one you have already found,
              use{' '}
              <Link
                href="/tools/paste-jd"
                className="font-semibold text-primary underline underline-offset-4"
              >
                Should I apply?
              </Link>{' '}
              To get scored roles daily without hunting for them,{' '}
              <Link href="/" className="font-semibold text-primary underline underline-offset-4">
                see what Jobinko does
              </Link>
              .
            </p>
          </>
        }
      >
        <AtsFlow />
      </ToolPage>
    </>
  )
}
