import { googleEmploymentType, type RoleFactsRow } from '@/lib/role-facts'
import type { StatedPay } from '@/lib/stated-pay'

/**
 * The schema.org JobPosting block for a public job page, as one pure function so a test can pin it.
 *
 * Rules (Google Search Central, job-posting guide, fetched 2026-10-08):
 *  - Required: title, description, datePosted, hiringOrganization, jobLocation — always present.
 *  - Recommended, included ONLY when Jobinko holds the fact: employmentType (the provider's own contract type),
 *    jobLocationType TELECOMMUTE (only when the employer's own system says the role is remote),
 *    identifier, baseSalary (only pay the posting states).
 *  - Left out on purpose: validThrough ("do not include it if … expiration is unknown" — Jobinko knows only that a
 *    role is gone, and then the page is a 404, which is Google's other accepted way to retire a posting) and
 *    applicantLocationRequirements (needed only when applicants are limited to places; nobody has told us).
 * Never a field filled with a guess.
 */
export type JobPostingInput = {
  id: string
  title: string
  company: string
  city: string | null
  location: string | null
  inIndia: boolean
  postedAt: string | null
  firstSeenAt: string
  pay: StatedPay | null
  plainDescription: string
  postingFields: { responsibilities?: string; qualifications?: string; jobBenefits?: string }
  employmentType: RoleFactsRow['employment_type']
  workMode: RoleFactsRow['work_mode']
}

export function jobPostingLd(job: JobPostingInput, origin: string): Record<string, unknown> {
  const employmentType = googleEmploymentType(job.employmentType)
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.plainDescription,
    // Only the parts the posting's own headings let us read — never a field filled with a guess.
    ...job.postingFields,
    datePosted: (job.postedAt ?? job.firstSeenAt).slice(0, 10),
    hiringOrganization: { '@type': 'Organization', name: job.company },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: job.city ?? job.location ?? undefined, addressCountry: job.inIndia ? 'IN' : undefined },
    },
    ...(employmentType ? { employmentType } : {}),
    ...(job.workMode === 'remote' ? { jobLocationType: 'TELECOMMUTE' } : {}),
    identifier: { '@type': 'PropertyValue', name: job.company, value: job.id },
    ...(job.pay ? { baseSalary: { '@type': 'MonetaryAmount', currency: job.pay.currency, value: { '@type': 'QuantitativeValue', minValue: job.pay.low, maxValue: job.pay.high, unitText: job.pay.period === 'year' ? 'YEAR' : job.pay.period === 'hour' ? 'HOUR' : 'MONTH' } } } : {}),
    directApply: false,
    url: `${origin}/jobs/${job.id}`,
  }
}
