import { describe, it, expect } from 'vitest'
import { extractSkillPhrases } from '../skills'

/**
 * QA-20: an Alteryx posting naming "Alteryx Server" became the interview
 * question "How much have you worked with Server?".
 */
describe('extractSkillPhrases — product-name tails', () => {
  it('does not read the generic tail of a product name as a skill', () => {
    const found = extractSkillPhrases('Experience deploying Alteryx Server and SQL Server in production.')
    expect(found.map((s) => s.toLowerCase())).not.toContain('server')
    // The brand in front is still read on its own merits.
    expect(found.map((s) => s.toLowerCase())).toContain('sql')
  })

  it('handles a shared-brand list — the live Alteryx posting', () => {
    const found = extractSkillPhrases('Deliver training on the Alteryx Designer and Server products').map((s) => s.toLowerCase())
    expect(found).not.toContain('server')
  })

  it('keeps a lowercase use after a list word', () => {
    expect(extractSkillPhrases('Python and server administration').map((s) => s.toLowerCase())).toContain('server')
  })

  it('still reads the word where it stands on its own', () => {
    expect(extractSkillPhrases('Hands-on server administration and patching.').map((s) => s.toLowerCase())).toContain('server')
  })

  it('treats a new line as a boundary, not as a preceding word', () => {
    expect(extractSkillPhrases('Requirements\nServer hardening experience').map((s) => s.toLowerCase())).toContain('server')
  })

  it('applies to the other measured tails', () => {
    const found = extractSkillPhrases('Run campaigns in Google Ads and manage Google Workspace.').map((s) => s.toLowerCase())
    expect(found).not.toContain('ads')
    expect(found).not.toContain('workspace')
  })
})
