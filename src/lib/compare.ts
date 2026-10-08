/**
 * The comparison pages (F-1204, TASK-203): "questions to ask any … — and Jobinko's answer".
 *
 * ⚠️ THESE PAGES MAKE CLAIMS ABOUT JOBINKO ONLY. A comparison that asserts what a named competitor does is
 * a claim Jobinko cannot keep current and may be sued over; one that lists the questions a candidate should
 * ask ANY tool, with Jobinko's own answer to each, can be checked line by line and cannot go stale on
 * somebody else's behalf. So no product is named, and every answer points at the place it can be
 * checked. `src/lib/__tests__/compare.test.ts` pins the answers that quote a number or a rule against
 * the code or data that holds it, so a page cannot quietly keep saying what the product stopped doing.
 */
export type Question = { q: string; saaf: string; check: { label: string; href: string } }
export type Comparison = { slug: string; title: string; metaTitle: string; description: string; standfirst: string; /** Said plainly under the standfirst when what follows describes something not everyone can use yet. */ note?: string; questions: Question[] }

/** Cited by the answers below, and re-checked against the code in compare.test.ts. */
export const FACTS = {
  applyDailyCap: 25,
  extensionSites: 23,
  keywordRoles: 75,
} as const

export const COMPARISONS: Comparison[] = [
  {
    slug: 'job-sites',
    title: 'Six questions to ask any job site',
    metaTitle: 'How Jobinko compares to a job board — six questions to ask any job site',
    description: 'Is the score explained? Where do the jobs come from? Are closed jobs removed? What does it cost? Six questions to ask any job site, and Jobinko’s answer to each.',
    standfirst: 'Job sites look alike until you ask what is behind the number and the listing. These are the six questions worth asking of any of them — Jobinko’s answers are below, each with where you can check it.',
    questions: [
      { q: 'When it scores a job for you, can you see the working?', saaf: 'Yes. The score is arithmetic, not a model: role match, skills, experience, location, work mode and credential each get points, and every component opens into the line from the posting it was read from. A component with nothing to measure is left out, not filled in.', check: { label: 'See a worked example on the home page', href: '/' } },
      { q: 'Where do the jobs come from?', saaf: 'From each employer’s own career page, through the public job feeds that Greenhouse, Lever, Ashby, Workable, Recruitee, SmartRecruiters and Workday publish. Not scraped from LinkedIn or Naukri, whose terms forbid it.', check: { label: 'Read the daily index audit', href: '/audit' } },
      { q: 'Does it keep showing jobs that have closed?', saaf: 'No. A role is removed once the employer’s own job feed stops listing it, and the public page for it says the role has closed.', check: { label: 'Browse roles', href: '/jobs' } },
      { q: 'Does it make up numbers about how many people applied?', saaf: 'No. Jobinko cannot see applicant counts, so it shows none — and it shows no “top applicant” label, because it has nothing to base one on.', check: { label: 'Open any public job page', href: '/jobs' } },
      { q: 'What does it cost, and can you leave with your data?', saaf: 'It is free today and nothing is for sale yet. You can download everything Jobinko holds about you in one file, and delete your account — which deletes the rest.', check: { label: 'Read the privacy page', href: '/privacy' } },
      { q: 'Does it ever turn you away?', saaf: 'No. A role you are under-qualified for is shown, scored honestly and with the reason, never hidden — a score is information, not a gate.', check: { label: 'Search jobs without an account', href: '/jobs' } },
    ],
  },
  {
    slug: 'ats-resume-checkers',
    title: 'Six questions to ask any ATS résumé checker',
    metaTitle: 'How Jobinko’s ATS checker compares — six questions to ask any résumé checker',
    description: 'Is the score a rule or an opinion? Does it show the line behind each finding? Does it keep your résumé? Six questions to ask any ATS résumé checker, and Jobinko’s answers.',
    standfirst: 'An ATS score is only useful if you can tell why it is what it is. These are the six questions worth asking of any résumé checker — Jobinko’s answers are below, each with where you can check it.',
    questions: [
      { q: 'Is the score a rule you can check, or a model’s opinion?', saaf: 'A rule. Every finding is a deterministic check with a reason and a quoted line from your own résumé. A language model is used for one optional step — rewriting a line after you have read your report — and it may only reword what you already wrote.', check: { label: 'Run the checker', href: '/tools/ats-checker' } },
      { q: 'Does it show the line behind each finding?', saaf: 'Yes: each finding names the line it came from, and the line is marked in your résumé as the parser read it.', check: { label: 'Run the checker', href: '/tools/ats-checker' } },
      { q: 'Does it keep your résumé?', saaf: 'No. Your file is read inside the request and dropped when it ends — never written to storage. Signed in, you can choose to save a version you built here, and delete it.', check: { label: 'Read the privacy page', href: '/privacy' } },
      { q: 'Do you need an account, an email, or a card?', saaf: 'None of them. The checker is free with no sign-up.', check: { label: 'Open the checker', href: '/tools/ats-checker' } },
      { q: 'Can it fix things without inventing facts?', saaf: 'The mechanical fixes (a stronger opening verb, matching punctuation, splitting a long line) change only the wording of your own line. A missing number or link is asked of you, never made up, and a rewrite that adds a figure or a name that was not in your line is refused and shown.', check: { label: 'See the fixes in the checker', href: '/tools/ats-checker' } },
      { q: 'Is it measured against real postings for your role?', saaf: `Yes: for ${FACTS.keywordRoles} roles, the keyword list is counted from real postings, with the share of postings that contain each term and how many postings that is.`, check: { label: 'Check your résumé against a role', href: '/tools/ats-checker' } },
    ],
  },
  {
    slug: 'auto-apply-tools',
    title: 'Six questions to ask any tool that applies for you',
    metaTitle: 'How Jobinko’s “Apply for me” compares — six questions to ask any auto-apply tool',
    description: 'Does it get past CAPTCHAs? Does it guess answers? Does it count an application the employer never confirmed? Six questions to ask any auto-apply tool, and Jobinko’s answers.',
    standfirst: 'A tool that submits applications in your name can do real damage with one wrong answer. These are the six questions worth asking of any of them — Jobinko’s answers are below, each with where you can check it.',
    note: 'Jobinko’s browser extension is not in the Chrome Web Store yet. These answers describe the extension as it is built, and the rules it will run by for anyone who installs it.',
    questions: [
      { q: 'Is it off until you turn it on?', saaf: 'Yes. “Apply for me” is off by default, runs only on jobs you queued, and only after you press Start.', check: { label: 'Read about the extension', href: '/extension' } },
      { q: 'Does it get past CAPTCHAs?', saaf: 'Never. A “prove you are human” check is the employer saying a person must be there, so Jobinko stops and hands you the tab.', check: { label: 'Read about the extension', href: '/extension' } },
      { q: 'Does it guess answers?', saaf: 'Never. It fills only what you told it, and only your own words for an employer’s own question when you wrote one for that exact question. One required field it has no answer for, and it stops and hands you the tab. Gender, religion, caste, passwords, ID numbers and consent boxes are never filled for you.', check: { label: 'Read about the extension', href: '/extension' } },
      { q: 'Does it count an application the employer never confirmed?', saaf: 'No. A job is marked applied only when the employer’s own page shows a confirmation after the click; a click with no confirmation is reported as “check this tab”.', check: { label: 'Read about the extension', href: '/extension' } },
      { q: 'Is there a limit, and can it be switched off from outside?', saaf: `Yes to both: at most ${FACTS.applyDailyCap} a day, and Jobinko can pause every extension at once before each job and again just before each Submit click.`, check: { label: 'Read about the extension', href: '/extension' } },
      { q: 'Does it say which sites it has actually been checked on?', saaf: `Yes. Of the ${FACTS.extensionSites} application sites it recognises, the list says which one has been checked on a real form and which have not — and for each, whether the form usually finishes in one page.`, check: { label: 'See the site-by-site list', href: '/extension' } },
    ],
  },
]

export const comparisonBySlug = (slug: string) => COMPARISONS.find((c) => c.slug === slug) ?? null
