import { describe, it, expect } from 'vitest'
import { parseCsv, readConnectionsExport } from '../linkedin-connections'

// The shape LinkedIn exports: notes above the header, quoted fields, an email column.
const EXPORT = `Notes:
"When exporting your connection data, you may notice that some of the email addresses are missing."

First Name,Last Name,URL,Email Address,Company,Position,Connected On
Priya,Iyer,https://www.linkedin.com/in/priyaiyer,priya@example.com,"Groww India Pvt Ltd","Product Manager, Payments",05 Sep 2024
Rahul,Menon,https://www.linkedin.com/in/rahulm,,Razorpay,Engineer,12 Jan 2023
,,,,,,
Anil,,javascript:alert(1),,,,
`

describe('readConnectionsExport', () => {
  it('reads LinkedIn’s own export, finding the header below the notes', () => {
    const r = readConnectionsExport(EXPORT)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.connections).toHaveLength(3)
    expect(r.connections[0]).toEqual({
      fullName: 'Priya Iyer', company: 'Groww India Pvt Ltd', companyNorm: 'groww',
      position: 'Product Manager, Payments', profileUrl: 'https://www.linkedin.com/in/priyaiyer', connectedOn: '2024-09-05',
    })
  })

  it('never keeps the email address, and drops a link that is not LinkedIn', () => {
    const r = readConnectionsExport(EXPORT)
    if (!r.ok) throw new Error('parse failed')
    expect(JSON.stringify(r.connections)).not.toContain('priya@example.com')
    expect(r.connections[2].profileUrl).toBeNull()
  })

  it('says so when the file is something else', () => {
    expect(readConnectionsExport('name,email\na,b').ok).toBe(false)
  })
})

describe('parseCsv', () => {
  it('handles quotes, doubled quotes and commas inside fields', () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3')).toEqual([['a', 'b, c', 'say "hi"'], ['1', '2', '3']])
  })
})
