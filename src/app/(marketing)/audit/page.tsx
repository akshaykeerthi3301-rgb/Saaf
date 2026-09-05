import { createClient } from '@supabase/supabase-js'

export const revalidate = 3600

const LABEL: Record<string, string> = {
  title_seniority: 'Title above your band',
  experience_years: 'Years of experience',
  credential: 'Credential not held',
  location: 'Location',
  work_authorisation: 'Work authorisation',
  channel_budget: 'Channel or budget scale',
  institute_tier: 'Institute tier',
  hr_track: 'Recruitment vs generalist',
  unstated: 'Unstated',
}

/**
 * The contrarian belief, shipped as a feature.
 *
 * Nutrition-label form on purpose: reason left, count right in tabular
 * monospace, hairline rules, no chart and no colour. Deliberately unglamorous —
 * the credibility comes from it being checkable, not from it being designed.
 */
export default async function AuditPage() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { data } = await db
    .from('audit_daily')
    .select('day, roles_indexed, boards_active, by_reason')
    .order('day', { ascending: false })
    .limit(1)
    .maybeSingle()

  const fmt = (n: number) => n.toLocaleString('en-IN')
  const reasons = Object.entries((data?.by_reason ?? {}) as Record<string, number>)
    .sort((a, b) => b[1] - a[1])

  return (
    <main className="measure" style={{ paddingTop: 48, paddingBottom: 64, maxWidth: 680 }}>
      <h1 style={{ fontSize: 'var(--type-headline-lg-size)', fontWeight: 400, margin: '0 0 8px' }}>
        We publish what we read.
      </h1>

      {!data ? (
        <p style={{ color: 'var(--color-on-surface-variant)' }}>
          No run has completed yet. This page will show the day&apos;s figures once one has —
          it will never show zeros in place of missing data.
        </p>
      ) : (
        <>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--type-numeric-md-size)',
            fontVariantNumeric: 'tabular-nums', color: 'var(--color-on-surface)',
            paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-outline)',
          }}>
            {fmt(data.roles_indexed)} roles indexed · {fmt(data.boards_active)} company boards
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 'var(--space-md)' }}>
            <caption style={{
              captionSide: 'top', textAlign: 'left',
              fontSize: 'var(--type-label-sm-size)', fontWeight: 600,
              letterSpacing: 'var(--type-label-sm-ls)', textTransform: 'uppercase',
              color: 'var(--color-on-surface-variant)', paddingBottom: 'var(--space-sm)',
            }}>
              Roles stating each requirement, read from the posting
            </caption>
            <tbody>
              {reasons.map(([k, v]) => (
                <tr key={k}>
                  <td style={{
                    padding: 'var(--space-sm) 0',
                    borderBottom: '1px solid var(--color-outline-variant)',
                    fontSize: 'var(--type-body-md-size)',
                  }}>{LABEL[k] ?? k}</td>
                  <td style={{
                    padding: 'var(--space-sm) 0', textAlign: 'right',
                    borderBottom: '1px solid var(--color-outline-variant)',
                    fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
                    fontSize: 'var(--type-body-md-size)',
                  }}>{fmt(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{
            color: 'var(--color-on-surface-variant)',
            fontSize: 'var(--type-body-sm-size)', marginTop: 'var(--space-md)',
          }}>
            Figures for {data.day}. Updated daily. Every refusal above names a requirement
            stated in the posting — open any role and check it.
          </p>
        </>
      )}
    </main>
  )
}
