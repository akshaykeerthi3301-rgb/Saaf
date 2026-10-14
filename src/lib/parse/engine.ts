import { pdfToLayout, pdfDocumentDate } from './pdf'
import { layoutToText } from './layout'
import { docxToText } from './docx'
import { docxToStructuredText, docxDocumentDate, NotAWordFileError } from './docx-xml'
import { MAX_RESUME_BYTES, MAX_RESUME_MB } from './constants'
import { ocrImage, ocrPdf } from './ocr'
import { resumeFacts } from './facts'
import { readResumeWithModel } from './llm'
import { monthsOf, parseRange, pickRoles, unionMonths, type Range } from './experience'
import type { ExperienceEntry } from './sections'
import { ParsedResumeSchema, type ParsedExperience, type ParsedResume } from '@/lib/types/parsed-resume'

/**
 * The parsing engine: one file in, one `ParsedResume` out. Layout-aware text (or local OCR) → sections → experience
 * arithmetic in code → current role. See docs/RESUME-PARSING-BLUEPRINT.md.
 *
 * NOT YET WIRED INTO THE UPLOAD ACTION. `parse-resume.ts` still runs the old path; this runs from `npm run audit:parse`
 * until the benchmark says it is better (blueprint TASK-266 — shadow mode first).
 *
 * ⚠️ INTERNSHIPS NEVER REACH THE HEADLINE NUMBER. They are classified here, stored in `internships`, and
 * `total_experience_*` is computed from `experience` alone. Fellowships, apprenticeships and CA articleship go the same
 * way; so do project entries. "Trainee" alone does NOT — a Graduate Engineer Trainee is a salaried job in India — but it
 * is flagged `trainee_role_counted` so the audit shows every case where that judgment was made.
 */

export const PARSER_VERSION = '2026-10-15.2'

export type EngineOptions = {
  asOf?: Date
  /** Ask the model for skills and to fill a missing title/employer. Spends tokens; off in the audit by default. */
  useModel?: boolean
  /** 'auto' OCRs only when the text layer is missing or garbled. */
  ocr?: 'auto' | 'never' | 'always'
  /** Receives the extracted text — the audit needs it to show the founder the raw line beside each parsed value. Never stored. */
  onText?: (text: string) => void
}

const MIN_CHARS_PER_PAGE = 120
const INTERNSHIP = /\b(intern(?:ship)?s?|apprentice(?:ship)?|fellow(?:ship)?|co-?op|summer (?:analyst|associate|trainee)|industrial training|articleship|article(?:d)? clerk)\b/i
const ACADEMIC_PROJECT = /\b(academic|college|capstone|thesis|dissertation|mini|major|final[- ]year)\s+project\b/i
const TRAINEE = /\btrainee\b/i

/** Exported so the rule — the one that keeps internships out of the headline number — has its own test. */
export const looksLikeInternship = (label: string) => INTERNSHIP.test(label)

function employmentType(e: ExperienceEntry): ParsedExperience['employment_type'] {
  const t = `${e.title ?? ''} ${e.employer ?? ''}`
  if (/\b(freelanc\w*|self[- ]employed)\b/i.test(t)) return 'freelance'
  if (/\bpart[- ]time\b/i.test(t)) return 'part_time'
  if (/\bvolunteer\w*\b/i.test(t)) return 'volunteer'
  if (/\b(advis[eo]r|board member)\b/i.test(t)) return 'advisory'
  return 'unknown'
}

/**
 * "Mar 2022 – Present" often arrives as "Mar 2022 Present": Tesseract drops the dash, and so do PDFs whose dash is an
 * unmapped glyph (a public sample lost it on every line). The section parser then splits wrongly — it took "2022" as the
 * whole date and left "Mar  Present" in the employer. Put the separator back, only between two date-looking tokens.
 */
const DATE_TOKEN = '(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?\\s+)?(?:19|20)\\d{2}'
export const repairMissingDashes = (t: string) =>
  t.replace(new RegExp(`(${DATE_TOKEN})[ \\t]+(?=(?:present|current|ongoing|till|now|${DATE_TOKEN}))`, 'gi'), '$1 – ')

/**
 * A header wrapped by a narrow column can cut a date in two: "… | Mar" over "2022-Present", or "Jan 2021 –" over
 * "Present". Join the pieces back when the first line ENDS on a month or a dash and the next BEGINS with the rest of a
 * date. Only that exact shape, so a sentence that happens to end in "March" is left alone.
 */
const MONTH_END = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?['’]?$|[–—-]$/i
const DATE_START = /^(?:\d{4}\b|\d{1,2}\/\d{2,4}|present\b|current\b|till date\b|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*['’]?\d)/i
export const repairWrappedDates = (t: string) => {
  const lines = t.split('\n')
  const out: string[] = []
  for (const line of lines) {
    const prev = out[out.length - 1]
    if (prev !== undefined && prev.length > 0 && MONTH_END.test(prev.trimEnd()) && DATE_START.test(line.trim())) out[out.length - 1] = `${prev.trimEnd()} ${line.trim()}`
    else out.push(line)
  }
  return out.join('\n')
}

/** Share of characters that are replacement glyphs, private-use icon-font glyphs or control codes. */
export function garbledRatio(text: string): number {
  if (!text) return 0
  const bad = text.match(/[\uFFFD\uE000-\uF8FF\u0000-\u0008\u000B\u000C\u000E-\u001F]/g)?.length ?? 0
  return bad / text.length
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
/** The model's value must be words the document contains — the cheap form of the blueprint's verifier. */
const grounded = (doc: string, v: string | undefined | null) => Boolean(v && norm(doc).includes(norm(v)))

type Classified = { entry: ExperienceEntry; range: Range; type: ParsedExperience['employment_type']; internship: boolean; project: boolean; futureEnd: boolean }

function classify(entries: ExperienceEntry[], asOf: Date): Classified[] {
  return entries.map((entry) => {
    let range = parseRange(entry.dates, asOf)
    // An end date still in the future ("Jun 2027" written in 2026) is a planned departure: the person works there now.
    // Judged on the EARLIEST reading of the end, so a year-only "2026" in 2026 is not promoted to "current".
    const nowIdx = asOf.getFullYear() * 12 + asOf.getMonth()
    const futureEnd = !range.open && range.end !== null && range.end.y * 12 + ((range.end.m ?? 1) - 1) > nowIdx
    if (futureEnd) range = { ...range, open: true, endToken: null }
    const label = `${entry.title ?? ''} ${entry.employer ?? ''}`
    return {
      entry,
      range,
      type: employmentType(entry),
      internship: INTERNSHIP.test(label),
      project: Boolean(entry.isProject) || ACADEMIC_PROJECT.test(label),
      futureEnd,
    }
  })
}

function toParsed(c: Classified, asOf: Date, counts: boolean): ParsedExperience {
  const { entry: e, range: r } = c
  return {
    title: cap(e.title, 200),
    employer: cap(e.employer, 200),
    dates_raw: cap(e.dates, 80),
    start: r.start,
    end: r.end,
    is_open: r.open,
    end_token: r.endToken,
    location: cap(e.location, 120),
    bullets: e.bullets.slice(0, 30).map((b) => b.slice(0, 600)),
    employment_type: c.type,
    is_internship: c.internship,
    is_project: c.project,
    date_precision: r.precision,
    months: monthsOf(r, asOf),
    counts_toward_total: counts,
  }
}

/**
 * Résumés with no "Experience" heading — common for freshers: "Title at Employer" on one line, dates on the next. The
 * section parser finds nothing there (rohan.pdf, the repo's oldest regression fixture, returned 0 roles and so 0 months).
 * Used ONLY when the section parser found no entries, and it stops at the first ALL-CAPS heading.
 */
function headinglessEntries(text: string, asOf: Date): ExperienceEntry[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const out: ExperienceEntry[] = []
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^[A-Z][A-Z &/]{3,30}$/.test(lines[i])) { if (out.length) break; continue }
    const next = parseRange(lines[i + 1], asOf)
    const at = lines[i].length < 100 && !parseRange(lines[i], asOf).start ? lines[i].match(/^(.+?)\s+(?:at|@|\|)\s+(.+)$/i) : null
    if (!at || !next.start || lines[i + 1].length > 45) continue
    const bullets: string[] = []
    for (let j = i + 2; j < lines.length && !/^[A-Z][A-Z &/]{3,30}$/.test(lines[j]); j++) {
      if (j + 1 < lines.length && parseRange(lines[j + 1], asOf).start && lines[j + 1].length <= 45 && /\s(?:at|@|\|)\s/i.test(lines[j])) break
      bullets.push(lines[j])
    }
    out.push({ title: at[1].trim(), employer: at[2].trim(), dates: lines[i + 1], location: null, bullets })
  }
  return out
}

/** Over-long strings are cut, not rejected: a 700-character 'bullet' is a merged paragraph, and one of those must not fail the whole résumé. */
const cap = (v: string | null, n: number) => (v === null ? null : v.slice(0, n))

const yearsIn = (s: string | null) => [...(s ?? '').matchAll(/(?:19|20)\d{2}/g)].map((m) => Number(m[0]))

export type FileErrorCode = 'too_large' | 'empty' | 'legacy_doc' | 'unsupported' | 'encrypted' | 'unreadable'
/** A file we cannot read, with a message that can be shown to the person as written — and never blames their résumé. */
export class ResumeFileError extends Error {
  constructor(readonly code: FileErrorCode, message: string) {
    super(message)
  }
}

export type FileKind = 'pdf' | 'docx' | 'image' | 'doc' | 'unknown'

/** What a file IS, from its first bytes. The browser's MIME type and the file name are both things a person can get wrong. */
export function detectKind(b: Buffer): FileKind {
  if (b.subarray(0, 1024).includes('%PDF-')) return 'pdf'
  if (b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return 'docx'
  if (b.length > 8 && b.readUInt32BE(0) === 0x89504e47) return 'image'
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image'
  if (b.length > 8 && b.readUInt32BE(0) === 0xd0cf11e0 && b.readUInt32BE(4) === 0xa1b11ae1) return 'doc'
  return 'unknown'
}

/** Entry point for an upload: checks size, sniffs the type, and turns every failure into a `ResumeFileError`. */
export async function parseResume(buffer: Buffer, opts: EngineOptions = {}): Promise<ParsedResume> {
  if (buffer.length === 0) throw new ResumeFileError('empty', 'That file is empty.')
  if (buffer.length > MAX_RESUME_BYTES) throw new ResumeFileError('too_large', `That file is over ${MAX_RESUME_MB} MB.`)
  const kind = detectKind(buffer)
  if (kind === 'doc') throw new ResumeFileError('legacy_doc', 'Old Word (.doc) files cannot be read. In Word, choose Save As → .docx or PDF and upload that.')
  if (kind === 'unknown') throw new ResumeFileError('unsupported', 'We can read PDF and Word (.docx) files, and photos or scans (PNG, JPG).')
  return parseResumeFile(buffer, kind, opts)
}

export async function parseResumeFile(buffer: Buffer, kind: 'pdf' | 'docx' | 'image', opts: EngineOptions = {}): Promise<ParsedResume> {
  const asOf = opts.asOf ?? new Date()
  const warnings: string[] = []

  // ---- 1. text: layout-aware first, local OCR when the text layer is missing or garbled ----
  let text = ''
  let source: ParsedResume['meta']['text_source'] = kind === 'docx' ? 'docx' : kind === 'image' ? 'image_ocr' : 'pdf_text'
  let pages = 1
  let columns = 1
  let ocrConfidence: number | null = null
  let ocrUsed = false
  const documentDate = kind === 'pdf' ? await pdfDocumentDate(buffer) : kind === 'docx' ? await docxDocumentDate(buffer) : null

  if (kind === 'pdf') {
    const layout = await pdfToLayout(buffer).catch((e: unknown) => {
      const name = e instanceof Error ? e.name : ''
      if (name === 'PasswordException') throw new ResumeFileError('encrypted', 'That PDF is password-protected. Remove the password (or print it to a new PDF) and upload again.')
      throw new ResumeFileError('unreadable', 'We could not open that PDF. It may be damaged — try exporting it again.')
    })
    pages = layout.pages.length
    columns = Math.max(0, ...layout.pages.map((p) => p.columns))
    text = layoutToText(layout)
    const sparse = text.trim().length / Math.max(1, pages) < MIN_CHARS_PER_PAGE
    if (opts.ocr !== 'never' && (opts.ocr === 'always' || sparse || garbledRatio(text) > 0.15)) {
      // OCR is a rescue, never a requirement: if it cannot run here (no WASM support on this host, a render failure) the
      // text layer we already have is kept; only a file with NOTHING else to offer fails, and says why.
      const o = await ocrPdf(buffer).catch(() => null)
      if (!o) {
        if (text.trim().length === 0) throw new ResumeFileError('unreadable', 'This looks like a scan and we could not read it here. You can type your details in instead.')
        warnings.push('OCR could not run; the text layer was used as it is.')
      } else if (o.text.trim().length > text.trim().length) {
        text = o.text
        source = 'ocr'
        ocrUsed = true
        ocrConfidence = Math.round(o.confidence)
        columns = o.columns
        if (o.skippedPages > 0) warnings.push(`Only the first ${o.pages} pages were read by OCR; ${o.skippedPages} more were skipped.`)
        if (o.confidence < 60) warnings.push(`OCR confidence is low (${Math.round(o.confidence)}%) — check every field.`)
      }
    } else if (sparse) warnings.push('The file has almost no text and OCR was disabled.')
  } else if (kind === 'docx') {
    try {
      text = await docxToStructuredText(buffer)
    } catch (e) {
      if (e instanceof NotAWordFileError) throw new ResumeFileError('unreadable', 'That file is not a readable Word (.docx) document.')
    }
    // The XML reader returned nothing usable: fall back to the older reader rather than fail.
    if (text.trim().length < 50) {
      const fallback = await docxToText(buffer).catch(() => '')
      if (fallback.trim().length > text.trim().length) {
        text = fallback
        source = 'docx_fallback'
        warnings.push('Read with the fallback Word reader; sidebars and text boxes may be missing.')
      }
    }
  } else {
    const o = await ocrImage(buffer).catch(() => {
      throw new ResumeFileError('unreadable', 'We could not read that image. Try a clearer photo, or upload the PDF.')
    })
    text = o.text
    ocrUsed = true
    ocrConfidence = Math.round(o.confidence)
    columns = o.columns
  }

  text = repairMissingDashes(repairWrappedDates(text))
  opts.onText?.(text)

  // ---- 2. structure ----
  const facts = resumeFacts(text)
  const s = facts.sections
  let entries = s.experience
  if (entries.length === 0) {
    entries = headinglessEntries(text, asOf)
    if (entries.length) warnings.push('No Experience heading found — read roles from "Title at Employer" + date lines.')
  }
  const classified = classify(entries, asOf)

  const professional = classified.filter((c) => !c.internship && !c.project)
  const internships = classified.filter((c) => c.internship && !c.project)
  const projects = classified.filter((c) => c.project)

  // Volunteer work is real but unpaid: listed under experience, left out of the headline.
  const counted = professional.filter((c) => c.type !== 'volunteer')
  const flags = new Set<ParsedResume['derived']['flags'][number]>()

  for (const c of counted) {
    if (!c.entry.dates) flags.add('entry_without_dates')
    if (c.range.endMissing) flags.add('end_missing')
    if (c.range.precision === 'ambiguous') flags.add('ambiguous_dates')
    if (c.range.start && c.range.end && (c.range.end.y * 12 + (c.range.end.m ?? 7)) < (c.range.start.y * 12 + (c.range.start.m ?? 7))) flags.add('dates_reversed')
    if (c.range.start && c.range.start.y * 12 + (c.range.start.m ?? 1) > asOf.getFullYear() * 12 + asOf.getMonth() + 1 + 6) flags.add('future_start')
    if (TRAINEE.test(c.entry.title ?? '')) flags.add('trainee_role_counted')
    if (c.futureEnd) flags.add('future_end')
  }

  // ---- 3. arithmetic, in code ----
  const total = unionMonths(counted.map((c) => c.range), asOf)
  const internshipMonths = unionMonths(internships.map((c) => c.range), asOf).mid

  // ---- 4. current role: dates decide; rule and model only fill when dates cannot ----
  const picked = pickRoles(counted.map((c, order) => ({ open: c.range.open, range: c.range, employmentType: c.type, order, weak: (c.entry.employer ? 0 : 1) + (c.range.precision === 'year' ? 1 : 0) })), asOf)
  if (picked.concurrent) flags.add('concurrent_roles')
  if (picked.recentlyEnded) flags.add('recently_ended')
  // "Present" in a file last saved long ago may mean THEN. The numbers are still computed to today; the flag says why they may be too large.
  if (documentDate && counted.some((c) => c.range.open && !c.futureEnd) && asOf.getTime() - new Date(documentDate).getTime() > 365 * 86_400_000) {
    flags.add('stale_document')
    warnings.push(`This file was last saved on ${documentDate}, so "Present" may mean then rather than now — experience is counted to today.`)
  }
  const role = (i: number | null) =>
    i === null ? null : { title: counted[i].entry.title, employer: counted[i].entry.employer, source: 'dates' as const }

  const current = role(picked.current)
  let latest: ParsedResume['derived']['latest_role'] = role(picked.latest)
  if (!latest && (facts.fields.currentTitle || facts.fields.employer)) {
    latest = { title: facts.fields.currentTitle ?? null, employer: facts.fields.employer ?? null, source: 'rule' }
  }

  const skills = [...s.skills]
  let modelUsed = false
  if (opts.useModel) {
    const m = await readResumeWithModel(text)
    if (m) {
      modelUsed = true
      const have = new Set(skills.map(norm))
      for (const k of m.skills) if (grounded(text, k) && !have.has(norm(k))) skills.push(k)
      if (!latest && grounded(text, m.currentTitle) && grounded(text, m.employer)) {
        latest = { title: m.currentTitle ?? null, employer: m.employer ?? null, source: 'model' }
      }
    }
  }

  // "N years of experience" STATED by the résumé — never the reader's own inference from dates (that is what we compute).
  const inferredWarning = facts.warnings.some((w) => /worked out your years/i.test(w))
  const stated = inferredWarning ? null : facts.fields.yearsExperience ?? null

  const dated = counted.filter((c) => monthsOf(c.range, asOf)).length
  let basis: ParsedResume['derived']['total_experience_basis'] = 'unknown'
  let months = { low: total.low, mid: total.mid, high: total.high }
  if (counted.length > 0 && dated === counted.length) basis = 'dates'
  else if (dated > 0) basis = 'partial_dates'
  else if (stated !== null) {
    basis = 'stated'
    const m = Math.round(stated * 12)
    months = { low: m, mid: m, high: m }
  }
  if ((basis === 'dates' || basis === 'partial_dates') && stated !== null && Math.abs(stated - total.mid / 12) > 1) flags.add('stated_vs_computed')
  if (/\b(?:19|20)xx\b|\bxxxx\b|\bmm\/yy(?:yy)?\b/i.test(text)) {
    flags.add('placeholder_dates')
    warnings.push('The dates look like template placeholders (e.g. "June 20xx").')
  }

  // A gap that lies inside a study period is not a mystery; say so.
  const studyYears = s.education.map((e) => yearsIn(e.dates)).filter((y) => y.length > 1).map((y) => [y[0] * 12, y[y.length - 1] * 12 + 11] as const)
  const gaps = total.gaps.map((g) => {
    const inStudy = Array.from({ length: g.months }, (_, k) => g.startIdx + k).filter((i) => studyYears.some(([a, b]) => i >= a && i <= b)).length
    return { after: g.after, months: g.months, reason: inStudy * 2 >= g.months ? ('education' as const) : ('unexplained' as const) }
  })

  const certHeading = /certif|licen[cs]e|course/i
  const certifications = s.other
    .filter((o) => certHeading.test(o.heading))
    .flatMap((o) => o.lines)
    .map((l) => l.replace(/^[\s●•▪◦‣∙·*-]+/, '').trim())
    .filter(Boolean)
    .map((c) => c.slice(0, 300))

  const out: ParsedResume = {
    schema_version: 1,
    meta: {
      parser_version: PARSER_VERSION,
      text_source: source,
      pages,
      layout_columns: columns,
      ocr_used: ocrUsed,
      ocr_confidence: ocrConfidence,
      model_used: modelUsed,
      chars: text.length,
      document_date: documentDate,
      warnings: [...warnings, ...facts.warnings].slice(0, 40),
    },
    contact: { name: s.contact.name, email: s.contact.email, phone: s.contact.phone, links: s.contact.links, city: facts.fields.city ?? null },
    summary: cap(s.summary, 2000),
    experience: professional.map((c) => toParsed(c, asOf, c.type !== 'volunteer')),
    internships: internships.map((c) => toParsed(c, asOf, false)),
    projects: projects.map((c) => toParsed(c, asOf, false)),
    education: s.education.map((e) => {
      const ys = yearsIn(e.dates)
      return { degree: e.qualification.slice(0, 300), institution: cap(e.institution, 200), dates_raw: cap(e.dates, 80), start_year: ys.length > 1 ? ys[0] : null, end_year: ys.length ? ys[ys.length - 1] : null }
    }),
    skills: skills.map((k) => k.slice(0, 80)).slice(0, 120),
    certifications: certifications.slice(0, 40),
    derived: {
      as_of: asOf.toISOString().slice(0, 10),
      current_role: current,
      latest_role: latest,
      total_experience_basis: basis,
      stated_experience_years: stated,
      total_experience_months: months.mid,
      total_experience_years: Math.round((months.mid / 12) * 10) / 10,
      total_experience_months_low: months.low,
      total_experience_months_high: months.high,
      internship_months: internshipMonths,
      gaps,
      flags: [...flags],
    },
  }
  // Throws on any shape violation — the audit counts that as a failure of the engine, not of the file.
  return ParsedResumeSchema.parse(out)
}
