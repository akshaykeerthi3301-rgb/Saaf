/**
 * A starting résumé from a few typed answers (F-507, TASK-188 — "fast mode").
 *
 * ⚠️ NOTHING IS WRITTEN FOR THE CANDIDATE. Every word in the result is one they typed,
 * placed under the headings a parser reads; the only sentences Saaf adds are the plain
 * summary built from their own title, years and skills ("Product Manager with 4 years of
 * experience in SQL, Roadmapping."), and a visible [bracketed prompt] wherever a number
 * or an achievement is missing — never a made-up one. The text lands in the paste box
 * for them to read and edit before anything is scored, exactly like the LinkedIn start
 * (src/lib/linkedin-resume.ts). Pure.
 */
export type FastAnswers = {
  name: string; email: string; phone: string; city: string
  targetRole: string; years: string; skills: string
  jobTitle: string; company: string; dates: string; achievements: string
  school: string; degree: string; gradYear: string
}

export const EMPTY_FAST: FastAnswers = {
  name: '', email: '', phone: '', city: '', targetRole: '', years: '', skills: '',
  jobTitle: '', company: '', dates: '', achievements: '', school: '', degree: '', gradYear: '',
}

const clip = (s: string, n: number) => s.replace(/[ \t]+/g, ' ').trim().slice(0, n)
const list = (s: string, n: number) => [...new Set(s.split(/[,;\n]/).map((x) => clip(x, 60)).filter(Boolean))].slice(0, n)

export function resumeFromAnswers(a: FastAnswers): { ok: true; text: string } | { ok: false; reason: string } {
  const name = clip(a.name, 120)
  const role = clip(a.jobTitle || a.targetRole, 100)
  if (!name) return { ok: false, reason: 'Add your name first — it is the first line of the résumé.' }
  if (!role) return { ok: false, reason: 'Add the role you want, or your latest job title.' }

  const skills = list(a.skills, 30)
  const years = /^\d{1,2}(\.\d)?$/.test(a.years.trim()) ? a.years.trim() : ''
  const out: string[] = [name]
  const contact = [clip(a.email, 120), clip(a.phone, 30), clip(a.city, 80)].filter(Boolean)
  if (contact.length) out.push(contact.join(' | '))
  out.push('')

  const target = clip(a.targetRole, 100) || role
  const summary = `${target}${years ? ` with ${years} ${years === '1' ? 'year' : 'years'} of experience` : ''}${skills.length ? ` in ${skills.slice(0, 3).join(', ')}` : ''}.`
  out.push('SUMMARY', summary, '')

  const company = clip(a.company, 120)
  if (a.jobTitle.trim() || company) {
    out.push('EXPERIENCE')
    out.push([[clip(a.jobTitle, 100), company].filter(Boolean).join(' — '), clip(a.dates, 40)].filter(Boolean).join(' | '))
    const lines = a.achievements.split(/\r?\n/).map((l) => clip(l.replace(/^[-•▪●*]\s*/, ''), 300)).filter((l) => l.length > 3).slice(0, 8)
    if (lines.length) for (const l of lines) out.push(`• ${l}`)
    else out.push('• [What did you do here, and what changed because of it? Add a number if you can.]')
    out.push('')
  }

  if (a.school.trim() || a.degree.trim()) {
    out.push('EDUCATION', [[clip(a.degree, 100), clip(a.school, 120)].filter(Boolean).join(' — '), clip(a.gradYear, 10)].filter(Boolean).join(' | '), '')
  }
  if (skills.length) out.push('SKILLS', skills.join(', '), '')

  return { ok: true, text: out.join('\n').replace(/\n{3,}/g, '\n\n').trim() }
}
