import { describe, it, expect } from 'vitest'
import { stripContactDetails, normalise } from '../llm'

describe('stripContactDetails', () => {
  it('removes the contact details a skills reader has no need for', () => {
    const out = stripContactDetails(
      'Priya Iyer\npriya.iyer@gmail.com\n+91 98765 43210\nlinkedin.com/in/priya-iyer\nProduct Manager'
    )
    expect(out).not.toContain('priya.iyer@gmail.com')
    expect(out).not.toContain('98765')
    expect(out).not.toContain('priya-iyer')
    // Everything the model actually needs survives.
    expect(out).toContain('Product Manager')
    expect(out).toContain('Priya Iyer')
  })
})

describe('normalise', () => {
  it('rejects anything that is not an object', () => {
    expect(normalise(null)).toBeNull()
    expect(normalise('nope')).toBeNull()
  })

  it('keeps clean fields', () => {
    const r = normalise({
      currentTitle: 'Product Manager', employer: 'Paytm', yearsExperience: 3,
      city: 'Bengaluru', domain: 'fintech', skills: ['SQL', 'Roadmapping'],
    })!
    expect(r.currentTitle).toBe('Product Manager')
    expect(r.yearsExperience).toBe(3)
    expect(r.skills).toEqual(['SQL', 'Roadmapping'])
  })

  it('drops an implausible experience figure rather than storing it', () => {
    // A model reporting 60 years has misread something; the field is dropped
    // and the deterministic parser's value stands.
    expect(normalise({ yearsExperience: 60, skills: [] })!.yearsExperience).toBeUndefined()
    expect(normalise({ yearsExperience: -2, skills: [] })!.yearsExperience).toBeUndefined()
  })

  it('deduplicates, trims and caps the skills list', () => {
    const r = normalise({ skills: ['SQL', ' SQL ', 'x', 'a'.repeat(50), 'Figma', 42] })!
    expect(r.skills).toContain('SQL')
    expect(r.skills).toContain('Figma')
    expect(r.skills.filter((s) => s === 'SQL')).toHaveLength(1)
    expect(r.skills).not.toContain('x')                 // too short
    expect(r.skills.some((s) => s.length > 40)).toBe(false)
    expect(r.skills.every((s) => typeof s === 'string')).toBe(true)
  })

  it('survives a response missing everything but skills', () => {
    const r = normalise({ skills: [] })!
    expect(r.skills).toEqual([])
    expect(r.currentTitle).toBeUndefined()
  })
})
