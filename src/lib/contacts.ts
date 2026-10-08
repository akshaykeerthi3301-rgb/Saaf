import { normaliseCompany } from '@/lib/company-name'
import { parseCsv, readConnectionsExport, type Connection } from '@/lib/linkedin-connections'

/**
 * The candidate's OWN contacts, from the files and forms they control (TASK-183,
 * TASK-184; F-307, F-308). Pure.
 *
 * ⚠️ NEVER A STRANGER'S ADDRESS, NEVER A GUESS. Saaf does not find, infer or
 * pattern-guess anyone's email (first.last@company.com is a guess about a person who
 * never gave it to us — India's DPDP Act, and the reason F-308 "find any email" is
 * closed by this lawful form instead). The two honest sources of an address are:
 *   - one the EMPLOYER published in the posting itself (publishedEmails), shown with the
 *     sentence it appeared in; and
 *   - one the CANDIDATE already holds — their Google/Outlook contacts export or a person
 *     they typed in — shown with where it came from.
 */
export type Contact = Connection & { source: 'linkedin' | 'google' | 'manual'; email: string | null }

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const clean = (s: string | undefined, max: number) => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

/** A Google Contacts or Outlook CSV: one row a person, with an organisation and an email column. */
export function readGoogleContacts(text: string): { ok: true; contacts: Contact[] } | { ok: false; reason: string } {
  const rows = parseCsv(text.replace(/^﻿/, ''))
  const h = rows.findIndex((r) => r.some((c) => /^first name$/i.test(c.trim())) && r.some((c) => /^(e-?mail( 1)?( - value| address)?|organi[sz]ation( 1)? - name|organi[sz]ation name|company)$/i.test(c.trim())))
  if (h === -1) return { ok: false, reason: 'This is not a contacts export — it needs “First Name” and an email or organisation column (Google Contacts or Outlook CSV).' }
  const head = rows[h].map((c) => c.trim().toLowerCase())
  const find = (re: RegExp) => head.findIndex((c) => re.test(c))
  const [first, last, name, email, org, title] = [
    find(/^first name$/), find(/^last name$/), find(/^name$/),
    find(/^e-?mail( 1)?( - value| address)?$/), find(/^(organi[sz]ation( 1)? - name|organi[sz]ation name|company)$/),
    find(/^(organi[sz]ation( 1)? - title|organi[sz]ation title|job title)$/),
  ]
  const out: Contact[] = []
  for (const r of rows.slice(h + 1)) {
    const fullName = clean(`${r[first] ?? ''} ${last >= 0 ? r[last] ?? '' : ''}`, 120) || (name >= 0 ? clean(r[name], 120) : '')
    if (!fullName) continue
    const company = org >= 0 ? clean(r[org], 200) : ''
    const mail = email >= 0 ? clean(r[email], 254).toLowerCase() : ''
    out.push({
      fullName, company: company || null, companyNorm: company ? normaliseCompany(company) || null : null,
      position: title >= 0 ? clean(r[title], 200) || null : null, profileUrl: null, connectedOn: null,
      source: 'google', email: EMAIL.test(mail) ? mail : null,
    })
    if (out.length >= 30_000) break
  }
  // A contact with no company can never match a job, so it is not kept — and says so if that is every row.
  const useful = out.filter((c) => c.companyNorm)
  return useful.length ? { ok: true, contacts: useful } : { ok: false, reason: 'The file has the right columns, but none of the contacts has a company, so none could be matched to a job.' }
}

/** Whichever file this is: LinkedIn's export (its email column is dropped, as always) or a contacts export. */
export function readAnyContactsFile(text: string): { ok: true; source: Contact['source']; contacts: Contact[] } | { ok: false; reason: string } {
  const li = readConnectionsExport(text)
  if (li.ok) return { ok: true, source: 'linkedin', contacts: li.connections.map((c) => ({ ...c, source: 'linkedin' as const, email: null })) }
  const g = readGoogleContacts(text)
  if (g.ok) return { ok: true, source: 'google', contacts: g.contacts }
  return { ok: false, reason: 'This is neither LinkedIn’s Connections.csv nor a Google or Outlook contacts export. ' + g.reason }
}

/** A person the candidate typed in. Returns null if there is not enough to ever match a job. */
export function manualContact(input: { name: string; company: string; position?: string; email?: string }): Contact | null {
  const fullName = clean(input.name, 120)
  const company = clean(input.company, 200)
  const companyNorm = company ? normaliseCompany(company) : ''
  if (!fullName || !companyNorm) return null
  const mail = clean(input.email, 254).toLowerCase()
  return { fullName, company, companyNorm, position: clean(input.position, 200) || null, profileUrl: null, connectedOn: null, source: 'manual', email: EMAIL.test(mail) ? mail : null }
}

// ---------------------------------------------------------------- published in a posting

export type PublishedEmail = { email: string; context: string }

/**
 * Addresses the EMPLOYER wrote into the posting, each with the words around it so the
 * reader can see what it is for ("send your CV to careers@…"). Image file names that look
 * like addresses (logo@2x.png), placeholders and no-reply senders are not contacts.
 * Posted text is untrusted: this returns strings only, rendered as text.
 */
export function publishedEmails(description: string, max = 4): PublishedEmail[] {
  // ⚠️ BOUNDED ON PURPOSE. The first version used an unbounded `[...]+@` and the junk test
  // (100,000 characters with no "@") ran for 15 seconds — every start position rescans to the
  // end. A stored description is at most ~6,000 characters, but it is untrusted text, so the
  // input is capped and the local part is limited to the 64 characters an address allows.
  const text = description.slice(0, 20_000).replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
  const seen = new Set<string>()
  const out: PublishedEmail[] = []
  for (const m of text.matchAll(/[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){0,4}\.[A-Za-z]{2,24}/g)) {
    const email = m[0].toLowerCase().replace(/[.,;:)]+$/, '')
    if (seen.has(email) || /\.(png|jpe?g|gif|svg|webp)$/.test(email) || /@(example|test|domain|yourcompany|email)\./.test(email) || /^(no-?reply|donotreply|do-not-reply)@/.test(email)) continue
    seen.add(email)
    const at = m.index ?? 0
    out.push({ email, context: text.slice(Math.max(0, at - 70), at + m[0].length + 30).trim() })
    if (out.length >= max) break
  }
  return out
}
