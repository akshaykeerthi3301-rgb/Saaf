import { describe, it, expect } from 'vitest'
import {
  coverLetterTemplate, fillVariables, followUpEmail, outreachTemplates, scoreAnswerHeuristic, TONES, unfilledTags,
  LINKEDIN_NOTE_MAX,
} from '@/lib/copilot-templates'
import type { CandidateFacts, RoleFacts } from '@/lib/tailor'
import { groundText } from '@/lib/copilot-writer'

const me: CandidateFacts = {
  currentTitle: 'Product Analyst', employer: 'Acme', yearsExperience: 2, skills: ['SQL', 'Python'], domain: null, credential: null,
}
const role: RoleFacts = { title: 'Product Manager', company: 'Zeta', description: 'SQL and roadmaps.' }

describe('variables', () => {
  it('fills known tags and leaves unknown ones visible', () => {
    expect(fillVariables('Hi [Hiring Manager] at [Company]', { Company: 'Zeta' })).toBe('Hi [Hiring Manager] at Zeta')
    expect(unfilledTags('Hi [Hiring Manager] at [Company] [Company]')).toEqual(['Hiring Manager', 'Company'])
  })
})

describe('coverLetterTemplate', () => {
  it.each(TONES)('%s: states only profile facts and passes the grounding filter', (tone) => {
    const text = fillVariables(coverLetterTemplate(me, tone), { Role: role.title, Company: role.company })
    expect(groundText(text, me, role)).toBeNull()
    expect(text).toContain('[Key Project]')
  })
})

describe('outreachTemplates', () => {
  it('writes all three contacts, notes within the LinkedIn limit', () => {
    const msgs = outreachTemplates(me, role)
    expect(msgs.map((m) => m.contact)).toEqual(['recruiter', 'manager', 'peer'])
    for (const m of msgs) {
      expect(m.note.length).toBeLessThanOrEqual(LINKEDIN_NOTE_MAX)
      expect(groundText(m.email, me, role)).toBeNull()
      expect(groundText(m.note, me, role)).toBeNull()
    }
  })
})

describe('groundText', () => {
  it('still refuses an invented employer or figure inside prose', () => {
    expect(groundText('I loved my time. At Flipkart I led growth.', me, role)).toMatch(/Flipkart/)
    expect(groundText('I grew revenue by 40%. It was fun.', me, role)).toMatch(/figure/)
  })
})

describe('followUpEmail', () => {
  it('words an application chase by days waited', () => {
    expect(followUpEmail({ stage: 'applied', days: 3, title: 'PM', company: 'Zeta' })!.advice).toMatch(/wait/)
    expect(followUpEmail({ stage: 'applied', days: 9, title: 'PM', company: 'Zeta' })!.body).toContain('9 days ago')
  })
  it('has nothing to send for saved or closed', () => {
    expect(followUpEmail({ stage: 'saved', days: 3, title: 'PM', company: 'Zeta' })).toBeNull()
    expect(followUpEmail({ stage: 'closed', days: 3, title: 'PM', company: 'Zeta' })).toBeNull()
  })
})

describe('scoreAnswerHeuristic', () => {
  it('rewards structure, a measure and relevance', () => {
    const good = 'At my last job we had a reporting backlog, and I had to clear it before the quarter closed. I built a SQL pipeline that automated the weekly reports and I set up alerts for failures. As a result the team saved 6 hours every week and the backlog was gone within a month. It taught me to automate early.'
    const weak = 'I am good at SQL.'
    expect(scoreAnswerHeuristic('q', good, ['SQL']).score).toBeGreaterThan(scoreAnswerHeuristic('q', weak, ['SQL']).score)
    expect(scoreAnswerHeuristic('q', weak, ['SQL']).improvements.length).toBeGreaterThan(0)
  })
})
