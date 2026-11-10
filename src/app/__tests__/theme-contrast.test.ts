import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Contrast is measured here, from the tokens, on every run — never estimated.
 *
 * ⚠️ WHY THIS EXISTS. Until 2026-11-10 the contrast claims in globals.css were
 * comments ("7.8:1 on zinc-950", "white label on either end clears 4.5:1") that
 * nothing checked, and docs/PROJECT-STATE.md Stage CA recorded three proposed
 * palettes whose ratios were "an assumption, not a measurement". A palette
 * change is six values in one file, which is exactly why it needs a gate: the
 * cheap edit is also the cheap regression.
 *
 * It parses the two palette blocks, converts oklch → sRGB, composites any
 * alpha over the surface it sits on, and applies the WCAG 2.x formula. The
 * thresholds are WCAG 2.2 AA: 4.5:1 for text (1.4.3), 3:1 for the boundary of
 * a control, a focus ring and a meaningful graphic (1.4.11).
 *
 * `npx vitest run src/app/__tests__/theme-contrast.test.ts` prints the table
 * that docs/UI-MAKEOVER-DECISIONS.md quotes.
 */

const css = readFileSync(join(__dirname, '..', 'globals.css'), 'utf8')

type Rgba = [number, number, number, number] // linear-light sRGB + alpha

function block(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(css)
  if (!m) throw new Error(`No "${selector}" block in globals.css`)
  return Object.fromEntries([...m[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((x) => [x[1], x[2].trim()]))
}

/** oklch(L C H [/ A%]) → linear sRGB. Björn Ottosson's OKLab matrices. */
function parse(value: string): Rgba {
  const m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)%)?\s*\)/.exec(value)
  if (!m) throw new Error(`Not an oklch() colour: ${value}`)
  const [L, C, H] = [Number(m[1]), Number(m[2]), (Number(m[3]) * Math.PI) / 180]
  const a = C * Math.cos(H)
  const b = C * Math.sin(H)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clamp = (x: number) => Math.max(0, Math.min(1, x))
  return [
    clamp(4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s),
    m[4] === undefined ? 1 : Number(m[4]) / 100,
  ]
}

const gamma = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)
const linear = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)

/** Alpha compositing happens on gamma-encoded values in a browser, so it does here. */
function over(top: Rgba, bottom: Rgba, alpha = top[3]): Rgba {
  const mix = (t: number, u: number) => linear(gamma(t) * alpha + gamma(u) * (1 - alpha))
  return [mix(top[0], bottom[0]), mix(top[1], bottom[1]), mix(top[2], bottom[2]), 1]
}

const luminance = (c: Rgba) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

function ratio(fg: Rgba, bg: Rgba): number {
  const [hi, lo] = [luminance(over(fg, bg)), luminance(bg)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Machado, Oliveira & Fernandes (2009), severity 1.0, applied in linear RGB. */
const CVD = {
  protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
} as const

function simulate(c: Rgba, m: readonly number[]): Rgba {
  const k = (x: number) => Math.max(0, Math.min(1, x))
  return [
    k(m[0] * c[0] + m[1] * c[1] + m[2] * c[2]),
    k(m[3] * c[0] + m[4] * c[1] + m[5] * c[2]),
    k(m[6] * c[0] + m[7] * c[1] + m[8] * c[2]),
    1,
  ]
}

function oklab(c: Rgba): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2])
  const m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2])
  const s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2])
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

/** Distance in OKLab. About 0.02 is one just-noticeable difference. */
function deltaE(x: Rgba, y: Rgba): number {
  const [p, q] = [oklab(x), oklab(y)]
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
}

/**
 * [foreground, the surface it is drawn on, minimum ratio, what it is].
 * A surface written "a/50@b" is token a at 50% alpha over token b.
 */
const TEXT = 4.5
const NON_TEXT = 3
const PAIRS: [string, string, number, string][] = [
  ['foreground', 'background', TEXT, 'body text on the page'],
  ['foreground', 'card', TEXT, 'body text on a card'],
  ['foreground', 'secondary', TEXT, 'text on a chip or quiet fill'],
  ['secondary-foreground', 'secondary', TEXT, 'chip label'],
  ['muted-foreground', 'background', TEXT, 'secondary text on the page'],
  ['muted-foreground', 'card', TEXT, 'secondary text on a card'],
  ['muted-foreground', 'secondary', TEXT, 'secondary text on a chip'],
  ['muted-foreground', 'secondary/50@card', TEXT, 'secondary text on the score panel'],
  ['primary-foreground', 'primary', TEXT, 'label on a solid ink button'],
  ['accent', 'background', TEXT, 'link or eyebrow on the page'],
  ['accent', 'card', TEXT, 'link or eyebrow on a card'],
  ['accent', 'secondary', TEXT, 'link on a quiet fill'],
  ['accent', 'accent/10@card', TEXT, 'label on an accent-tinted chip'],
  ['accent-foreground', 'accent', TEXT, 'label on an accent fill'],
  ['brand-foreground', 'brand', TEXT, 'label on the action button'],
  ['brand-2', 'card', TEXT, 'the "changed" marker in the tailor'],
  ['destructive', 'background', TEXT, 'error message on the page'],
  ['destructive', 'card', TEXT, 'error message on a card'],
  ['score-high', 'card', TEXT, 'band word, high'],
  ['score-high', 'secondary/50@card', TEXT, 'band word, high, on the score panel'],
  ['score-high', 'score-high/10@card', TEXT, 'label on a high-tinted chip'],
  ['score-high', 'score-high/20@card', TEXT, 'label on the strongest high tint in use'],
  ['score-mid', 'score-mid/15@card', TEXT, 'label on a mid-tinted chip (a missing skill in the job detail)'],
  ['score-mid', 'score-mid/15', TEXT, 'a missing keyword highlighted in the job description, on the page ground'],
  ['accent', 'accent/20@card', TEXT, 'label on the strongest accent tint in use'],
  ['destructive', 'destructive/10@card', TEXT, 'error text on an error-tinted box'],
  ['brand-2', 'brand-2/15@card', TEXT, 'changed text on its own highlight'],
  ['score-mid', 'card', TEXT, 'band word, mid'],
  ['score-mid', 'secondary/50@card', TEXT, 'band word, mid, on the score panel'],
  ['score-low', 'card', TEXT, 'band word, low'],
  ['score-low', 'secondary/50@card', TEXT, 'band word, low, on the score panel'],
  ['paper-ink', 'paper', TEXT, 'résumé preview text'],
  ['paper-muted', 'paper', TEXT, 'résumé preview secondary text'],
  ['input', 'background', NON_TEXT, 'field boundary on the page'],
  ['input', 'card', NON_TEXT, 'field boundary on a card'],
  ['ring', 'background', NON_TEXT, 'focus ring on the page'],
  ['ring', 'card', NON_TEXT, 'focus ring on a card'],
  ['brand', 'background', NON_TEXT, 'action button against the page'],
  ['brand', 'card', NON_TEXT, 'action button against a card'],
  ['score-high', 'secondary', NON_TEXT, 'ring arc on its own track, high'],
  ['score-mid', 'secondary', NON_TEXT, 'ring arc on its own track, mid'],
  ['score-low', 'secondary', NON_TEXT, 'ring arc on its own track, low'],
]

for (const [theme, selector] of [['light', ':root'], ['dark', '.dark']] as const) {
  describe(`${theme} palette — measured contrast`, () => {
    const tokens = block(selector)
    const colour = (name: string): Rgba => parse(tokens[`--${name}`] ?? '')

    /** "secondary/50@card" → secondary at 50% over card; "card" → card over the page. */
    const surface = (spec: string): Rgba => {
      const [top, under] = spec.split('@')
      const [name, alpha] = top.split('/')
      const base = under ? surface(under) : colour('background')
      return over(colour(name), base, alpha ? Number(alpha) / 100 : colour(name)[3])
    }

    const rows = PAIRS.map(([fg, bg, min, what]) => {
      const on = surface(bg)
      return { fg, bg, what, min, ratio: Math.round(ratio(colour(fg), on) * 100) / 100 }
    })

    it('prints the table the decision log quotes', () => {
      console.log(`\n${theme}\n` + rows.map((r) => `  ${r.ratio.toFixed(2).padStart(5)}:1  (min ${r.min})  ${r.fg} on ${r.bg} — ${r.what}`).join('\n'))
    })

    it('clears WCAG 2.2 AA on every pair the product depends on', () => {
      expect(rows.filter((r) => r.ratio < r.min).map((r) => `${r.fg} on ${r.bg}: ${r.ratio} < ${r.min} (${r.what})`)).toEqual([])
    })

    it('keeps the three score bands apart without relying on hue alone', () => {
      // The bands differ in lightness as well as hue, and stay apart when the
      // red–green axis is removed. 0.08 is four just-noticeable differences.
      // (The ring also prints the number and the band word; colour is the
      // third cue, not the only one — see score-ring.tsx.)
      const bands = ['score-high', 'score-mid', 'score-low'].map(colour)
      const report: string[] = []
      const failures: string[] = []
      for (const [name, matrix] of [['normal vision', null], ...Object.entries(CVD)] as [string, readonly number[] | null][]) {
        const seen = matrix ? bands.map((b) => simulate(b, matrix)) : bands
        const d = [deltaE(seen[0], seen[1]), deltaE(seen[1], seen[2]), deltaE(seen[0], seen[2])]
        report.push(`  ${name.padEnd(13)} high↔mid ${d[0].toFixed(3)}  mid↔low ${d[1].toFixed(3)}  high↔low ${d[2].toFixed(3)}`)
        if (Math.min(...d) < 0.08) failures.push(`${name}: ${d.map((x) => x.toFixed(3)).join(' / ')}`)
      }
      console.log(`\n${theme} — score band separation (OKLab ΔE)\n` + report.join('\n'))
      expect(failures).toEqual([])
    })

    it('keeps a low score out of the error colour', () => {
      // DESIGN.md: "destructive is never used for a match outcome. A low score
      // is a correct answer, not a failure." Until 2026-11-10 --score-low and
      // --destructive were the same value in both palettes.
      expect(tokens['--score-low']).not.toBe(tokens['--destructive'])
      expect(deltaE(colour('score-low'), colour('destructive'))).toBeGreaterThan(0.1)
    })
  })
}
