import { parseCsv } from '@/lib/linkedin-connections'

/**
 * A résumé's TEXT, from the candidate's own LinkedIn data export (TASK-190, F-505).
 * LinkedIn's "Get a copy of your data" gives a ZIP of CSVs; four of them describe a
 * career: Profile.csv, Positions.csv, Education.csv, Skills.csv. This turns them into
 * plain résumé text under ordinary headings, which then goes through the SAME
 * parse-then-confirm path as any pasted résumé (the checker's parser, then the
 * candidate's own edits) — nothing here is a model's guess, and nothing is added that
 * the export did not say.
 *
 * ⚠️ WHAT IS DELIBERATELY LEFT OUT. Profile.csv also holds a birth date, a street
 * address and messenger handles; none of them belongs on a résumé and none is read.
 * The export has no phone or email in these four files; the candidate adds contact
 * details themselves in the text box before checking.
 *
 * Pure: the browser unzips (jszip) and hands the CSV texts over, so a large export
 * never travels to the server — only what is checked afterwards does.
 */
export type LinkedInFile = { name: string; text: string }
export type LinkedInResume = { ok: true; text: string; summary: string } | { ok: false; reason: string }

const norm = (s: string) => s.trim().toLowerCase()

/** Rows as objects, header found by name (LinkedIn sometimes puts notes above it). */
function table(file: LinkedInFile | undefined, must: string[]): Record<string, string>[] {
  if (!file) return []
  const rows = parseCsv(file.text.replace(/^﻿/, ''))
  const h = rows.findIndex((r) => must.every((m) => r.some((c) => norm(c) === m)))
  if (h === -1) return []
  const head = rows[h].map(norm)
  return rows.slice(h + 1).filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(head.map((k, i) => [k, (r[i] ?? '').trim()])))
}

const byName = (files: LinkedInFile[], base: string) => files.find((f) => f.name.split('/').pop()!.toLowerCase() === `${base}.csv`)
const clip = (s: string, n: number) => s.replace(/[ \t]+/g, ' ').trim().slice(0, n)

/** "Jan 2023" / "2023" → as written; empty → null. Dates are the candidate's own words, kept verbatim. */
const when = (r: Record<string, string>, a: string, b: string) => {
  const from = clip(r[a] ?? '', 20), to = clip(r[b] ?? '', 20)
  if (!from && !to) return ''
  return `${from || '?'} – ${to || 'Present'}`
}

export function resumeFromLinkedIn(files: LinkedInFile[]): LinkedInResume {
  const profile = table(byName(files, 'profile'), ['first name', 'last name'])[0]
  const positions = table(byName(files, 'positions'), ['company name', 'title'])
  const education = table(byName(files, 'education'), ['school name'])
  const skills = table(byName(files, 'skills'), ['name'])

  if (!profile && !positions.length && !education.length && !skills.length) {
    return { ok: false, reason: 'I could not find Profile.csv, Positions.csv, Education.csv or Skills.csv in that. In LinkedIn: Settings → Data privacy → Get a copy of your data → pick “Profile”, “Positions”, “Education” and “Skills”, then upload the ZIP (or those files).' }
  }

  const out: string[] = []
  const name = profile ? clip(`${profile['first name'] ?? ''} ${profile['last name'] ?? ''}`, 120) : ''
  if (name) out.push(name)
  if (profile?.headline) out.push(clip(profile.headline, 200))
  out.push('')

  if (profile?.summary) out.push('SUMMARY', clip(profile.summary.replace(/\s*\n\s*/g, ' '), 1200), '')

  if (positions.length) {
    out.push('EXPERIENCE')
    // LinkedIn lists the newest first; so does a résumé.
    for (const p of positions.slice(0, 20)) {
      const head = [clip(p.title ?? '', 150), clip(p['company name'] ?? '', 150)].filter(Boolean).join(' — ')
      if (!head) continue
      const dates = when(p, 'started on', 'finished on')
      const where = clip(p.location ?? '', 100)
      out.push([head, dates, where].filter(Boolean).join(' | '))
      for (const line of (p.description ?? '').split(/\r?\n|•|▪|●/).map((l) => clip(l, 400)).filter((l) => l.length > 3).slice(0, 10)) out.push(`• ${line.replace(/^[-–]\s*/, '')}`)
      out.push('')
    }
  }

  if (education.length) {
    out.push('EDUCATION')
    for (const e of education.slice(0, 10)) {
      const head = [clip(e['degree name'] ?? '', 150), clip(e['school name'] ?? '', 150)].filter(Boolean).join(' — ')
      if (!head) continue
      out.push([head, when(e, 'start date', 'end date')].filter(Boolean).join(' | '))
    }
    out.push('')
  }

  const skillNames = [...new Set(skills.map((s) => clip(s.name ?? '', 60)).filter(Boolean))].slice(0, 40)
  if (skillNames.length) out.push('SKILLS', skillNames.join(', '), '')

  const text = out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  const parts = [positions.length && `${positions.length} position${positions.length === 1 ? '' : 's'}`, education.length && `${education.length} education entr${education.length === 1 ? 'y' : 'ies'}`, skillNames.length && `${skillNames.length} skills`].filter(Boolean)
  return { ok: true, text, summary: parts.length ? `Read ${parts.join(', ')} from your export.` : 'Read your profile from your export.' }
}

/** The files we need out of a ZIP's names, so the browser unpacks only those four. */
export const LINKEDIN_NEEDED = ['profile.csv', 'positions.csv', 'education.csv', 'skills.csv']
export const wantedInZip = (path: string) => LINKEDIN_NEEDED.includes(path.split('/').pop()!.toLowerCase()) && !path.includes('__MACOSX')
