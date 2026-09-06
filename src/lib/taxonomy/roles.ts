/**
 * Job domains and the roles inside them.
 *
 * WHAT THIS IS FOR. `profiles.preferred_role` is free text, and
 * src/lib/evaluate-user.ts turns it into a `websearch_to_tsquery` that ANDs
 * every word against a posting's title. That makes the exact wording decide
 * whether a candidate gets a shortlist at all: "Product Manager" returns 36
 * roles on the live index, "Founder's Office" returns none, and "manager"
 * returns 226 — 35% of everything we hold. A blind text box hid all three
 * outcomes until the shortlist came back useless.
 *
 * The taxonomy gives a candidate a shortlist of role names that are known to be
 * well-formed for that query. IT DOES NOT REPLACE THE TEXT BOX. Anything typed
 * still works, because never turning a candidate away is a locked decision and
 * a taxonomy is a starting point, not a gate.
 *
 * EVERY OPTION IS SHOWN WITH ITS LIVE COUNT, from the same query the matcher
 * runs — see src/app/actions/role-catalogue.ts. A role reading "0" is shown,
 * not hidden: zero is a fact about our registry coverage, and hiding it would
 * be the product telling a candidate their work does not exist.
 *
 * WHERE THE LIST COMES FROM. Three sources, in this order of authority:
 *
 *   1. The eight domains in the saaf-ai design export's own onboarding screen,
 *      which is this product's prior work and already India-shaped.
 *   2. The live index — the most common title phrases across 652 Indian
 *      postings, so the common options return something on day one.
 *   3. Standard occupational groupings for the coverage those two miss.
 *
 * It is NOT a competitor's taxonomy. Jobright's is not published — its
 * categories live behind the app's login and no public page enumerates them —
 * so there was nothing to copy even had that been the right thing to do.
 *
 * LABELS MUST STAY tsquery-SAFE. evaluate-user strips everything outside
 * [a-z0-9&+ ] and ANDs what is left, so every extra word narrows the result.
 * Two or three plain words. No parentheses, no abbreviations in brackets, no
 * slashes: "HR Business Partner (HRBP)" would AND four terms and return zero.
 */

export type Domain = {
  key: string
  label: string
  roles: string[]
}

export const DOMAINS: Domain[] = [
  {
    key: 'software',
    label: 'Software & Engineering',
    roles: [
      'Software Engineer', 'Backend Engineer', 'Frontend Engineer', 'Full Stack Engineer',
      'Mobile Engineer', 'DevOps Engineer', 'QA Engineer', 'Security Engineer',
      'Solutions Architect', 'Engineering Manager',
    ],
  },
  {
    key: 'data',
    label: 'Data & AI',
    roles: [
      'Data Analyst', 'Data Scientist', 'Data Engineer', 'Machine Learning Engineer',
      'Business Analyst', 'Analytics Manager',
    ],
  },
  {
    key: 'product',
    label: 'Product',
    roles: [
      'Product Manager', 'Associate Product Manager', 'Technical Product Manager',
      'Growth Product Manager', 'Product Analyst', 'Product Owner', 'Product Management',
    ],
  },
  {
    key: 'design',
    label: 'Design',
    roles: [
      'Product Designer', 'UX Designer', 'UI Designer', 'UX Researcher',
      'Graphic Designer', 'Motion Designer',
    ],
  },
  {
    key: 'sales',
    label: 'Sales & Business Development',
    roles: [
      'Business Development Executive', 'Business Development Manager', 'Sales Manager',
      'Account Executive', 'Account Manager', 'Key Account Manager', 'Field Sales',
      'Inside Sales', 'Partnerships Manager',
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing & Growth',
    roles: [
      'Digital Marketing Manager', 'Performance Marketing', 'Growth Marketer',
      'Product Marketing Manager', 'Content Marketing', 'Brand Manager',
      'SEO Specialist', 'Social Media Manager',
    ],
  },
  {
    key: 'finance',
    label: 'Finance & Banking',
    roles: [
      'Financial Analyst', 'Finance Manager', 'Relationship Manager', 'Credit Analyst',
      'Risk Analyst', 'Investment Banking', 'Chartered Accountant', 'Collections Manager',
      'Internal Audit', 'Treasury Manager',
    ],
  },
  {
    key: 'operations',
    label: 'Operations & Supply Chain',
    roles: [
      'Operations Manager', 'Operations Executive', 'Program Manager', 'Project Manager',
      'Supply Chain Manager', 'Logistics Manager', 'Procurement Manager', 'Category Manager',
    ],
  },
  {
    key: 'people',
    label: 'HR & People',
    roles: [
      'HR Manager', 'HR Executive', 'HR Business Partner', 'Talent Acquisition',
      'Technical Recruiter', 'Learning and Development', 'Compensation and Benefits',
    ],
  },
  {
    key: 'strategy',
    label: 'Strategy & Consulting',
    roles: [
      'Management Consultant', 'Strategy Manager', 'Chief of Staff',
      'Business Operations', 'Corporate Development',
    ],
  },
  {
    key: 'support',
    label: 'Customer Success & Support',
    roles: [
      'Customer Success Manager', 'Customer Support Executive', 'Technical Support Engineer',
      'Service Delivery Manager',
    ],
  },
]

export const ALL_ROLES: string[] = DOMAINS.flatMap((d) => d.roles)

export const DOMAIN_OF = new Map<string, Domain>(
  DOMAINS.flatMap((d) => d.roles.map((r) => [r.toLowerCase(), d] as const))
)
