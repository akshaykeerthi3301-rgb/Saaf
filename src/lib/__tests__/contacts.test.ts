import { describe, it, expect } from 'vitest'
import { manualContact, publishedEmails, readAnyContactsFile, readGoogleContacts } from '../contacts'

const GOOGLE = `First Name,Middle Name,Last Name,E-mail 1 - Value,Organization 1 - Name,Organization 1 - Title
Asha,,Rao,Asha.Rao@Razorpay.com,Razorpay,Engineering Manager
Vikram,,Shah,,Groww India Pvt Ltd,PM
Neha,,Gupta,not-an-email,,Designer
,,,,,
`
const OUTLOOK = `First Name,Last Name,E-mail Address,Company,Job Title
Karan,Mehta,karan@acme.io,Acme,Analyst
`
const LINKEDIN = `First Name,Last Name,URL,Email Address,Company,Position,Connected On
Priya,Iyer,https://www.linkedin.com/in/priyaiyer,priya@example.com,Groww,PM,05 Sep 2024
`

describe('contacts files', () => {
  it('reads a Google Contacts export: lowercases and validates the email, keeps the company key', () => {
    const r = readGoogleContacts(GOOGLE)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.contacts.map((c) => [c.fullName, c.companyNorm, c.email])).toEqual([['Asha Rao', 'razorpay', 'asha.rao@razorpay.com'], ['Vikram Shah', 'groww', null]])
    expect(r.contacts.every((c) => c.source === 'google')).toBe(true)
  })
  it('drops a contact with no company — it could never match a job — and says so if that is everyone', () => {
    expect(readGoogleContacts('First Name,Last Name,E-mail 1 - Value,Organization 1 - Name\nA,B,a@b.co,\n')).toMatchObject({ ok: false })
  })
  it('reads an Outlook export too', () => {
    const r = readGoogleContacts(OUTLOOK)
    expect(r.ok && r.contacts[0]).toMatchObject({ fullName: 'Karan Mehta', companyNorm: 'acme', email: 'karan@acme.io' })
  })
  it('tells the two kinds of file apart, and NEVER keeps an email from LinkedIn’s', () => {
    const li = readAnyContactsFile(LINKEDIN)
    expect(li.ok && li.source).toBe('linkedin')
    expect(JSON.stringify(li)).not.toContain('priya@example.com')
    expect(li.ok && li.contacts[0].email).toBeNull()
    expect(readAnyContactsFile(GOOGLE)).toMatchObject({ ok: true, source: 'google' })
  })
  it('says what is wrong with a file that is neither', () => {
    const r = readAnyContactsFile('a,b\n1,2')
    expect(r.ok).toBe(false)
    expect(!r.ok && r.reason).toMatch(/neither LinkedIn/)
  })
})

describe('manualContact', () => {
  it('keeps what was typed, normalised', () => {
    expect(manualContact({ name: '  Asha   Rao ', company: 'Razorpay Software Pvt Ltd', position: 'EM', email: ' ASHA@Razorpay.com ' }))
      .toMatchObject({ fullName: 'Asha Rao', companyNorm: 'razorpaysoftware', email: 'asha@razorpay.com', source: 'manual' })
  })
  it('refuses what could never match a job, and ignores a malformed email rather than storing it', () => {
    expect(manualContact({ name: '', company: 'Acme' })).toBeNull()
    expect(manualContact({ name: 'A', company: '' })).toBeNull()
    expect(manualContact({ name: 'A', company: 'Acme', email: 'nope' })?.email).toBeNull()
  })
})

describe('publishedEmails — only what the employer wrote', () => {
  it('finds an address with the words around it', () => {
    const e = publishedEmails('Interested? Send your CV to Careers@Acme.com and we will reply within a week.')
    expect(e).toHaveLength(1)
    expect(e[0].email).toBe('careers@acme.com')
    expect(e[0].context).toContain('Send your CV to')
  })
  it('skips images, placeholders, no-reply senders and duplicates', () => {
    expect(publishedEmails('logo@2x.png apply@example.com noreply@acme.com no-reply@acme.com hr@acme.com HR@acme.com').map((x) => x.email)).toEqual(['hr@acme.com'])
  })
  it('strips trailing punctuation, caps the list, and never invents an address', () => {
    expect(publishedEmails('Write to jobs@acme.in.')[0].email).toBe('jobs@acme.in')
    expect(publishedEmails(Array.from({ length: 9 }, (_, i) => `p${i}@acme.com`).join(' '))).toHaveLength(4)
    expect(publishedEmails('Contact the Acme recruiting team for details')).toEqual([])
  })
  it('survives junk', () => {
    for (const t of ['', '@@@', '@.', 'a@b', 'x'.repeat(100_000)]) expect(() => publishedEmails(t)).not.toThrow()
  })
})
