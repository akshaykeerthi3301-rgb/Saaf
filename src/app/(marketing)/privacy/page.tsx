import Link from 'next/link'
import { DocPage } from '@/components/features/doc-page'

function Section({ children }: { children: React.ReactNode }) {
  return <section className="mt-12">{children}</section>
}
const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-3 text-lg font-semibold tracking-[-0.03em] text-primary">{children}</h2>
)
/* Inline links are styled here rather than globally: the new system has no
   blanket `a` rule, and these documents are the only prose that carries them. */
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-4 max-w-[65ch] text-sm leading-6 text-muted-foreground [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4">
    {children}
  </p>
)

export const metadata = { title: 'Privacy — Saaf' }

/**
 * This page states what the code above it already does — nothing on it is
 * aspirational. See docs/PRODUCT.md's three guarantees for the source text
 * this is drawn from, and src/app/actions/parse-resume.ts /
 * src/lib/delete-user.ts for where each claim is actually enforced.
 */
import { activeProvider, PROVIDER_LABEL } from '@/lib/parse/llm'

export default function PrivacyPage() {
  // Named from the configured provider, never hard-coded. A privacy page that
  // names the wrong recipient is worse than one that names none.
  //
  // NO DEFAULT. This read `activeProvider() ?? 'gemini'`, so an environment with
  // no key configured — which production was, right up to the first deploy —
  // published "we send the extracted text to Google's Gemini API" underneath a
  // paragraph about Groq's retention terms. Two false statements at once, on the
  // page whose entire job is being checkable. When nothing is configured, the
  // honest sentence is that nothing is sent.
  const provider = activeProvider()
  const providerLabel = provider ? PROVIDER_LABEL[provider] : null

  return (
    <DocPage eyebrow="How we handle your data" title="Privacy">
      <P>
        Saaf exists because a job search a candidate is hiding from their employer
        deserves to actually be hidden. Everything below is enforced in code, not
        promised in copy — the file references point at where.
      </P>

      <Section>
        <H2>Your résumé</H2>
        <P>
          Uploaded, parsed in memory, and deleted the moment parsing finishes. It is
          never written to storage and never logged. Only the fields you explicitly
          confirm on the next screen — current title, employer, years of experience,
          preferred role, skills, city, credential — are saved to your profile.
        </P>
        {provider === null ? (
          <P>
            <strong>No third party sees any of it.</strong> No model provider is
            configured on this deployment, so your résumé text is read by our own
            code and leaves our server for nowhere at all. Skills are the one thing
            fixed patterns cannot reliably read across arbitrary layouts, so you may
            need to add yours by hand on the confirmation screen.
          </P>
        ) : (
          <>
            <P>
              One third party sees the text. To read your skills and industry, which
              fixed patterns cannot do across arbitrary résumé layouts, we send the
              extracted text to <strong>{providerLabel}</strong>, the model provider we
              currently use for this. Your email address, phone number and profile links
              are stripped out before it leaves our server, and the file itself is never
              sent — only text. Everything the model returns is shown to you for
              confirmation before any of it is stored, and you can delete any of it. If
              we change provider, this sentence changes with it.
            </P>
            {provider === 'groq' ? (
              <P>
                What that provider may do with it, taken from their own terms rather
                than from our summary of them. Groq is <em>not permitted to use inputs or
                outputs to train or fine-tune any model</em> unless we explicitly grant
                permission, and we have not. Inference requests are <em>not retained by
                default</em>, and we have additionally switched on{' '}
                <strong>Zero Data Retention</strong> on our account, which stops the
                troubleshooting and abuse-investigation logs that would otherwise be kept
                for up to 30 days. You keep the intellectual property in anything you send
                and anything returned.
              </P>
            ) : null}
            <P>
              One thing worth knowing plainly, because it is the part most likely to
              matter to you: <strong>that processing happens on servers in the United
              States</strong>, not in India. If that is not acceptable to you, use
              &ldquo;Type it in instead&rdquo; on the upload screen — nothing is sent
              anywhere, and the only thing you lose is the pre-filling.
            </P>
          </>
        )}
      </Section>

      <Section>
        <H2>Signing in</H2>
        <P>
          We ask for an email address to identify your account, nothing else.
          Signing in with Google reads only your email address to create or find
          your account — we never request, store, or display your name or photo
          from Google, and no other Google data is ever asked for.
        </P>
      </Section>

      <Section>
        <H2>What we never do</H2>
        <P>
          No employer is ever contacted. Nothing about your search is public or
          sold. No recruiter can find you here. We never accumulate a résumé
          corpus — the deletion above isn&apos;t a policy, it&apos;s the whole design.
        </P>
        <P>
          A disqualifying role reaching your list is a defect, not a judgement
          call — every recommendation carries a one-tap &ldquo;this shouldn&apos;t be
          here,&rdquo; and reports are triaged as bugs, not feedback.
        </P>
      </Section>

      <Section>
        <H2>Who else sees anything</H2>
        <P>
          Supabase hosts the database and handles sign-in. PostHog measures product
          usage with session recording and autocapture both switched off. Sentry
          reports errors with session replay off and request bodies stripped before
          they ever reach a report, so résumé text can&apos;t end up in a crash log.
          None of these receive your résumé, and none of them are permitted to sell
          or share what they do receive.
        </P>
      </Section>

      <Section>
        <H2>Your control</H2>
        <P>
          Delete your account in one click from your <Link href="/profile">profile</Link>,
          no email required. This removes your account and everything tied to it.
        </P>
      </Section>

      <p className="mt-12 text-xs leading-5 text-muted-foreground">
        Last updated September 2026.
      </p>
    </DocPage>
  )
}
