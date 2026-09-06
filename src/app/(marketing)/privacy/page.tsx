import Link from 'next/link'

function Section({ children }: { children: React.ReactNode }) {
  return <section style={{ marginTop: 'var(--space-xl)' }}>{children}</section>
}
const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ fontSize: 'var(--type-headline-md-size)', fontWeight: 'var(--type-headline-md-weight)', margin: '0 0 var(--space-sm)' }}>{children}</h2>
)
const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-md-size)', maxWidth: '65ch', margin: '0 0 var(--space-md)' }}>
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
  const providerLabel = PROVIDER_LABEL[activeProvider() ?? 'gemini']

  return (
    <main className="measure" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 'var(--space-xl)' }}>
      <h1 style={{ fontSize: 'var(--type-display-lg-size)', fontWeight: 'var(--type-display-lg-weight)', margin: '0 0 var(--space-md)' }}>
        Privacy
      </h1>
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
        <P>
          What that provider may do with it, taken from their own terms rather
          than from our summary of them. Groq is <em>not permitted to use inputs or
          outputs to train or fine-tune any model</em> unless we explicitly grant
          permission, and we have not. Inference requests are <em>not retained by
          default</em>; logs are created only when troubleshooting an error or
          investigating suspected abuse, and are kept for up to 30 days unless a law
          requires longer. You keep the intellectual property in anything you send
          and anything returned.
        </P>
        <P>
          One thing worth knowing plainly, because it is the part most likely to
          matter to you: <strong>that processing happens on servers in the United
          States</strong>, not in India. If that is not acceptable to you, use
          &ldquo;Type it in instead&rdquo; on the upload screen — nothing is sent
          anywhere, and the only thing you lose is the pre-filling.
        </P>
        <P>
          If you would rather no third party saw it at all, use &ldquo;Type it in
          instead&rdquo; on the upload screen. Nothing is sent anywhere, and you lose
          only the pre-filling.
        </P>
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

      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-sm-size)', marginTop: 'var(--space-xl)' }}>
        Last updated September 2026.
      </p>
    </main>
  )
}
