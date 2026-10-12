// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from 'vitest'
import '../extension/autofill.js'

/**
 * Drop-downs word an answer differently from the profile ("Bengaluru" vs "Bengaluru, Karnataka, India"). The answer must be matched
 * by closeness: the best option wins, a near-miss still matches, and only something unrelated is left for the person.
 */
type Opt = { text: string; value: string }
let A: { pickOption: (k: string, raw: string, o: Opt[], hints?: Record<string, string>) => Opt | null }
beforeAll(() => { A = (globalThis as unknown as { SaafAutofill: typeof A }).SaafAutofill })
const opts = (...t: string[]): Opt[] => t.map((text, i) => ({ text, value: String(i) }))
const pick = (raw: string, o: Opt[], hints?: Record<string, string>, key = 'city') => A.pickOption(key, raw, o, hints)?.text ?? null

describe('city and other places', () => {
  it('"Bengaluru" finds "Bengaluru, Karnataka, India" — the case that got stuck', () => {
    expect(pick('Bengaluru', opts('Bengaluru, Karnataka, India'))).toBe('Bengaluru, Karnataka, India')
  })
  it('chooses the right one of several that all contain the word', () => {
    expect(pick('Bengaluru', opts('Bengaluru Rural, Karnataka, India', 'Bengaluru, Karnataka, India', 'Bengal, West Bengal, India'))).toBe('Bengaluru, Karnataka, India')
  })
  it('uses the person\'s own state / country to choose between places of the same name', () => {
    const list = opts('Bengaluru, Texas, United States', 'Bengaluru, Karnataka, India')
    expect(pick('Bengaluru', list, { state: 'Karnataka', country: 'India' })).toBe('Bengaluru, Karnataka, India')
  })
  it('knows a place by its other names', () => {
    expect(pick('Bangalore', opts('Bengaluru, Karnataka, India'))).toBe('Bengaluru, Karnataka, India')
    expect(pick('Bombay', opts('Delhi', 'Mumbai, Maharashtra, India'))).toBe('Mumbai, Maharashtra, India')
    expect(pick('Gurgaon', opts('Gurugram, Haryana, India'))).toBe('Gurugram, Haryana, India')
  })
  it('forgives a spelling slip, and a longer answer than the option', () => {
    expect(pick('Bengalore', opts('Bengaluru, Karnataka, India'))).toBe('Bengaluru, Karnataka, India')
    expect(pick('Bengaluru, Karnataka, India', opts('Bengaluru'))).toBe('Bengaluru')
  })
  it('works through accents and punctuation', () => {
    expect(pick('Pondicherry', opts('Puducherry, Puducherry, India', 'Pondicherry, India'))).toBe('Pondicherry, India')
    expect(pick('new delhi', opts('New Delhi, Delhi, India'))).toBe('New Delhi, Delhi, India')
  })
  it('leaves it for the person when nothing is close — never a wrong city', () => {
    expect(pick('Bengaluru', opts('Delhi, India', 'Chennai, Tamil Nadu, India'))).toBeNull()
    expect(pick('Pune', opts('Punjab, India', 'Puri, Odisha, India'))).toBeNull()
  })
})

describe('other dropdowns', () => {
  it('country and state take the closest', () => {
    expect(pick('India', opts('Indonesia', 'India (+91)', 'Iceland'), undefined, 'country')).toBe('India (+91)')
    expect(pick('Karnataka', opts('Kerala', 'Karnataka'), undefined, 'state')).toBe('Karnataka')
  })
  it('an employer name inside a longer option still matches; an unrelated one does not', () => {
    expect(pick('ICICI Bank', opts('HDFC Bank Ltd', 'ICICI Bank Limited'), undefined, 'currentEmployer')).toBe('ICICI Bank Limited')
    expect(pick('ICICI Bank', opts('HDFC Bank Ltd', 'Axis Bank'), undefined, 'currentEmployer')).toBeNull()
  })
  it('yes/no and numeric answers keep their strict rules', () => {
    expect(A.pickOption('needsSponsorship', 'no', opts('Yes', 'No'))?.text).toBe('No')
    expect(A.pickOption('yearsExperience', '4', opts('0-2 years', '3-5 years', '6+ years'))?.text).toBe('3-5 years')
  })
})
