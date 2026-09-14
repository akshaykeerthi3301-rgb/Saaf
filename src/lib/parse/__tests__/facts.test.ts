import { describe, it, expect } from 'vitest'
import { resumeFacts } from '../facts'
import { checkResume } from '../../ats-check'

/**
 * ⚠️ THE BUG THIS PREVENTS WAS VISIBLE IN PRODUCTION, ON THE FOUNDER'S OWN
 * RÉSUMÉ. /resume showed "Manager" at "icici bank" with 2 years while the ATS
 * checker showed "Private Banking Manager (M1)" at "ICICI Bank Bangalore" with
 * 4 — same file, same session, two answers. Three readers existed
 * (extractFields, parseSections, the model) and each surface picked its own
 * precedence between them.
 *
 * A product arguing that its working can be checked cannot contradict itself
 * about the input.
 */
const RESUME = [
  'Akshay Keerthi',
  'akshay@example.com | +91 98450 12345 | Bengaluru',
  '',
  'EXPERIENCE',
  '',
  'Private Banking Manager (M1) at ICICI Bank',
  'Jun 2025 - Present',
  '• Managed a portfolio of HNI relationships across the Bengaluru region.',
  '• Grew assets under management by 18% across eleven months in the role.',
  '• Ran the onboarding process for forty new private banking clients.',
  '',
  'HR Associate at Amazon',
  'Apr 2022 - Jan 2023',
  '• Ran the onboarding programme for 200 new hires across two sites.',
  '• Built the reporting finance used to close the month, 6 days to 2.',
  '',
  'SKILLS',
  'Excel, SQL, Python, stakeholder management',
  '',
  'EDUCATION',
  'MBA, General Management, 2023 - 2025',
].join('\n')

describe('one résumé, one answer', () => {
  it('gives the checker and the profile screen identical title and employer', () => {
    const facts = resumeFacts(RESUME)
    const report = checkResume(RESUME)
    expect(report.read.currentTitle).toBe(facts.fields.currentTitle)
    expect(report.read.employer).toBe(facts.fields.employer)
  })

  it('reads the full title, not the last word of it', () => {
    const { fields } = resumeFacts(RESUME)
    expect(fields.currentTitle).toBe('Private Banking Manager (M1)')
    expect(fields.employer).toBe('ICICI Bank')
  })

  it('prefers a structured read only when the line produced both halves', () => {
    /**
     * `parseHeader` assigns positionally, so a role line carrying only a
     * company name returns it as the TITLE. Trusting that outright silenced
     * `title-unreadable` on exactly the documents it exists for — a confident
     * wrong answer, which is worse than none because the screen shows a title
     * either way.
     */
    const noTitle = RESUME.replace('Private Banking Manager (M1) at ICICI Bank', 'ICICI Bank')
    const { fields } = resumeFacts(noTitle)
    expect(fields.currentTitle).not.toBe('ICICI Bank')
  })

  it('never reports a city as the employer', () => {
    // Both readers had the same positional blind spot: a title-less role line
    // above a "dates | city" line returned the city as the company.
    const cityLine = RESUME.replace(
      'Private Banking Manager (M1) at ICICI Bank\nJun 2025 - Present',
      'ICICI Bank\nJun 2025 - Present | Bengaluru',
    )
    expect(resumeFacts(cityLine).fields.employer).not.toBe('Bengaluru')
  })

  it('drops a warning about a field it has just filled', () => {
    const { fields, warnings } = resumeFacts(RESUME)
    expect(fields.currentTitle).toBeTruthy()
    expect(warnings.some((w) => /current title/i.test(w))).toBe(false)
  })
})
