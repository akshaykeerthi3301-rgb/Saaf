/**
 * Résumé templates — three, all of which pass our own checker.
 *
 * ⚠️ EVERY TEMPLATE IS THE ATS-SAFE SUBSET. That is the constraint the founder
 * set and it is also the only defensible position for a product whose previous
 * screen just told the candidate that multi-column layouts, tables, text boxes
 * and text-inside-images are why their résumé does not parse. A "designer"
 * template that reintroduced any of those would end the argument in one
 * screenshot — the checker would flag the document the builder just produced.
 *
 * So the variation is TYPOGRAPHIC, not structural. Every template is one
 * column, real text, standard headings, a real bullet list. What changes is
 * where the name sits, how headings are marked, and how tight the spacing runs.
 * That is a smaller design space than the category leader's twenty, and each of
 * ours can be run through our own checker and come out clean — which is the
 * trade this product makes everywhere else.
 *
 * ⚠️ THE PARSE-SAFETY CLAIM IS TESTED, NOT ASSERTED. A test renders each
 * template to text and runs checkResume() over it, failing if any template
 * introduces a finding. A template that fails our own check must never ship,
 * however good it looks.
 */

export type TemplateId = 'classic' | 'compact' | 'headline'

export type TemplateSpec = {
  id: TemplateId
  name: string
  /** One line, in the candidate's terms, about when to pick it. */
  note: string
  /** Name centred over the page, or ranged left above the contact line. */
  align: 'center' | 'left'
  /** How a section heading is marked out. */
  heading: 'ruled' | 'caps' | 'bold'
  /** Line spacing and margins, tightest first. */
  density: 'tight' | 'regular' | 'airy'
}

export const TEMPLATES: TemplateSpec[] = [
  {
    id: 'classic',
    name: 'Classic',
    note: 'Centred name, a hairline under each heading. The safest choice, and the one most recruiters expect.',
    align: 'center',
    heading: 'ruled',
    density: 'regular',
  },
  {
    id: 'compact',
    name: 'Compact',
    note: 'Ranged left and tighter throughout. Pick this when your experience runs onto a second page and you want it on one.',
    align: 'left',
    heading: 'caps',
    density: 'tight',
  },
  {
    id: 'headline',
    name: 'Headline',
    note: 'A larger name and more air between sections. Reads well on screen, and uses a page and a half more often.',
    align: 'left',
    heading: 'bold',
    density: 'airy',
  },
]

export const DEFAULT_TEMPLATE: TemplateId = 'classic'

export function templateSpec(id: TemplateId | undefined): TemplateSpec {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]
}

/** Point sizes for the .docx builder, in docx's half-point units. */
export const DOCX_SIZES: Record<TemplateSpec['density'], { name: number; heading: number; body: number; gapBefore: number }> = {
  tight:   { name: 30, heading: 20, body: 19, gapBefore: 180 },
  regular: { name: 34, heading: 22, body: 20, gapBefore: 260 },
  airy:    { name: 40, heading: 23, body: 21, gapBefore: 340 },
}

/**
 * The look on top of the layout: a typeface and an accent colour for the name and headings. Both are
 * typographic like everything else here — the text, its order and its structure do not change, so every
 * combination parses exactly as Classic does. Typefaces are the four every Word and Google Docs install
 * has (an ATS reads the characters, not the font; an unusual font that falls back is the real risk).
 */
export type FontId = 'calibri' | 'arial' | 'georgia' | 'times'
export type AccentId = 'ink' | 'navy' | 'teal' | 'maroon'

export const FONTS: { id: FontId; name: string; docx: string; css: string }[] = [
  { id: 'calibri', name: 'Calibri', docx: 'Calibri', css: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif' },
  { id: 'arial', name: 'Arial', docx: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { id: 'georgia', name: 'Georgia', docx: 'Georgia', css: 'Georgia, "Times New Roman", serif' },
  { id: 'times', name: 'Times', docx: 'Times New Roman', css: '"Times New Roman", Times, serif' },
]

/** `hex` has no leading # — docx wants it bare; the preview adds one. `null` = leave the text its default colour. */
export const ACCENTS: { id: AccentId; name: string; hex: string | null }[] = [
  { id: 'ink', name: 'Black', hex: null },
  { id: 'navy', name: 'Navy', hex: '1F3A68' },
  { id: 'teal', name: 'Teal', hex: '0F766E' },
  { id: 'maroon', name: 'Maroon', hex: '7F1D1D' },
]

export const DEFAULT_FONT: FontId = 'calibri'
export const DEFAULT_ACCENT: AccentId = 'ink'

export const fontSpec = (id: FontId | undefined) => FONTS.find((f) => f.id === id) ?? FONTS[0]
export const accentSpec = (id: AccentId | undefined) => ACCENTS.find((a) => a.id === id) ?? ACCENTS[0]
