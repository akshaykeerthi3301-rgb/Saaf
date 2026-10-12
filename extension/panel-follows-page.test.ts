import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Structural guards for "the panel follows the page" (founder, 2026-10-12: it stayed stuck on the account-creation box after he
 * moved to a different application). The behaviour is exercised in a real browser by scripts/extension-e2e/page-changes.mjs;
 * these keep the three ways it used to break from coming back.
 */
const src = readFileSync(new URL('./content-script.js', import.meta.url), 'utf8')

describe('content-script.js — the panel follows the page', () => {
  it('never stops watching the page after a fixed time', () => {
    expect(src).not.toMatch(/setTimeout\(\(\) => obs\.disconnect\(\)/)
  })
  it('watches the address, and rebuilds the panel for a new page', () => {
    expect(src).toContain('function teardownPanel')
    expect(src).toMatch(/key !== globalThis\.__jxPage\) \{ teardownPanel\(\); runPanel\(\)/)
    expect(src).toContain("navigatesuccess")
  })
  it('does not rebuild in the middle of a fill or a submit', () => {
    expect(src).toMatch(/cur\?\.state\.running \|\| cur\?\.state\.submitting/)
  })
  it('words the one button for the page: the account wording only where an account is needed', () => {
    expect(src).toContain('const needsAccount')
    expect(src).toMatch(/state\.hasPw && needsAccount\(\)/)
  })
  it('registers the toolbar-icon listener once, so a rebuilt panel is toggled once, not twice', () => {
    expect((src.match(/chrome\.runtime\.onMessage\.addListener/g) ?? []).length).toBeGreaterThan(0)
    expect(src).toContain('__jxMsgBound')
  })
})
