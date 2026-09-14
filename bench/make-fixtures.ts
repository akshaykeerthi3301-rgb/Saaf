/**
 * Build the synthetic layout corpus.
 *
 * ONE résumé, four layouts. That is the entire design: if the parser is doing
 * its job, all four produce the same facts and near-identical scores, and any
 * spread between them is a layout bug with a name. The real-résumé corpus in
 * bench/corpus/real/ measures accuracy; this one measures INVARIANCE, which is
 * the property that was actually broken (PDF 34 vs DOCX 65 on one document).
 *
 * Run: npm run bench:fixtures
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { makePdf, type Run } from './pdf-writer'

const OUT = join(import.meta.dirname, 'corpus', 'synthetic')

/** The facts every layout must yield. Consumed by the bench manifest. */
export const EXPECTED = {
  name: 'Priya Iyer',
  email: 'priya.iyer@example.com',
  phone: '+91 98450 12345',
  experienceEntries: 2,
  titles: ['Senior Product Manager', 'Product Manager'],
  employers: ['Razorpay', 'Zeta'],
  educationEntries: 1,
  skillsAtLeast: 6,
}

const HEAD = ['PRIYA IYER', 'Bengaluru, Karnataka | priya.iyer@example.com | +91 98450 12345', 'linkedin.com/in/priyaiyer']
const SUMMARY = 'Product manager with 6 years in payments and lending, working on UPI rails and card issuing.'
const JOB1 = ['Senior Product Manager at Razorpay', 'Mar 2022 - Present']
const JOB1B = [
  'Led the UPI autopay rollout to 1.2 million merchants, lifting recurring collections by 18%.',
  'Cut merchant onboarding drop-off by 34% by rebuilding the KYC step.',
  'Ran the pricing experiment that added 2.4 crore in annual revenue.',
]
const JOB2 = ['Product Manager at Zeta', 'Jul 2019 - Feb 2022']
const JOB2B = [
  'Shipped a card-issuing console adopted by 40 banks across India and the Gulf.',
  'Interviewed 60 customers to rebuild the disputes flow, cutting tickets by 22%.',
]
const EDU = 'B.Tech Computer Science, NIT Trichy, 2019'
const SKILLS = 'SQL, Mixpanel, Figma, A/B testing, Jira, Amplitude, Python, Product analytics'

type L = { text: string; bold?: boolean; size?: number; gap?: number }

/** Lay a list of logical lines down one column, returning the runs. */
function column(lines: L[], x: number, top: number, lead = 14): Run[] {
  let y = top
  const runs: Run[] = []
  for (const l of lines) {
    y -= l.gap ?? 0
    if (l.text) runs.push({ text: l.text, x, y, size: l.size ?? 10, bold: l.bold })
    y -= lead
  }
  return runs
}

const body = (h: string[]): L[] => [
  { text: HEAD[0], size: 16, bold: true },
  { text: HEAD[1] },
  { text: HEAD[2] },
  { text: h[0], bold: true, gap: 10 },
  { text: SUMMARY },
  { text: h[1], bold: true, gap: 10 },
  ...JOB1.map((t) => ({ text: t, bold: t.includes(' at ') })),
  ...JOB1B.map((t) => ({ text: `• ${t}` })),
  ...JOB2.map((t) => ({ text: t, bold: t.includes(' at ') , gap: t.includes(' at ') ? 8 : 0 })),
  ...JOB2B.map((t) => ({ text: `• ${t}` })),
  { text: h[2], bold: true, gap: 10 },
  { text: EDU },
  { text: h[3], bold: true, gap: 10 },
  { text: SKILLS },
]

const STANDARD = ['PROFESSIONAL SUMMARY', 'WORK EXPERIENCE', 'EDUCATION', 'SKILLS']
const ODD = ['ABOUT ME', "WHERE I'VE WORKED", 'SCHOOLING', 'WHAT I KNOW']

// 1 — single column, the control.
writeFileSync(join(OUT, 'single-column.pdf'), makePdf([{ runs: column(body(STANDARD), 56, 740) }]))

// 2 — non-standard headings, single column. Isolates heading detection from layout.
writeFileSync(join(OUT, 'headings-odd.pdf'), makePdf([{ runs: column(body(ODD), 56, 740) }]))

// 3 — two column. Sidebar x=56 (narrow), main x=250. A real corridor at x~210.
{
  const side: L[] = [
    { text: HEAD[0], size: 14, bold: true },
    { text: 'Bengaluru, Karnataka' },
    { text: 'priya.iyer@example.com' },
    { text: '+91 98450 12345' },
    { text: 'linkedin.com/in/priyaiyer' },
    { text: 'SKILLS', bold: true, gap: 12 },
    ...SKILLS.split(', ').map((s) => ({ text: s })),
    { text: 'EDUCATION', bold: true, gap: 12 },
    { text: 'B.Tech Computer Science' },
    { text: 'NIT Trichy, 2019' },
  ]
  const main: L[] = [
    { text: 'PROFESSIONAL SUMMARY', bold: true },
    { text: 'Product manager with 6 years in payments' },
    { text: 'and lending, on UPI rails and card issuing.' },
    { text: 'WORK EXPERIENCE', bold: true, gap: 12 },
    ...JOB1.map((t) => ({ text: t, bold: t.includes(' at ') })),
    ...JOB1B.flatMap((t) => wrap(t, 46).map((w, i) => ({ text: i === 0 ? `• ${w}` : `  ${w}` }))),
    ...JOB2.map((t) => ({ text: t, bold: t.includes(' at '), gap: t.includes(' at ') ? 8 : 0 })),
    ...JOB2B.flatMap((t) => wrap(t, 46).map((w, i) => ({ text: i === 0 ? `• ${w}` : `  ${w}` }))),
  ]
  writeFileSync(
    join(OUT, 'two-column.pdf'),
    makePdf([{ runs: [...column(side, 56, 740, 13), ...column(main, 250, 740, 13)] }]),
  )
}

// 4 — table-shaped experience: dates right-aligned in their own x band.
{
  const runs: Run[] = [
    ...column(
      [
        { text: HEAD[0], size: 16, bold: true },
        { text: HEAD[1] },
        { text: HEAD[2] },
        { text: 'PROFESSIONAL SUMMARY', bold: true, gap: 10 },
        { text: SUMMARY },
        { text: 'WORK EXPERIENCE', bold: true, gap: 10 },
      ],
      56,
      740,
    ),
  ]
  let y = 628
  for (const [role, dates, bullets] of [
    ['Senior Product Manager at Razorpay', 'Mar 2022 - Present', JOB1B],
    ['Product Manager at Zeta', 'Jul 2019 - Feb 2022', JOB2B],
  ] as const) {
    runs.push({ text: role, x: 56, y, bold: true })
    runs.push({ text: dates, x: 420, y }) // same row, distinct x band -> a table
    y -= 14
    for (const b of bullets) {
      runs.push({ text: `• ${b}`, x: 70, y })
      y -= 14
    }
    y -= 8
  }
  runs.push(...column([{ text: 'EDUCATION', bold: true }, { text: EDU }, { text: 'SKILLS', bold: true, gap: 10 }, { text: SKILLS }], 56, y))
  writeFileSync(join(OUT, 'table-layout.pdf'), makePdf([{ runs }]))
}

function wrap(s: string, n: number): string[] {
  const out: string[] = []
  let line = ''
  for (const w of s.split(' ')) {
    if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w } else line += ' ' + w
  }
  if (line.trim()) out.push(line.trim())
  return out
}

console.log('wrote 4 synthetic fixtures to', OUT)
