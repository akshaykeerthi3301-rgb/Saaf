import { createClient } from '@supabase/supabase-js'
import { DocPage } from '@/components/features/doc-page'

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
    <DocPage eyebrow="Index audit" title="We publish what we read.">
      {!data ? (
        <p className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
          No run has completed yet. This page will show the day&apos;s figures once one has —
          it will never show zeros in place of missing data.
        </p>
      ) : (
        <>
          <p className="mt-6 border-b border-border pb-4 font-mono text-sm tabular-nums text-primary">
            {fmt(data.roles_indexed)} roles indexed · {fmt(data.boards_active)} company boards
          </p>

          <table className="mt-6 w-full border-collapse">
            <caption className="pb-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Roles stating each requirement, read from the posting
            </caption>
            <tbody>
              {reasons.map(([k, v]) => (
                <tr key={k}>
                  <td className="border-b border-border py-3 text-sm text-primary">
                    {LABEL[k] ?? k}
                  </td>
                  <td className="border-b border-border py-3 text-right font-mono text-sm tabular-nums text-primary">
                    {fmt(v)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-6 text-xs leading-5 text-muted-foreground">
            Figures for {data.day}. Updated daily. Every refusal above names a requirement
            stated in the posting — open any role and check it.
          </p>
        </>
      )}
    </DocPage>
  )
}
