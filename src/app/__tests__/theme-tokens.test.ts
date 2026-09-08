import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The dark palette must define every token the light one does.
 *
 * ⚠️ THIS TEST EXISTS BECAUSE THE HALF-PALETTE DEFECT ALREADY HAPPENED ONCE.
 * src/app/globals.css records it: the saaf-ai export declared a `dark` variant
 * and defined no values for it, so on a machine set to dark, ink flipped to
 * near-white while --background stayed light and the landing page's primary
 * call to action rendered as pale text on a pale button. Invisible, with a
 * green build — which is exactly the class of failure a build cannot catch and
 * a test can.
 *
 * A missing token does not error at any layer. It silently inherits the light
 * value into a dark context, so the failure is always a contrast failure on
 * one screen rather than a crash. Adding a token to :root and forgetting the
 * .dark counterpart is a one-line mistake with a product-wide blast radius,
 * and this is the only thing standing in front of it.
 */

const css = readFileSync(join(__dirname, '..', 'globals.css'), 'utf8')

function tokensIn(selector: string): Set<string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{(.*?)\\n\\}`, 's').exec(css)
  if (!match) throw new Error(`No "${selector}" block found in globals.css`)
  return new Set([...match[1].matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]))
}

/** Typeface and radius are theme-invariant: a dark palette changes colour. */
const INVARIANT = /^--(font|radius)/

describe('theme token parity', () => {
  const light = [...tokensIn(':root')].filter((t) => !INVARIANT.test(t))
  const dark = tokensIn('.dark')

  it('defines a dark value for every light token', () => {
    expect([...light].filter((t) => !dark.has(t))).toEqual([])
  })

  it('defines no dark token that does not exist in light', () => {
    // An orphan here means a utility reads a variable that is undefined in the
    // default theme — the same failure, pointed the other way.
    const rootAll = tokensIn(':root')
    expect([...dark].filter((t) => !rootAll.has(t))).toEqual([])
  })

  it('declares its color-scheme, so form controls and scrollbars follow', () => {
    // [\s\S] rather than the /s flag: tsconfig targets ES2017, where the
    // dotAll flag is not available on a regex literal.
    expect(css).toMatch(/:root[\s\S]*?color-scheme:\s*light/)
    expect(css).toMatch(/\.dark\s*\{[\s\S]*?color-scheme:\s*dark/)
  })

  it('carries hairlines as low-alpha white in dark, not as a grey', () => {
    // The micro-border. A solid grey would read as a line drawn on top of the
    // surface; an alpha composites into it, which is the whole effect.
    const darkBlock = /\.dark\s*\{([\s\S]*?)\n\}/.exec(css)![1]
    expect(darkBlock).toMatch(/--border:\s*oklch\(1 0 0 \/ \d+%\)/)
  })
})

describe('no colour is hardcoded outside the token layer', () => {
  it('keeps components free of raw hex and palette utilities', () => {
    // The invariant that made the dark palette a single-file change: 35 files
    // render UI and not one names a colour, so redefining tokens inverts all of
    // them at once. Losing it means the next theme change is 35 edits.
    const offenders: string[] = []
    const banned = /#[0-9a-fA-F]{6}\b|\b(?:bg|text|border)-(?:zinc|slate|gray|neutral|stone)-\d{2,3}\b/

    /**
     * ⚠️ ONE EXEMPTION, AND IT IS A CAPABILITY LIMIT RATHER THAN A CONCESSION.
     *
     * next/og renders through satori, which resolves NO CSS variables and NO
     * Tailwind — it accepts inline styles only. There is no mechanism by which
     * a design token can reach these files, so the alternative to literal hex
     * is no social card at all. The values in them are copied from :root in
     * globals.css and the file says so.
     *
     * Widen this list only for another satori surface (twitter-image). Any
     * other .tsx reaching for a hex is the drift this test exists to catch.
     */
    const SATORI = /^(opengraph|twitter)-image\.tsx$|^og-card\.tsx$/

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name.endsWith('.tsx') && !SATORI.test(entry.name)) {
          readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
            if (banned.test(line)) offenders.push(`${full}:${i + 1}  ${line.trim()}`)
          })
        }
      }
    }
    walk(join(__dirname, '..', '..'))

    expect(offenders).toEqual([])
  })

  it('exempts only satori surfaces, and only one of them holds colour', () => {
    // ⚠️ THE EXEMPTION IS BOUNDED BY SHAPE, NOT BY COUNT. There are four
    // opengraph-image.tsx route files, and they are thin — each just calls
    // ogCard(). Exactly ONE file carries the literal colours, and route files
    // must stay free of them, or the exemption becomes a hole four files wide.
    const withColour: string[] = []
    const routeCards: string[] = []
    const banned = /#[0-9a-fA-F]{6}\b/

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (/^(opengraph|twitter)-image\.tsx$/.test(entry.name)) {
          routeCards.push(full)
          if (banned.test(readFileSync(full, 'utf8'))) withColour.push(full)
        }
      }
    }
    walk(join(__dirname, '..', '..'))

    expect(routeCards.length).toBeGreaterThan(0)
    expect(withColour).toEqual([])
  })
})
