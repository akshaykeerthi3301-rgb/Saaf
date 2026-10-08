import { describe, it, expect } from 'vitest'
import { resumeFromLinkedIn, wantedInZip } from '../linkedin-resume'

const PROFILE = `First Name,Last Name,Maiden Name,Address,Birth Date,Headline,Summary,Industry,Zip Code,Geo Location,Twitter Handles,Websites,Instant Messengers
Priya,Iyer,,"12 MG Road, Bengaluru",March 3,Product Manager at Paytm,"Product manager with 4 years in payments.
Led a team of 6.",Financial Services,560001,"Bengaluru, India",priya_tw,[PORTFOLIO:https://priya.dev],
`
const POSITIONS = `Company Name,Title,Description,Location,Started On,Finished On
Paytm,Product Manager,"• Shipped UPI autopay
• Cut churn 12%",Bengaluru,Jan 2023,
Zomato,Associate PM,Ran growth experiments,Gurugram,Jul 2021,Dec 2022
`
const EDUCATION = `School Name,Start Date,End Date,Notes,Degree Name,Activities
IIM Bangalore,2019,2021,,MBA,
`
const SKILLS = `Name
Product Management
SQL
Product Management
`

const files = [
  { name: 'Basic_LinkedInDataExport/Profile.csv', text: PROFILE },
  { name: 'Positions.csv', text: POSITIONS },
  { name: 'Education.csv', text: EDUCATION },
  { name: 'Skills.csv', text: SKILLS },
]

describe('résumé text from a LinkedIn export', () => {
  const r = resumeFromLinkedIn(files)
  it('builds ordinary résumé text from the four files', () => {
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.text).toContain('Priya Iyer')
    expect(r.text).toContain('Product Manager at Paytm')
    expect(r.text).toContain('EXPERIENCE')
    expect(r.text).toContain('Product Manager — Paytm | Jan 2023 – Present | Bengaluru')
    expect(r.text).toContain('• Shipped UPI autopay')
    expect(r.text).toContain('• Cut churn 12%')
    expect(r.text).toContain('MBA — IIM Bangalore | 2019 – 2021')
    expect(r.text).toContain('SKILLS\nProduct Management, SQL')
    expect(r.summary).toBe('Read 2 positions, 1 education entry, 2 skills from your export.')
  })
  it('leaves out the birth date, the street address and the messenger handles', () => {
    if (!r.ok) throw new Error('failed')
    for (const secret of ['March 3', 'MG Road', '560001', 'priya_tw']) expect(r.text).not.toContain(secret)
  })
  it('keeps dates as written and does not invent contact details', () => {
    if (!r.ok) throw new Error('failed')
    expect(r.text).not.toMatch(/@|\+?\d{10}/)
  })
  it('works from whatever subset the candidate exported', () => {
    expect(resumeFromLinkedIn([files[1]])).toMatchObject({ ok: true })
    expect(resumeFromLinkedIn([files[3]])).toMatchObject({ ok: true })
  })
  it('says what to export when it finds none of the four', () => {
    const none = resumeFromLinkedIn([{ name: 'Messages.csv', text: 'a,b\n1,2' }])
    expect(none.ok).toBe(false)
    expect(!none.ok && none.reason).toMatch(/Get a copy of your data/)
  })
  it('survives hostile and empty input', () => {
    for (const t of ['', '\u0000', '"unterminated', 'a,b,c\n'.repeat(5000)]) expect(() => resumeFromLinkedIn([{ name: 'Positions.csv', text: t }])).not.toThrow()
  })
})

describe('which ZIP entries are read', () => {
  it('only the four, at any depth, and not the macOS shadow copies', () => {
    expect(wantedInZip('Basic_LinkedInDataExport_10-08-2026/Positions.csv')).toBe(true)
    expect(wantedInZip('skills.csv')).toBe(true)
    expect(wantedInZip('messages.csv')).toBe(false)
    expect(wantedInZip('__MACOSX/._Positions.csv')).toBe(false)
  })
})
