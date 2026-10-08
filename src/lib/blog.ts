/**
 * The data blog (F-1206, TASK-203): posts made of numbers Saaf counted itself, on a stated day, by a stated method.
 *
 * ⚠️ A POST QUOTES A MEASUREMENT, NOT A LIVE FIGURE. Each carries `measuredAt` and `method`, and the numbers
 * come from `scripts/blog-measure.ts` (database counts) or `src/lib/taxonomy/role-keywords.json` (posting
 * statistics). When the world has moved, write a new post or re-date this one after re-running the script —
 * never edit a number in place. Every post also says what it does NOT show, because a count of the postings
 * Saaf tracks is not a count of the job market.
 */
export type Block = { h?: string; p: string[] }
export type Post = {
  slug: string
  title: string
  description: string
  /** Publication day, YYYY-MM-DD. */
  date: string
  /** The day the numbers were taken. */
  measuredAt: string
  /** How they were counted, in one plain sentence. */
  method: string
  /** What the numbers do not show. */
  limits: string
  blocks: Block[]
  /** Where to go next — always pages that exist. */
  related: { label: string; href: string }[]
}

export const POSTS: Post[] = [
  {
    slug: 'indian-job-postings-rarely-state-a-salary',
    title: 'Almost no Indian job postings tell you the salary',
    description: 'We read 4,000 open job postings from Indian company career pages. 25 of them — about 1 in 160 — state a pay figure.',
    date: '2026-10-08',
    measuredAt: '2026-10-08',
    method: 'Saaf tracked 27,882 open roles in India that day. We took 4,000 of their descriptions, spread across the whole set, and ran the same reader the product uses to find a stated pay figure — a range or an amount with a currency and a period.',
    limits: 'It counts pay written in the posting’s text. Employers’ own systems can hold a pay field that is not published in the feed Saaf reads; a separate probe of the providers’ structured pay fields on the same day found about 1 in 100 Indian postings carrying one. Roles on career pages are not all roles: they lean towards technology and product companies.',
    blocks: [
      { p: ['If you are comparing offers, the first thing you want to know about a job is what it pays. We counted how often the posting tells you.'] },
      { h: 'The number', p: ['Of 4,000 postings, 25 stated a pay figure in their text. That is 0.6% — about one in 160. The other 3,975 left you to find out in the interview.'] },
      { h: 'What Saaf does about it', p: ['Saaf shows pay on a role only when the posting states it, and shows it exactly as written. It never estimates a salary for a role that does not state one — a guess printed next to a real job reads as a fact, and this is the single field where that does the most harm.', 'When you do see a pay figure on a Saaf card, you can sort by “pay stated first”. When you do not, that is what the employer chose to publish.'] },
    ],
    related: [{ label: 'Search jobs and see which state their pay', href: '/jobs' }, { label: 'How Saaf compares to a job site', href: '/compare/job-sites' }],
  },
  {
    slug: 'half-of-indias-open-jobs-are-in-three-cities',
    title: 'Half of the open jobs we track are in three cities',
    description: 'Of 27,882 open roles in India on company career pages, 51.4% are in Bengaluru, Hyderabad and Pune. Remote is 3.7%.',
    date: '2026-10-08',
    measuredAt: '2026-10-08',
    method: 'Saaf counted its open roles in India that day (27,882) and, for each city in its own city list, the roles whose listed location names that city under any of its common spellings. “Remote” means the posting’s own location says remote, anywhere or work from home.',
    limits: 'These are the roles on employers’ own career pages that Saaf reads — they lean towards technology, product and services companies that use Greenhouse, Lever, Ashby, Workable, Recruitee, SmartRecruiters or Workday. It is not a count of every job in India, and smaller cities are under-represented for that reason.',
    blocks: [
      { p: ['Where the roles are decides where you can apply. We counted.'] },
      { h: 'The cities', p: ['Bengaluru has 9,227 of the 27,882 open roles — 33.1%. Hyderabad has 2,644 (9.5%) and Pune 2,460 (8.8%), so those three together hold 51.4%. Mumbai follows with 2,293 (8.2%), then Gurugram 1,657 (5.9%) and Chennai 1,550 (5.6%).'] },
      { h: 'Remote', p: ['1,039 roles — 3.7% — say remote, anywhere or work from home in their location. If you are searching only for remote work, the pool is small, and it is worth checking it directly.'] },
      { h: 'Where to look', p: ['Every city and role combination with enough open roles has its own page, and the remote roles have one too.'] },
    ],
    related: [{ label: 'Jobs by role', href: '/roles' }, { label: 'Remote jobs in India', href: '/remote' }],
  },
  {
    slug: 'how-many-years-of-experience-indian-postings-ask-for',
    title: 'How many years of experience do Indian postings ask for?',
    description: 'Across 63 roles, the middle posting asks for 5 years. Performance marketing asks for 1; solutions architects and several managers ask for 8.',
    date: '2026-10-08',
    measuredAt: '2026-10-08',
    method: 'For each of Saaf’s 63 roles with enough postings that state an experience requirement (at least eight), we took the middle (median) of the years those postings ask for. “Median of medians” is the middle of those 63 numbers.',
    limits: 'Only postings that state a requirement count, and the number of postings behind each role is shown — a role with 12 postings is a hint, not a finding. The figure is what postings ask for, not what people who get hired have.',
    blocks: [
      { p: ['“Asks for 5+ years” is on a lot of postings. We counted what the middle posting actually asks, role by role.'] },
      { h: 'The middle of the middles', p: ['Across 63 roles, the middle role’s middle posting asks for 5 years.'] },
      { h: 'The most experience', p: ['Category Manager, HR Manager, Procurement Manager, Service Delivery Manager and Solutions Architect all have a middle posting that asks for 8 years. For Solutions Architect that rests on 155 postings; for Backend Engineer, 7 years on 199.'] },
      { h: 'The least', p: ['Performance Marketing asks for 1 year (28 postings). Business Development Executive, Content Marketing and Field Sales ask for 2 (41, 15 and 161). Relationship Manager and Technical Support Engineer ask for 3 (101 and 45).'] },
      { h: 'What to do with it', p: ['If a posting asks for more than you have, the number alone is not a verdict — many postings ask for more than they hire. Saaf shows these roles scored honestly with the reason, never hidden.'] },
    ],
    related: [{ label: 'Résumé keywords by role', href: '/tools/resume-keywords' }, { label: 'Jobs by role', href: '/roles' }],
  },
]

export const postBySlug = (slug: string) => POSTS.find((p) => p.slug === slug) ?? null
