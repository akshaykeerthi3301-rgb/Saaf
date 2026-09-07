import { DocPage } from '@/components/features/doc-page'
import { getLatestAudit } from '@/lib/services/audit'

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
  const audit = await getLatestAudit()

  const fmt = (n: number) => n.toLocaleString('en-IN')
  const reasons = Object.entries(audit?.byReason ?? {})
    .sort((a, b) => b[1] - a[1])


  return (
    <DocPage eyebrow="Index audit" title="We publish what we read.">
      {!audit ? (
        <p className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
          No run has completed yet. We show nothing rather than zeros.
        </p>
      ) : (
        <>
          <p className="mt-6 border-b border-border pb-4 font-mono text-sm tabular-nums text-primary">
            {fmt(audit.rolesIndexed)} roles indexed · {fmt(audit.boardsActive)} company boards
          </p>

          <table className="mt-6 w-full border-collapse">
            <caption className="pb-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Requirements read from postings
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

          <p className="mt-6 text-xs text-muted-foreground">
            {audit.day} · updated daily
          </p>
        </>
      )}
    </DocPage>
  )
}
