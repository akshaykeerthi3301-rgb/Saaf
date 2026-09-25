import { normaliseCompany } from '@/lib/company-name'

/**
 * Reads the Connections.csv that LinkedIn gives a member under Settings → Data
 * privacy → "Get a copy of your data" → Connections (2026-09-25; the lawful
 * version of Jobright's "5 former colleagues" and insider connections, which
 * need a people database Saaf will not scrape).
 *
 * The file is the candidate's own data. Only what the feature needs is kept:
 * name, company, position, profile link, date. The export's Email Address
 * column is deliberately dropped.
 */

export type Connection = {
  fullName: string
  company: string | null
  companyNorm: string | null
  position: string | null
  profileUrl: string | null
  connectedOn: string | null
}

export const MAX_CONNECTIONS = 30_000

/** RFC-4180-ish: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

const MONTHS: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' }

/** "05 Sep 2024" → "2024-09-05". Null for anything else. */
function isoDate(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/)
  if (!m || !MONTHS[m[2].toLowerCase()]) return null
  return `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`
}

/**
 * Connections from the export, or a reason it is not the right file. LinkedIn
 * puts a few lines of notes above the header, so the header is found, not
 * assumed to be line one.
 */
export function readConnectionsExport(text: string): { ok: true; connections: Connection[] } | { ok: false; reason: string } {
  const rows = parseCsv(text.replace(/^﻿/, ''))
  const h = rows.findIndex((r) => r.some((c) => c.trim() === 'First Name') && r.some((c) => c.trim() === 'Company'))
  if (h === -1) return { ok: false, reason: 'This is not LinkedIn’s Connections.csv — it needs “First Name” and “Company” columns.' }
  const head = rows[h].map((c) => c.trim())
  const col = (name: string) => head.indexOf(name)
  const [first, last, url, company, position, on] = ['First Name', 'Last Name', 'URL', 'Company', 'Position', 'Connected On'].map(col)

  const out: Connection[] = []
  for (const r of rows.slice(h + 1)) {
    const fullName = `${r[first] ?? ''} ${last >= 0 ? r[last] ?? '' : ''}`.replace(/\s+/g, ' ').trim().slice(0, 120)
    if (!fullName) continue
    const co = company >= 0 ? (r[company] ?? '').trim().slice(0, 200) : ''
    const link = url >= 0 ? (r[url] ?? '').trim() : ''
    out.push({
      fullName,
      company: co || null,
      companyNorm: co ? normaliseCompany(co) || null : null,
      position: position >= 0 ? (r[position] ?? '').trim().slice(0, 200) || null : null,
      profileUrl: /^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(link) ? link : null,
      connectedOn: on >= 0 ? isoDate(r[on] ?? '') : null,
    })
    if (out.length >= MAX_CONNECTIONS) break
  }
  return out.length ? { ok: true, connections: out } : { ok: false, reason: 'The file has the right columns but no connections in it.' }
}
