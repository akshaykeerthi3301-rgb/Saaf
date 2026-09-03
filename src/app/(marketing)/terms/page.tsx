import Link from 'next/link'

function Section({ children }: { children: React.ReactNode }) {
  return <section style={{ marginTop: 'var(--space-xl)' }}>{children}</section>
}
const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ fontSize: 'var(--type-headline-md-size)', fontWeight: 500, margin: '0 0 12px' }}>{children}</h2>
)
const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-md-size)', maxWidth: '65ch', margin: '0 0 12px' }}>
    {children}
  </p>
)

export const metadata = { title: 'Terms — Saaf' }

/**
 * A plain description of how the product works and what's expected of you —
 * not a lawyer-drafted contract, in keeping with the same honesty the footer
 * already applies to compliance badges ("we hold no SOC 2 or GDPR
 * certification and will not display marks we have not earned").
 */
export default function TermsPage() {
  return (
    <main className="measure" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 'var(--space-xl)' }}>
      <h1 style={{ fontSize: 'var(--type-display-lg-size)', fontWeight: 300, margin: '0 0 16px' }}>
        Terms
      </h1>
      <P>
        This is a plain description of how Saaf works and what to expect from it —
        not a lawyer-drafted contract. See <Link href="/privacy">Privacy</Link> for
        how your data is handled.
      </P>

      <Section>
        <H2>What this is</H2>
        <P>
          A free tool that removes roles you&apos;re structurally disqualified from
          and ranks what&apos;s left. Saaf never applies on your behalf, never
          contacts an employer, and never claims to guarantee an interview or an
          offer — it answers one question: which of these deserves your next
          forty minutes.
        </P>
      </Section>

      <Section>
        <H2>The roles you see</H2>
        <P>
          Pulled directly from Indian companies&apos; own public hiring-board APIs.
          Every apply link takes you to that employer&apos;s own application page —
          Saaf is not the employer and doesn&apos;t control whether a posting stays
          accurate or open. A role can close between being shown to you and you
          clicking apply; that&apos;s the source posting changing, not Saaf.
        </P>
      </Section>

      <Section>
        <H2>Your account</H2>
        <P>
          Free permanently — no card is ever requested, no paid tier exists.
          Delete your account in one click, any time, no email confirmation
          required.
        </P>
      </Section>

      <Section>
        <H2>Fair use</H2>
        <P>
          Saaf is for your own job search. Please don&apos;t scrape, resell, or
          bulk-extract the matched results or the underlying role registry —
          that registry is maintained by hand and is the thing that makes the
          product possible at ₹0.
        </P>
      </Section>

      <Section>
        <H2>No guarantees</H2>
        <P>
          Matching, résumé parsing, and every gate are done in good faith and the
          reasoning is shown to you — but Saaf can&apos;t guarantee every posting is
          accurate, can&apos;t guarantee a role stays open, and isn&apos;t liable for
          outcomes from decisions made using it.
        </P>
      </Section>

      <Section>
        <H2>Changes</H2>
        <P>
          The product may change, and this page will change with it rather than
          silently drift out of date. Saaf remains free and remains a
          pre-application tool — that much doesn&apos;t change.
        </P>
      </Section>

      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-sm-size)', marginTop: 'var(--space-xl)' }}>
        Last updated September 2026.
      </p>
    </main>
  )
}
