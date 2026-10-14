/**
 * The stress corpus: 12 invented careers × 5 renderings = 60 documents WITH KNOWN ANSWERS.
 *
 *   npm run bench:stress     writes bench/corpus/stress/*.{pdf,docx} and bench/golden/stress.json
 *
 * WHY THIS EXISTS. The other corpora measure coverage ("did it find a title?") or invariance ("do four layouts agree?").
 * Neither says whether the answer is RIGHT. Here every career is declared by hand — who is current, which roles are
 * internships, what the experience total must be — and then rendered in five layouts. The gold is computed from the
 * declaration by closed-form arithmetic (merged intervals), a different method from the engine's month sets, so a bug
 * in one cannot hide in the other.
 *
 * Careers are INVENTED. No real person appears anywhere, so this directory is committed.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'
import { makePdf, type Page, type Run } from './pdf-writer'

export const AS_OF = '2026-10-14'
const AS_OF_IDX = 2026 * 12 + 9 // October 2026, zero-based month

type Pt = [number, number | null] // [year, month|null]
type Kind = 'job' | 'internship' | 'project' | 'volunteer'
export type Role = { title: string; employer: string; from: Pt; to: Pt | 'present'; kind?: Kind; loc?: string; bullets?: string[] }
type DateStyle = 'mon' | 'long' | 'num' | 'num2' | 'year' | 'short'
type HeadStyle = 'title-at' | 'pipe' | 'company-first' | 'comma'
export type Career = {
  id: string
  name: string
  city: string
  summary: string
  roles: Role[]
  education: { degree: string; school: string; from: number; to: number }[]
  skills: string[]
  certs?: string[]
  dates: DateStyle
  head: HeadStyle
  noExperienceHeading?: boolean
  /** The separator between two dates is MISSING ("Jan 2022 Present") — what an unmapped dash glyph or an OCR drop produces. */
  lostDash?: boolean
  /** Roles written oldest-first (wrong for a résumé, common in practice). */
  oldestFirst?: boolean
  /** Written AFTER the first tuning pass and run once before any fix: the honest generalisation check. */
  heldout?: boolean
  /** Declared truth, not derived: index into `roles`, or null. */
  current: number | null
  latest: number
  flags?: string[]
}

export type Gold = {
  career: string
  current: { title: string; employer: string } | null
  latest: { title: string; employer: string }
  months: { low: number; mid: number; high: number }
  internship_months: number
  n_experience: number
  n_internships: number
  n_projects: number
  n_education: number
  gap_reasons: ('education' | 'unexplained')[]
  flags: string[]
  skills: string[]
}

const B = (...s: string[]) => s
const CAREERS: Career[] = [
  {
    id: 'steady', name: 'Raghav Menon', city: 'Bengaluru', dates: 'mon', head: 'title-at', current: 0, latest: 0,
    summary: 'Product manager with 7 years in payments, owning UPI and card products end to end.',
    roles: [
      { title: 'Senior Product Manager', employer: 'Razorpay', from: [2022, 3], to: 'present', bullets: B('Led the UPI autopay rollout to 1.2 million merchants, lifting recurring collections by 18%.', 'Cut merchant onboarding drop-off by 34% by rebuilding the KYC step.') },
      { title: 'Product Manager', employer: 'Zeta', from: [2019, 7], to: [2022, 2], bullets: B('Shipped a card-issuing console adopted by 40 banks across India and the Gulf.') },
    ],
    education: [{ degree: 'B.Tech Computer Science', school: 'NIT Trichy', from: 2015, to: 2019 }],
    skills: ['SQL', 'Mixpanel', 'Figma', 'Jira', 'Amplitude', 'Python'], certs: ['Certified Scrum Product Owner'],
  },
  {
    id: 'concurrent', name: 'Meera Nair', city: 'Mumbai', dates: 'mon', head: 'title-at', current: 0, latest: 0, flags: ['concurrent_roles'],
    summary: 'Designer working across brand and product, with a freelance illustration practice.',
    roles: [
      { title: 'Brand Designer', employer: 'Swiggy', from: [2023, 1], to: 'present', bullets: B('Redesigned the Instamart campaign system used across 40 cities.') },
      { title: 'Freelance Illustrator', employer: 'Self-employed', from: [2024, 6], to: 'present', bullets: B('Illustrated 3 children books for two publishers.') },
      { title: 'UI Designer', employer: 'Zomato', from: [2020, 6], to: [2022, 12], bullets: B('Owned the checkout flow redesign, lifting conversion by 6%.') },
    ],
    education: [{ degree: 'B.Des Communication Design', school: 'NID Ahmedabad', from: 2016, to: 2020 }],
    skills: ['Figma', 'Illustrator', 'Prototyping', 'Design systems', 'Photoshop'],
  },
  {
    id: 'promotions', name: 'Arjun Rao', city: 'Hyderabad', dates: 'mon', head: 'pipe', current: 0, latest: 0,
    summary: 'Consultant promoted three times at one firm, delivering banking transformation.',
    roles: [
      { title: 'Lead Consultant', employer: 'Infosys', from: [2024, 4], to: 'present', bullets: B('Led a 14-person team on a core-banking migration.') },
      { title: 'Senior Consultant', employer: 'Infosys', from: [2021, 4], to: [2024, 3], bullets: B('Designed the data migration plan for 2 million accounts.') },
      { title: 'Consultant', employer: 'Infosys', from: [2018, 7], to: [2021, 3], bullets: B('Built reconciliation reports in SQL and Python.') },
    ],
    education: [{ degree: 'B.E. Information Science', school: 'BMS College of Engineering', from: 2014, to: 2018 }],
    skills: ['SQL', 'Java', 'Oracle', 'Core banking', 'Stakeholder management'],
  },
  {
    id: 'gap-mba', name: 'Sneha Kapoor', city: 'Gurugram', dates: 'mon', head: 'company-first', current: 1, latest: 1,
    summary: 'Strategy professional with consulting and operating experience, MBA from ISB.',
    roles: [
      { title: 'Associate', employer: 'Deloitte', from: [2017, 7], to: [2021, 6], loc: 'Gurugram', bullets: B('Built market-entry models for 6 consumer clients.') },
      { title: 'Manager, Strategy', employer: 'Mahindra', from: [2023, 8], to: 'present', loc: 'Mumbai', bullets: B('Own the group growth plan across 3 business units.') },
    ],
    education: [{ degree: 'MBA', school: 'Indian School of Business', from: 2021, to: 2023 }, { degree: 'B.Com (Hons)', school: 'SRCC Delhi', from: 2013, to: 2017 }],
    skills: ['Financial modelling', 'Market sizing', 'Excel', 'PowerPoint'], flags: [],
  },
  {
    id: 'interns', name: 'Karthik Subramanian', city: 'Chennai', dates: 'num', head: 'title-at', current: 2, latest: 2, flags: ['trainee_role_counted'],
    summary: 'Recent graduate engineer, two internships and one year on the job.',
    roles: [
      { title: 'Software Intern', employer: 'Google', from: [2021, 5], to: [2021, 7], kind: 'internship', bullets: B('Built an internal dashboard used by 30 engineers.') },
      { title: 'Summer Intern', employer: 'Flipkart', from: [2022, 5], to: [2022, 7], kind: 'internship', bullets: B('Prototyped a search ranking experiment.') },
      { title: 'Graduate Engineer Trainee', employer: 'Tata Motors', from: [2023, 7], to: 'present', bullets: B('Automated line-side quality checks, saving 120 hours a month.') },
    ],
    education: [{ degree: 'B.Tech Mechanical', school: 'IIT Madras', from: 2019, to: 2023 }],
    skills: ['Python', 'MATLAB', 'SolidWorks', 'Lean manufacturing'],
  },
  {
    id: 'year-only', name: 'Divya Shah', city: 'Pune', dates: 'year', head: 'title-at', current: 0, latest: 0,
    summary: 'Operations leader in retail and quick commerce.',
    roles: [
      { title: 'Operations Manager', employer: 'BigBasket', from: [2020, null], to: 'present', bullets: B('Run fulfilment for 3 dark stores, 99.1% on-time.') },
      { title: 'Executive', employer: 'Reliance Retail', from: [2017, null], to: [2020, null], bullets: B('Managed inventory across 12 stores.') },
    ],
    education: [{ degree: 'BBA', school: 'Symbiosis Pune', from: 2013, to: 2016 }],
    skills: ['Supply chain', 'Excel', 'Forecasting', 'SAP'],
  },
  {
    id: 'company-first', name: 'Imran Qureshi', city: 'Delhi', dates: 'num', head: 'company-first', current: 0, latest: 0,
    summary: 'Analyst turned senior analyst in food delivery and fintech.',
    roles: [
      { title: 'Senior Analyst', employer: 'Zomato', from: [2022, 2], to: 'present', loc: 'Gurugram', bullets: B('Own weekly demand forecasts for 8 cities.') },
      { title: 'Analyst', employer: 'Paytm', from: [2019, 6], to: [2022, 1], loc: 'Noida', bullets: B('Built the merchant churn model, recalling 71% of churners.') },
    ],
    education: [{ degree: 'B.Sc Statistics', school: 'Delhi University', from: 2016, to: 2019 }],
    skills: ['SQL', 'Python', 'Tableau', 'Statistics'],
  },
  {
    id: 'all-ended', name: 'Pooja Verma', city: 'Noida', dates: 'short', head: 'title-at', current: null, latest: 0, flags: ['recently_ended'],
    summary: 'Content lead between roles, available immediately.',
    roles: [
      { title: 'Content Lead', employer: 'Byjus', from: [2021, 1], to: [2026, 8], bullets: B('Led a 9-person content team shipping 400 lessons.') },
      { title: 'Content Writer', employer: 'Dream11', from: [2018, 5], to: [2020, 12], bullets: B('Wrote the editorial calendar for 5 sports.') },
    ],
    education: [{ degree: 'BA English', school: 'Miranda House', from: 2015, to: 2018 }],
    skills: ['Editing', 'SEO', 'Content strategy', 'Copywriting'],
  },
  {
    id: 'brackets', name: 'Vikram Joshi', city: 'Pune', dates: 'mon', head: 'pipe', current: 0, latest: 0,
    summary: 'Banker in private and retail banking.',
    roles: [
      { title: 'Relationship Manager (Private Banking, Wealth)', employer: 'HDFC Bank', from: [2021, 6], to: 'present', bullets: B('Manage a 120-client book worth 640 crore.') },
      { title: 'Assistant Vice President (Retail, Branch Banking)', employer: 'Axis Bank', from: [2016, 4], to: [2021, 5], bullets: B('Led a 22-person branch to 118% of target.') },
    ],
    education: [{ degree: 'MBA Finance', school: 'Symbiosis Pune', from: 2014, to: 2016 }],
    skills: ['Wealth management', 'Portfolio review', 'Client relations'],
  },
  {
    id: 'projects', name: 'Ananya Das', city: 'Bengaluru', dates: 'mon', head: 'title-at', current: 0, latest: 0,
    summary: 'Backend engineer who builds products on the side.',
    roles: [
      { title: 'Backend Engineer', employer: 'Freshworks', from: [2022, 8], to: 'present', bullets: B('Cut p95 API latency from 900 ms to 210 ms.') },
      { title: 'FleetSense', employer: 'Full-Stack SaaS Fleet Platform', from: [2026, null], to: 'present', kind: 'project' },
      { title: 'Alpha Bot', employer: 'Algorithmic Trading System', from: [2025, null], to: [2025, null], kind: 'project' },
      { title: 'WebCraft AI', employer: 'GenAI Website Generator', from: [2026, null], to: 'present', kind: 'project' },
    ],
    education: [{ degree: 'B.Tech Computer Science', school: 'NIT Warangal', from: 2018, to: 2022 }],
    skills: ['Go', 'PostgreSQL', 'Kafka', 'Docker', 'AWS'],
  },
  {
    id: 'long', name: 'Rohit Bansal', city: 'Gurugram', dates: 'mon', head: 'title-at', current: 0, latest: 0,
    summary: 'Sales leader with 16 years across SaaS, telecom and FMCG, nine roles.',
    roles: [
      ...[
        ['Vice President Sales', 'Chargebee', [2024, 1], 'present'], ['Director Sales', 'Freshworks', [2021, 9], [2023, 12]], ['Senior Manager Sales', 'Zoho', [2019, 4], [2021, 8]],
        ['Manager Sales', 'Airtel', [2017, 2], [2019, 3]], ['Assistant Manager Sales', 'Vodafone', [2015, 6], [2017, 1]], ['Area Sales Manager', 'Hindustan Unilever', [2013, 8], [2015, 5]],
        ['Sales Executive', 'ITC', [2011, 7], [2013, 7]], ['Management Trainee', 'Nestle', [2010, 7], [2011, 6]], ['Territory Sales Officer', 'Britannia', [2009, 5], [2010, 3]],
      ].map(([title, employer, from, to]): Role => ({
        title: title as string, employer: employer as string, from: from as Pt, to: to as Pt | 'present',
        bullets: B(`Grew the ${employer as string} territory revenue by 22% year on year through channel expansion.`, 'Hired and coached a team of 14 reps; 11 hit quota in the first two quarters.', 'Introduced a weekly pipeline review that cut average deal cycle from 74 to 51 days.', 'Owned renewals for the 40 largest accounts, retaining 97% of recurring revenue.'),
      })),
    ],
    education: [{ degree: 'B.Com', school: 'Delhi University', from: 2006, to: 2009 }],
    skills: ['Enterprise sales', 'Negotiation', 'Forecasting', 'CRM', 'Channel management', 'Team building'],
  },
  {
    id: 'two-digit-dates', name: 'Harsh Vardhan', city: 'Jaipur', dates: 'num2', head: 'title-at', current: 0, latest: 0,
    summary: 'Sales engineer; every date on this résumé is written MM/YY.',
    roles: [
      { title: 'Senior Sales Engineer', employer: 'Siemens', from: [2022, 11], to: 'present', bullets: B('Own a 14 crore regional pipeline.') },
      { title: 'Sales Engineer', employer: 'ABB', from: [2019, 3], to: [2022, 8], bullets: B('Closed 31 industrial automation deals.') },
    ],
    education: [{ degree: 'B.E. Electrical', school: 'MNIT Jaipur', from: 2015, to: 2019 }],
    skills: ['Automation', 'Negotiation', 'PLC', 'Key accounts'],
  },
  {
    id: 'lost-dash', name: 'Bhavna Rao', city: 'Mysuru', dates: 'mon', head: 'title-at', current: 0, latest: 0, lostDash: true,
    summary: 'Every date range on this résumé has lost its dash.',
    roles: [
      { title: 'Yoga Instructor', employer: 'University Recreation Centre', from: [2022, 1], to: 'present', bullets: B('Lead weekly classes for 40 students.') },
      { title: 'Peer Health Educator', employer: 'Wellness Office', from: [2019, 4], to: [2021, 12], bullets: B('Ran 3 workshops a week on nutrition and stress.') },
    ],
    education: [{ degree: 'B.Sc Nutrition', school: 'Mysore University', from: 2016, to: 2019 }],
    skills: ['Teaching', 'Public speaking', 'Nutrition', 'Counselling'],
  },
  {
    id: 'headingless', name: 'Aditi Kulkarni', city: 'Pune', dates: 'mon', head: 'title-at', current: 0, latest: 0, noExperienceHeading: true, flags: ['trainee_role_counted'],
    summary: '',
    roles: [
      { title: 'Associate Software Engineer', employer: 'Wipro', from: [2024, 7], to: 'present', bullets: B('Maintain a retail banking service in Java and Spring Boot.') },
      { title: 'Trainee Engineer', employer: 'Wipro', from: [2024, 1], to: [2024, 6], bullets: B('Completed the Mysore training programme; built an internal tool.') },
    ],
    education: [{ degree: 'B.E. Computer Science', school: 'VTU Belagavi', from: 2020, to: 2024 }],
    skills: ['Java', 'Spring Boot', 'SQL', 'Git'],
  },
]


// ---------------------------------------------------------------------------------------------------------------------
// HELD OUT. Written after the first ten careers were tuned against and BEFORE this set was ever run. Each one targets a
// property the tuned careers do not have. Anything that fails here and is then fixed becomes development data; the report
// says which number was seen first.
// ---------------------------------------------------------------------------------------------------------------------
const H = (c: Omit<Career, 'heldout'>): Career => ({ ...c, heldout: true })
export const HELDOUT: Career[] = [
  H({ id: 'h-longmonths', name: 'Nisha Reddy', city: 'Hyderabad', dates: 'long', head: 'title-at', current: 0, latest: 0, summary: 'Data scientist in retail analytics.',
    roles: [{ title: 'Senior Data Scientist', employer: 'Myntra', from: [2023, 9], to: 'present', bullets: B('Own the size-recommendation model used on 9 million orders.') }, { title: 'Data Scientist', employer: 'Walmart Global Tech', from: [2020, 2], to: [2023, 8], bullets: B('Built demand forecasts for 400 stores.') }],
    education: [{ degree: 'M.Sc Statistics', school: 'University of Hyderabad', from: 2018, to: 2020 }], skills: ['Python', 'PyTorch', 'SQL', 'Spark'] }),
  H({ id: 'h-oldest-first', name: 'Gaurav Malhotra', city: 'Delhi', dates: 'mon', head: 'pipe', current: 2, latest: 2, oldestFirst: true, summary: 'Finance professional, roles listed oldest first.',
    roles: [{ title: 'Analyst', employer: 'KPMG', from: [2015, 7], to: [2018, 6], bullets: B('Audited 14 listed clients.') }, { title: 'Senior Analyst', employer: 'EY', from: [2018, 7], to: [2022, 3], bullets: B('Led the audit of two NBFCs.') }, { title: 'Finance Manager', employer: 'Paytm', from: [2022, 4], to: 'present', bullets: B('Own month-end close for 6 entities.') }],
    education: [{ degree: 'B.Com', school: 'Hansraj College', from: 2012, to: 2015 }], skills: ['IFRS', 'Excel', 'Audit', 'SAP'] }),
  H({ id: 'h-comma-style', name: 'Tanvi Mehta', city: 'Mumbai', dates: 'mon', head: 'comma', current: 0, latest: 0, summary: 'Consultant moving into product.',
    roles: [{ title: 'Product Manager', employer: 'Razorpay', from: [2024, 2], to: 'present', bullets: B('Own merchant onboarding.') }, { title: 'Senior Associate', employer: 'McKinsey & Company', from: [2020, 8], to: [2024, 1], bullets: B('Led 5 engagements in banking.') }],
    education: [{ degree: 'MBA', school: 'IIM Ahmedabad', from: 2018, to: 2020 }], skills: ['Strategy', 'SQL', 'Roadmapping'] }),
  H({ id: 'h-fellowship', name: 'Ishaan Bhatt', city: 'Pune', dates: 'mon', head: 'title-at', current: 2, latest: 2, summary: 'Educator turned operations manager.',
    roles: [{ title: 'Teach For India Fellow', employer: 'Teach For India', from: [2019, 6], to: [2021, 5], kind: 'internship', bullets: B('Taught 38 students in grade 6.') }, { title: 'Research Fellow', employer: 'IISc', from: [2021, 6], to: [2022, 5], kind: 'internship', bullets: B('Published two papers.') }, { title: 'Operations Manager', employer: 'Urban Company', from: [2022, 6], to: 'present', bullets: B('Run onboarding for 1,800 service professionals a month.') }],
    education: [{ degree: 'B.Sc Physics', school: 'Fergusson College', from: 2015, to: 2018 }], skills: ['Operations', 'Excel', 'Training'] }),
  H({ id: 'h-articleship', name: 'Rhea Sethi', city: 'Delhi', dates: 'num', head: 'title-at', current: 1, latest: 1, summary: 'Chartered accountant in corporate finance.',
    roles: [{ title: 'Articleship Trainee', employer: 'S R Batliboi & Co', from: [2015, 5], to: [2018, 4], kind: 'internship', bullets: B('Statutory audit of 9 clients.') }, { title: 'Assistant Manager Finance', employer: 'Tata Steel', from: [2018, 9], to: 'present', bullets: B('Own the quarterly consolidation.') }],
    education: [{ degree: 'B.Com', school: 'SRCC', from: 2012, to: 2015 }], skills: ['IND AS', 'Consolidation', 'Excel'], certs: ['Chartered Accountant, ICAI'] }),
  H({ id: 'h-volunteer', name: 'Farhan Ali', city: 'Bengaluru', dates: 'mon', head: 'title-at', current: 0, latest: 0, summary: 'Engineer who mentors on the side.',
    roles: [{ title: 'Software Engineer', employer: 'Atlassian', from: [2021, 8], to: 'present', bullets: B('Build the permissions service.') }, { title: 'Volunteer Mentor', employer: 'Code For India', from: [2019, 6], to: [2021, 5], kind: 'volunteer', bullets: B('Mentor 12 students a year.') }],
    education: [{ degree: 'B.E. Computer Science', school: 'PES University', from: 2017, to: 2021 }], skills: ['Java', 'Kotlin', 'AWS'] }),
  H({ id: 'h-two-fulltime', name: 'Lakshmi Iyer', city: 'Chennai', dates: 'mon', head: 'title-at', current: 1, latest: 1, flags: ['concurrent_roles'], summary: 'Two concurrent full-time roles during a transition.',
    roles: [{ title: 'Marketing Manager', employer: 'Lenskart', from: [2022, 1], to: 'present', bullets: B('Run performance marketing.') }, { title: 'Senior Marketing Manager', employer: 'Nykaa', from: [2024, 5], to: 'present', bullets: B('Own brand campaigns.') }],
    education: [{ degree: 'MBA', school: 'XLRI Jamshedpur', from: 2018, to: 2020 }], skills: ['Performance marketing', 'SEO', 'Analytics'] }),
  H({ id: 'h-future-end', name: 'Omkar Patil', city: 'Nagpur', dates: 'mon', head: 'title-at', current: 0, latest: 0, summary: 'Leaving for a new job in 2027.',
    roles: [{ title: 'Process Engineer', employer: 'Bajaj Auto', from: [2023, 6], to: [2027, 6], bullets: B('Cut cycle time by 12%.') }],
    education: [{ degree: 'B.E. Mechanical', school: 'VNIT Nagpur', from: 2019, to: 2023 }], skills: ['Lean', 'AutoCAD', 'Six Sigma'] }),
  H({ id: 'h-names', name: 'Priyanka Chopra Menon', city: 'Kochi', dates: 'mon', head: 'pipe', current: 0, latest: 0, summary: 'Engineer with hyphenated and bracketed employers.',
    roles: [{ title: 'Design Engineer', employer: 'Mercedes-Benz R&D India', from: [2022, 3], to: 'present', bullets: B('Own the thermal design of a battery pack.') }, { title: 'Graduate Engineer', employer: 'Tata Consultancy Services (TCS)', from: [2019, 7], to: [2022, 2], bullets: B('Built test automation for a telecom client.') }],
    education: [{ degree: 'B.Tech Electrical', school: 'CUSAT', from: 2015, to: 2019 }], skills: ['CATIA', 'MATLAB', 'Python'] }),
  H({ id: 'h-tight-dates', name: 'Zoya Khan', city: 'Lucknow', dates: 'mon', head: 'company-first', current: 0, latest: 0, summary: 'Teacher turned edtech lead.',
    roles: [{ title: 'Curriculum Lead', employer: 'PhysicsWallah', from: [2022, 1], to: 'present', loc: 'Noida', bullets: B('Lead 30 teachers.') }, { title: 'Teacher', employer: 'City Montessori School', from: [2016, 4], to: [2021, 12], loc: 'Lucknow', bullets: B('Taught physics to grades 11 and 12.') }],
    education: [{ degree: 'M.Sc Physics', school: 'Lucknow University', from: 2014, to: 2016 }], skills: ['Teaching', 'Curriculum design', 'Physics'] }),
]

CAREERS.push(...HELDOUT)

// ---------- gold: closed-form arithmetic, deliberately NOT the engine's method ----------
const idx = (p: Pt, which: 'low' | 'mid' | 'high', isEnd: boolean): number => {
  const [y, m] = p
  const month = m ?? (which === 'mid' ? 7 : which === 'high' ? (isEnd ? 12 : 1) : isEnd ? 1 : 12)
  return y * 12 + month - 1
}
function span(r: Role, which: 'low' | 'mid' | 'high'): [number, number] | null {
  const s = idx(r.from, which, false)
  if (s > AS_OF_IDX) return null
  const e = Math.max(s, Math.min(AS_OF_IDX, r.to === 'present' ? AS_OF_IDX : idx(r.to, which, true)))
  return [s, e]
}
function union(spans: [number, number][]): { total: number; gaps: [number, number][] } {
  const s = [...spans].sort((a, b) => a[0] - b[0])
  let total = 0
  const gaps: [number, number][] = []
  let cur: [number, number] | null = null
  for (const iv of s) {
    if (cur && iv[0] <= cur[1] + 0) cur = [cur[0], Math.max(cur[1], iv[1])]
    else if (cur && iv[0] === cur[1] + 1) cur = [cur[0], Math.max(cur[1], iv[1])] // adjacent months join; the total is identical
    else {
      if (cur) { total += cur[1] - cur[0] + 1; if (iv[0] - cur[1] - 1 > 3) gaps.push([cur[1] + 1, iv[0] - 1]) }
      cur = [...iv]
    }
  }
  if (cur) total += cur[1] - cur[0] + 1
  return { total, gaps }
}

export function goldOf(c: Career): Gold {
  const kind = (r: Role) => r.kind ?? 'job'
  const counted = c.roles.filter((r) => kind(r) === 'job')
  const listed = c.roles.filter((r) => kind(r) === 'job' || kind(r) === 'volunteer') // volunteering is LISTED as experience but never counted
  const sp = (which: 'low' | 'mid' | 'high', rs: Role[]) => rs.map((r) => span(r, which)).filter((x): x is [number, number] => x !== null)
  const mid = union(sp('mid', counted))
  const study = c.education.map((e) => [e.from * 12, e.to * 12 + 11] as const)
  return {
    career: c.id,
    current: c.current === null ? null : { title: c.roles[c.current].title, employer: c.roles[c.current].employer },
    latest: { title: c.roles[c.latest].title, employer: c.roles[c.latest].employer },
    months: { low: union(sp('low', counted)).total, mid: mid.total, high: union(sp('high', counted)).total },
    internship_months: union(sp('mid', c.roles.filter((r) => kind(r) === 'internship'))).total,
    n_experience: listed.length,
    n_internships: c.roles.filter((r) => kind(r) === 'internship').length,
    n_projects: c.roles.filter((r) => kind(r) === 'project').length,
    n_education: c.education.length,
    gap_reasons: mid.gaps.map(([a, b]) => {
      const inStudy = Array.from({ length: b - a + 1 }, (_, k) => a + k).filter((i) => study.some(([x, y]) => i >= x && i <= y)).length
      return inStudy * 2 >= b - a + 1 ? ('education' as const) : ('unexplained' as const)
    }),
    flags: c.flags ?? [],
    skills: c.skills,
  }
}

// ---------- text ----------
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n: number) => String(n).padStart(2, '0')
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const NOW: Record<DateStyle, string> = { mon: 'Present', long: 'Present', num: 'Till date', num2: 'Till date', year: 'Present', short: 'Current' }
function pt(style: DateStyle, [y, m]: Pt): string {
  if (m === null || style === 'year') return String(y)
  if (style === 'long') return `${LONG[m - 1]} ${y}`
  if (style === 'num2') return `${pad(m)}/${pad(y % 100)}` // 03/19 — the two-digit-year form
  return style === 'mon' ? `${MON[m - 1]} ${y}` : style === 'num' ? `${pad(m)}/${y}` : `${MON[m - 1]}'${pad(y % 100)}`
}
const range = (style: DateStyle, r: Role, dash: string) => `${pt(style, r.from)}${dash}${r.to === 'present' ? NOW[style] : pt(style, r.to)}`

/** A logical line; `right` is a second column on the same row (dates, location). */
type Ln = { text: string; right?: string; bold?: boolean; bullet?: boolean; heading?: boolean }
type Blocks = { side: Ln[]; main: Ln[] }

function roleLines(c: Career, r: Role, dash: string): Ln[] {
  const d = range(c.dates, r, dash)
  const head: Ln[] =
    r.kind === 'project'
      ? [{ text: `${r.title} | ${r.employer}`, right: d, bold: true }]
      : c.head === 'title-at'
        ? [{ text: `${r.title} at ${r.employer}`, bold: true }, { text: d }]
        : c.head === 'pipe'
          ? [{ text: `${r.title} | ${r.employer} | ${d}`, bold: true }]
          : c.head === 'comma'
            ? [{ text: `${r.title}, ${r.employer}`, bold: true }, { text: d }]
            : [{ text: r.employer, right: d, bold: true }, { text: r.title, right: r.loc ?? c.city }]
  return [...head, ...(r.bullets ?? []).map((b) => ({ text: b, bullet: true }))]
}

export function blocksOf(c: Career, dashIn: string): Blocks {
  const dash = c.lostDash ? ' ' : dashIn
  // dash: ' - ' (spaced) or '-' (tight) — both occur in the wild and both must read.
  const side: Ln[] = [{ text: c.name.toUpperCase(), bold: true }, { text: `${c.city}, India` }, { text: `${c.name.split(' ')[0].toLowerCase()}@example.com` }, { text: '+91 98450 12345' }]
  side.push({ text: 'SKILLS', heading: true }, { text: c.skills.join(', ') })
  side.push({ text: 'EDUCATION', heading: true }, ...c.education.flatMap((e): Ln[] => [{ text: e.degree, bold: true }, { text: `${e.school}, ${e.from} ${dash} ${e.to}` }]))
  if (c.certs?.length) side.push({ text: 'CERTIFICATIONS', heading: true }, ...c.certs.map((t) => ({ text: t })))
  const main: Ln[] = []
  if (c.summary) main.push({ text: 'PROFESSIONAL SUMMARY', heading: true }, { text: c.summary })
  const work = c.roles.filter((r) => r.kind !== 'project')
  if (c.oldestFirst) work.reverse()
  if (!c.noExperienceHeading) main.push({ text: 'WORK EXPERIENCE', heading: true })
  for (const r of work) main.push(...roleLines(c, r, dash))
  const proj = c.roles.filter((r) => r.kind === 'project')
  if (proj.length) main.push({ text: 'PROJECTS', heading: true }, ...proj.flatMap((r) => roleLines(c, r, dash)))
  return { side, main }
}

// ---------- renderers ----------
const wrap = (s: string, n: number): string[] => {
  const out: string[] = []
  let line = ''
  for (const w of s.split(' ')) {
    if ((line + ' ' + w).trim().length > n) { out.push(line); line = w } else line = (line + ' ' + w).trim()
  }
  return line ? [...out, line] : out
}

/** Flow logical lines down pages in one column. */
function flow(lines: Ln[], x: number, width: number, startY: number, pages: Page[], pageOf = 0, rightX = 440): { y: number; page: number } {
  let y = startY
  let page = pageOf
  const run = (r: Run) => { (pages[page] ??= { runs: [] }).runs.push(r) }
  for (const l of lines) {
    const pieces = l.bullet ? wrap(l.text, Math.floor(width / 5.2) - 3).map((t, i) => (i === 0 ? '- ' : '  ') + t) : wrap(l.text, Math.floor(width / (l.bold ? 5.6 : 5.2)))
    if (l.heading) y -= 6
    for (const [i, t] of pieces.entries()) {
      if (y < 60) { page++; y = 750 }
      run({ text: t, x, y, size: l.heading ? 11 : 10, bold: l.bold || l.heading })
      if (i === 0 && l.right) run({ text: l.right, x: rightX, y, size: 10 })
      y -= 13
    }
  }
  return { y, page }
}

export function renderPdf(c: Career, twoColumn: boolean): Buffer {
  const { side, main } = blocksOf(c, twoColumn ? '-' : ' - ')
  const pages: Page[] = [{ runs: [] }]
  if (twoColumn) {
    flow(side, 36, 150, 750, pages)
    flow(main, 215, 340, 750, pages, 0, 440)
  } else {
    const head = side.slice(0, 4)
    const rest = [...main, ...side.slice(4)]
    const after = flow(head, 40, 520, 750, pages)
    flow(rest, 40, 520, after.y - 8, pages, after.page)
  }
  return makePdf(pages)
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:v="urn:schemas-microsoft-com:vml"'
function para(l: Ln): string {
  const run = (t: string, bold?: boolean) => `<w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>`
  const num = l.bullet ? '<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>' : ''
  const body = run(l.text, l.bold || l.heading) + (l.right ? `<w:r><w:tab/></w:r>${run(l.right)}` : '')
  return `<w:p>${num}${body}</w:p>`
}
const paras = (ls: Ln[]) => ls.map(para).join('')

export async function renderDocx(c: Career, mode: 'plain' | 'table' | 'textbox'): Promise<Buffer> {
  const { side, main } = blocksOf(c, mode === 'textbox' ? '–' : ' – ')
  let body: string
  if (mode === 'plain') body = paras([...side.slice(0, 4), ...main, ...side.slice(4)])
  else if (mode === 'table') body = `<w:tbl><w:tr><w:tc>${paras(side)}</w:tc><w:tc>${paras(main)}</w:tc></w:tr></w:tbl>`
  else {
    const box = `<w:txbxContent>${paras(side)}</w:txbxContent>`
    // Word stores every text box twice: a modern copy (Choice) and a legacy copy (Fallback).
    body = `<w:p><w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wps:wsp><wps:txbx>${box}</wps:txbx></wps:wsp></w:drawing></mc:Choice><mc:Fallback><w:pict><v:shape><v:textbox>${box}</v:textbox></v:shape></w:pict></mc:Fallback></mc:AlternateContent></w:r></w:p>${paras(main)}`
  }
  const z = new JSZip()
  z.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>')
  z.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document ${NS}><w:body>${body}</w:body></w:document>`)
  return z.generateAsync({ type: 'nodebuffer' })
}

export const RENDERINGS = ['pdf', 'pdf2col', 'docx', 'docx-table', 'docx-box'] as const
export type StressDoc = { file: string; buffer: Buffer; gold: Gold; rendering: (typeof RENDERINGS)[number]; heldout: boolean }

export async function buildStress(): Promise<StressDoc[]> {
  const out: StressDoc[] = []
  for (const c of CAREERS) {
    const gold = goldOf(c)
    const add = (rendering: StressDoc['rendering'], buffer: Buffer) => out.push({ file: `${c.id}.${rendering}.${rendering.startsWith('pdf') ? 'pdf' : 'docx'}`, buffer, gold, rendering, heldout: Boolean(c.heldout) })
    add('pdf', renderPdf(c, false))
    add('pdf2col', renderPdf(c, true))
    add('docx', await renderDocx(c, 'plain'))
    add('docx-table', await renderDocx(c, 'table'))
    add('docx-box', await renderDocx(c, 'textbox'))
  }
  return out
}

async function main() {
  const docs = await buildStress()
  const dir = join(import.meta.dirname, 'corpus', 'stress')
  mkdirSync(dir, { recursive: true })
  mkdirSync(join(import.meta.dirname, 'golden'), { recursive: true })
  for (const d of docs) writeFileSync(join(dir, d.file), d.buffer)
  writeFileSync(join(import.meta.dirname, 'golden', 'stress.json'), JSON.stringify({ as_of: AS_OF, docs: Object.fromEntries(docs.map((d) => [d.file, { ...d.gold, heldout: d.heldout }])) }, null, 1) + '\n')
  console.log(`wrote ${docs.length} documents to bench/corpus/stress/ and bench/golden/stress.json`)
}
if (process.argv[1] && import.meta.filename === process.argv[1]) void main()
