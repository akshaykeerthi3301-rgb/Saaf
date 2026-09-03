import Link from 'next/link'
import { AuditStrip } from '@/components/features/audit-strip'
import { AuthFragmentNotice } from '@/components/features/auth-fragment-notice'

const CTA = "Show me what's withheld"

function Section({ children, id }: { children: React.ReactNode; id?: string }) {
  return <section id={id} style={{ marginTop: 'var(--space-xl)' }}>{children}</section>
}
const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ fontSize: 'var(--type-headline-lg-size)', fontWeight: 400, margin: '0 0 12px' }}>{children}</h2>
)
const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-lg-size)', maxWidth: '62ch' }}>{children}</p>
)
const Cta = () => (
  <Link href="/signin" style={{
    display: 'inline-block', background: 'var(--color-primary)', color: 'var(--color-on-primary)',
    padding: '12px 24px', fontSize: 'var(--type-label-md-size)', fontWeight: 500,
    textDecoration: 'none', borderRadius: 'var(--rounded-none)',
  }}>{CTA}</Link>
)

export default function Landing() {
  return (
    <>
      <header style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
        <div className="measure" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 'var(--space-md)', paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)', flexWrap: 'wrap',
        }}>
          <strong style={{ fontSize: 'var(--type-headline-md-size)', fontWeight: 500 }}>Saaf</strong>
          <nav style={{ display: 'flex', gap: 'var(--space-md)', fontSize: 'var(--type-label-md-size)' }}>
            <a href="#how">How it works</a>
            <Link href="/audit">Gate audit</Link>
            <a href="#faq">FAQ</a>
            <Link href="/signin">Log in</Link>
          </nav>
        </div>
      </header>

      <main className="measure" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 'var(--space-xl)' }}>
        <AuthFragmentNotice />

        {/* Hero */}
        <h1 style={{
          fontSize: 'var(--type-display-lg-size)', fontWeight: 300,
          lineHeight: 1.3, letterSpacing: '-0.02em', margin: '0 0 16px', maxWidth: '18ch',
        }}>
          Nothing in your list is a job you can&apos;t get.
        </h1>
        <P>
          A free daily shortlist for Indian professionals in their first five years.
          We publish what we withheld, and why.
        </P>
        <div style={{ marginTop: 'var(--space-md)' }}><Cta /></div>

        {/* The refusal, side by side — the product's whole argument in one block */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          border: '1px solid var(--color-outline-variant)', marginTop: 'var(--space-lg)',
        }}>
          <div style={{ padding: 'var(--space-md)', borderRight: '1px solid var(--color-outline-variant)' }}>
            <span style={{
              fontSize: 'var(--type-label-sm-size)', fontWeight: 600, letterSpacing: 'var(--type-label-sm-ls)',
              textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: 8,
            }}>A job portal</span>
            <span style={{ fontSize: 'var(--type-body-lg-size)' }}>Staff Engineer · 8+ years required</span>
            <p style={{ marginTop: 12, fontSize: 'var(--type-body-sm-size)' }}><strong>★ TOP APPLICANT</strong></p>
          </div>
          <div style={{ padding: 'var(--space-md)' }}>
            <span style={{
              fontSize: 'var(--type-label-sm-size)', fontWeight: 600, letterSpacing: 'var(--type-label-sm-ls)',
              textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: 8,
            }}>Saaf</span>
            <span style={{
              fontSize: 'var(--type-body-lg-size)', color: 'var(--color-on-surface-variant)',
              textDecoration: 'line-through', textDecorationThickness: 1,
            }}>Staff Engineer</span>
            <p style={{ marginTop: 12, fontSize: 'var(--type-body-sm-size)', color: 'var(--color-on-surface-variant)' }}>
              Withheld — a staff-level role, above the band your profile sits in.
            </p>
          </div>
        </div>

        <AuditStrip />

        <Section>
          <H2>The match wasn&apos;t missing. It was wrong.</H2>
          <P>
            A portal called you a Top Applicant for a role asking fifteen years. You have two.
            You spent the forty minutes anyway, and heard nothing — same as the last thirty
            applications. Eight months in, you still don&apos;t know whether it was the résumé,
            the fit, or the timing.
          </P>
          <blockquote style={{
            borderLeft: '2px solid var(--color-outline)', paddingLeft: 'var(--space-md)',
            margin: 'var(--space-md) 0', fontSize: 'var(--type-body-lg-size)',
          }}>
            &ldquo;not even one call.&rdquo;
            <footer style={{ fontSize: 'var(--type-body-sm-size)', color: 'var(--color-on-surface-variant)', marginTop: 8 }}>
              Blind — Bangalore, 13+ years, 50+ applications across LinkedIn, Naukri and Instahyre
            </footer>
          </blockquote>
        </Section>

        <Section id="how">
          <H2>How it works</H2>
          {[
            ['We read your résumé once', 'Parsed to fill your profile, then deleted. You confirm every field before anything runs.'],
            ['We remove what you can’t get', 'Each function’s real disqualifier — a credential, an experience band, a stated seniority — applied as a hard filter, in plain code.'],
            ['We show you both lists', 'What cleared, ranked with reasons. And what we withheld, with the reason for each.'],
          ].map(([t, d], i) => (
            <div key={t} style={{ padding: 'var(--space-md) 0', borderBottom: '1px solid var(--color-outline-variant)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-on-surface-variant)', marginRight: 12 }}>{i + 1}</span>
              <strong style={{ fontSize: 'var(--type-body-lg-size)', fontWeight: 500 }}>{t}</strong>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-md-size)', margin: '6px 0 0' }}>{d}</p>
            </div>
          ))}
        </Section>

        <Section>
          <H2>What you get</H2>
          {[
            ['A credential can’t be stretched', 'Finance gates on CA, CFA or CS. We check the one that applies to you, not years for everyone.'],
            ['Every score carries its reason', '“72% — the job description’s three-year floor is your one gap.” No number arrives without its working.'],
            ['Nobody can find you here', 'Your file is deleted after parsing. No employer is contacted. Delete your account in one click, no email required.'],
          ].map(([t, d]) => (
            <div key={t} style={{ padding: 'var(--space-md) 0', borderBottom: '1px solid var(--color-outline-variant)' }}>
              <strong style={{ fontSize: 'var(--type-body-lg-size)', fontWeight: 500 }}>{t}</strong>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-md-size)', margin: '6px 0 0' }}>{d}</p>
            </div>
          ))}
        </Section>

        <Section>
          <H2>Free. Not free-for-now.</H2>
          <P>
            No card, no ads, and no paid tier hiding behind a feature you already use. Saaf is
            a portfolio project built to real-product standards, and it stays at ₹0.
          </P>
        </Section>

        <Section id="faq">
          <H2>Questions</H2>
          {[
            ['Naukri already says it matches me. Why is this different?', 'Because we’ll show you the roles we refused, and why. Open your own profile and check the first one against the job description. It takes thirty seconds.'],
            ['Can my employer find out I’m looking?', 'No. No employer is ever contacted, nothing here is public or sold, and no recruiter can search this. Delete your account in one click, no email required.'],
            ['What happens to my résumé?', 'It’s parsed once to fill your profile, then the file is deleted. Only the fields you confirm are stored.'],
            ['Why isn’t LinkedIn or Naukri in here?', 'Their terms don’t allow it. We pull from company hiring boards directly — which is why some roles you see elsewhere won’t appear here, and why we tell you how many we indexed.'],
          ].map(([q, a]) => (
            <div key={q} style={{ padding: 'var(--space-md) 0', borderBottom: '1px solid var(--color-outline-variant)' }}>
              <strong style={{ fontSize: 'var(--type-body-lg-size)', fontWeight: 500 }}>{q}</strong>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-md-size)', margin: '6px 0 0' }}>{a}</p>
            </div>
          ))}
        </Section>

        <Section>
          <H2>See what we won&apos;t show you.</H2>
          <div style={{ marginTop: 'var(--space-md)' }}><Cta /></div>
        </Section>
      </main>

      <footer style={{ borderTop: '1px solid var(--color-outline-variant)', marginTop: 'var(--space-xl)' }}>
        <div className="measure" style={{
          display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap',
          paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-lg)',
          fontSize: 'var(--type-body-sm-size)', color: 'var(--color-on-surface-variant)',
        }}>
          <Link href="/audit">Gate audit, updated daily</Link>
          <span>How we handle your data</span>
          <span>Delete your account</span>
        </div>
        <div className="measure" style={{
          paddingBottom: 'var(--space-lg)', fontSize: 'var(--type-body-sm-size)',
          color: 'var(--color-on-surface-variant)', maxWidth: '70ch',
        }}>
          No compliance badges: we hold no SOC 2 or GDPR certification and will not display marks
          we have not earned. Consent at upload, stated retention, deletion path; the source file
          is destroyed after parsing.
        </div>
      </footer>
    </>
  )
}
