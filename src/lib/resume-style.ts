import { z } from 'zod'
import { accentSpec, fontSpec, templateSpec, type AccentId, type FontId, type TemplateId } from '@/lib/resume-templates'

/**
 * Everything a person can change about how their résumé LOOKS — the export drawer's controls — as one value.
 *
 * Built 2026-10-09 to the reference product's "Export Resume" drawer, which the founder called out as missing
 * ("the styling, nothing is there"): template cards, page size, accent colour and where it applies, font family and
 * four sizes, date format, bullet, divider, header alignment, education order, skills layout, five spacing sliders,
 * justify, reset.
 *
 * ⚠️ EVERY CONTROL HERE IS TYPOGRAPHIC OR ORDER-OF-TWO-LINES. Nothing adds a column, a table, a text box, an icon or
 * an image — the reference's "Structured" template (section names in a left sidebar) and its two-column skills grid
 * are deliberately NOT offered, because they are the layouts our own ATS checker marks down. The drawer says
 * "ATS-friendly format" and a test holds it to that (src/lib/__tests__/resume-style.test.ts).
 *
 * One value, two renderers: the on-screen page (ResumePaper) and the Word file (resume-docx.ts) both read this and
 * the same block list (resume-doc.ts), so what is previewed is what is downloaded.
 */

export type FontFamilyId = 'arial' | 'calibri' | 'cambria' | 'georgia' | 'times' | 'verdana' | 'tahoma'

/** Word falls back when a family is missing; these are the ones every Word, Google Docs and macOS install has. */
export const FONT_FAMILIES: { id: FontFamilyId; name: string; docx: string; css: string }[] = [
  { id: 'arial', name: 'Arial', docx: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { id: 'calibri', name: 'Calibri', docx: 'Calibri', css: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif' },
  { id: 'cambria', name: 'Cambria', docx: 'Cambria', css: 'Cambria, Caladea, Georgia, serif' },
  { id: 'georgia', name: 'Georgia', docx: 'Georgia', css: 'Georgia, "Times New Roman", serif' },
  { id: 'times', name: 'Times New Roman', docx: 'Times New Roman', css: '"Times New Roman", Times, serif' },
  { id: 'verdana', name: 'Verdana', docx: 'Verdana', css: 'Verdana, Geneva, sans-serif' },
  { id: 'tahoma', name: 'Tahoma', docx: 'Tahoma', css: 'Tahoma, Geneva, sans-serif' },
]

export type PresetId = 'standard' | 'compact' | 'centered'
export type PageSize = 'letter' | 'a4'
export type DateFormat = 'short' | 'long' | 'numeric' | 'year'
export type AccentScope = 'headings' | 'name' | 'both'

export type ResumeStyle = {
  preset: PresetId
  page: PageSize
  font: FontFamilyId
  /** Six hex digits, no '#'. Empty means the document's own black. */
  accent: string
  accentScope: AccentScope
  /** Points. */
  sizes: { name: number; section: number; sub: number; body: number }
  dateFormat: DateFormat
  bullet: '•' | '–'
  hideDivider: boolean
  headerAlign: 'left' | 'center' | 'right'
  headingAlign: 'left' | 'center'
  educationFirst: 'degree' | 'institution'
  skillsLayout: 'inline' | 'list'
  /** 0–10 sliders, mapped to real units below. */
  spacing: { section: number; entry: number; line: number; marginY: number; marginX: number }
  justify: boolean
}

const SPACING = {
  standard: { section: 5, entry: 3, line: 3, marginY: 5, marginX: 4 },
  compact: { section: 3, entry: 2, line: 1, marginY: 3, marginX: 3 },
  centered: { section: 5, entry: 3, line: 3, marginY: 5, marginX: 4 },
} as const

export const PRESETS: { id: PresetId; name: string; note: string; style: ResumeStyle }[] = [
  {
    id: 'standard',
    name: 'Standard',
    note: 'Name ranged left, a hairline under each heading. The safe default.',
    style: {
      preset: 'standard', page: 'a4', font: 'arial', accent: '', accentScope: 'headings',
      sizes: { name: 20, section: 11, sub: 10.5, body: 10 }, dateFormat: 'short', bullet: '•', hideDivider: false,
      headerAlign: 'left', headingAlign: 'left', educationFirst: 'degree', skillsLayout: 'inline',
      spacing: { ...SPACING.standard }, justify: false,
    },
  },
  {
    id: 'compact',
    name: 'Compact',
    note: 'Smaller type and tighter spacing — for a résumé that runs onto a second page.',
    style: {
      preset: 'compact', page: 'a4', font: 'arial', accent: '', accentScope: 'headings',
      sizes: { name: 17, section: 10, sub: 9.5, body: 9 }, dateFormat: 'short', bullet: '•', hideDivider: false,
      headerAlign: 'left', headingAlign: 'left', educationFirst: 'degree', skillsLayout: 'inline',
      spacing: { ...SPACING.compact }, justify: false,
    },
  },
  {
    id: 'centered',
    name: 'Centered',
    note: 'Name and headings on the centre line.',
    style: {
      preset: 'centered', page: 'a4', font: 'arial', accent: '', accentScope: 'headings',
      sizes: { name: 20, section: 11, sub: 10.5, body: 10 }, dateFormat: 'short', bullet: '•', hideDivider: false,
      headerAlign: 'center', headingAlign: 'center', educationFirst: 'degree', skillsLayout: 'inline',
      spacing: { ...SPACING.centered }, justify: false,
    },
  },
]

/** Quick picks beside the colour box. All are dark enough to read as text on white and to survive a black-and-white printer. */
export const ACCENT_SWATCHES: { name: string; hex: string }[] = [
  { name: 'Black', hex: '' },
  { name: 'Navy', hex: '1F3A68' },
  { name: 'Teal', hex: '0F766E' },
  { name: 'Maroon', hex: '7F1D1D' },
  { name: 'Forest', hex: '166534' },
  { name: 'Indigo', hex: '3730A3' },
  { name: 'Slate', hex: '475569' },
]

/** What the colour picker shows when no accent is set — the document's own near-black. */
export const DEFAULT_INK_HEX = '080808'

export const DEFAULT_STYLE: ResumeStyle = PRESETS[0].style

export const presetStyle = (id: PresetId): ResumeStyle => {
  const p = PRESETS.find((x) => x.id === id) ?? PRESETS[0]
  return { ...p.style, sizes: { ...p.style.sizes }, spacing: { ...p.style.spacing } }
}

/** A preset's look on top of what the person already chose for page, font and colour — picking a card changes the layout, not their taste. */
export const withPreset = (cur: ResumeStyle, id: PresetId): ResumeStyle => ({
  ...presetStyle(id),
  page: cur.page, font: cur.font, accent: cur.accent, accentScope: cur.accentScope,
})

export const fontFamily = (id: FontFamilyId) => FONT_FAMILIES.find((f) => f.id === id) ?? FONT_FAMILIES[0]

// ---- units ---------------------------------------------------------------------------------------------------------

export const PAGE = {
  letter: { widthIn: 8.5, heightIn: 11, twips: { w: 12240, h: 15840 }, label: 'Letter (8.5" × 11")' },
  a4: { widthIn: 8.27, heightIn: 11.69, twips: { w: 11906, h: 16838 }, label: 'A4 (210 × 297 mm)' },
} as const

export const sectionGapPt = (v: number) => 4 + v * 1.8
export const entryGapPt = (v: number) => v * 1.2
export const lineMultiple = (v: number) => 1 + v * 0.04
export const marginYIn = (v: number) => 0.3 + v * 0.07
export const marginXIn = (v: number) => 0.4 + v * 0.08

// ---- dates ---------------------------------------------------------------------------------------------------------

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const SHORT = MONTHS.map((m) => m.slice(0, 3))
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

/** "Jun 2025" / "June 2025" / "06/2025" / "2025" as asked. Anything that is not a recognisable month-year (Present, a bare year, prose) is left exactly as written. */
function formatPoint(token: string, fmt: DateFormat): string {
  const t = token.trim()
  let month: number | null = null
  let year: string | null = null
  let m = t.match(/^([A-Za-z]{3,9})\.?\s+(\d{4})$/)
  if (m) {
    const word = m[1].toLowerCase()
    const idx = SHORT.indexOf(word.slice(0, 3))
    // "Mar", "March", "Sept" — but not "Marketing", which also starts with "mar".
    if (idx >= 0 && MONTHS[idx].startsWith(word)) { month = idx; year = m[2] }
  }
  if (month === null) {
    m = t.match(/^(\d{1,2})[/-](\d{4})$/)
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) { month = Number(m[1]) - 1; year = m[2] }
  }
  if (month === null || year === null) return t
  if (fmt === 'year') return year
  if (fmt === 'numeric') return `${String(month + 1).padStart(2, '0')}/${year}`
  if (fmt === 'long') return `${cap(MONTHS[month])} ${year}`
  return `${cap(SHORT[month])} ${year}`
}

/** Applies a date format to a range written however the résumé wrote it ("Jun 2025 - Jul 2026", "2023 – 2025", "Apr 2022 – Present"). */
export function formatDates(dates: string | null | undefined, fmt: DateFormat): string | null {
  if (!dates) return null
  const parts = dates.split(/\s*(?:[-–—]|\bto\b)\s*/i)
  if (parts.length === 1) return formatPoint(parts[0], fmt)
  return parts.map((p) => formatPoint(p, fmt)).join(' – ')
}

// ---- legacy --------------------------------------------------------------------------------------------------------

/** The public ATS flow still sends the older three templates, a font and a colour; this is the same look in the new model. */
export function styleFromLegacy(template: TemplateId | undefined, font: FontId | undefined, accent: AccentId | undefined): ResumeStyle {
  const spec = templateSpec(template)
  const base = presetStyle(spec.density === 'tight' ? 'compact' : spec.align === 'center' ? 'centered' : 'standard')
  const hex = accentSpec(accent).hex
  return {
    ...base,
    page: 'a4',
    font: fontSpec(font).id as FontFamilyId,
    accent: hex ?? '',
    accentScope: hex ? 'both' : 'headings',
    headerAlign: spec.align,
    headingAlign: 'left',
    hideDivider: spec.heading !== 'ruled',
    sizes: spec.density === 'airy' ? { name: 24, section: 11.5, sub: 10.5, body: 10.5 } : base.sizes,
    spacing: spec.density === 'airy' ? { section: 7, entry: 4, line: 4, marginY: 5, marginX: 5 } : base.spacing,
  }
}

// ---- validation (the server action's boundary) ---------------------------------------------------------------------

const slider = z.number().int().min(0).max(10)
export const styleSchema = z.object({
  preset: z.enum(['standard', 'compact', 'centered']),
  page: z.enum(['letter', 'a4']),
  font: z.enum(FONT_FAMILIES.map((f) => f.id) as [FontFamilyId, ...FontFamilyId[]]),
  accent: z.string().regex(/^([0-9a-fA-F]{6})?$/),
  accentScope: z.enum(['headings', 'name', 'both']),
  sizes: z.object({ name: z.number().min(12).max(32), section: z.number().min(8).max(16), sub: z.number().min(8).max(14), body: z.number().min(7).max(13) }),
  dateFormat: z.enum(['short', 'long', 'numeric', 'year']),
  bullet: z.enum(['•', '–']),
  hideDivider: z.boolean(),
  headerAlign: z.enum(['left', 'center', 'right']),
  headingAlign: z.enum(['left', 'center']),
  educationFirst: z.enum(['degree', 'institution']),
  skillsLayout: z.enum(['inline', 'list']),
  spacing: z.object({ section: slider, entry: slider, line: slider, marginY: slider, marginX: slider }),
  justify: z.boolean(),
})
