import { describe, it, expect } from 'vitest'
import { classify, missionProgress, missions, proactive, PROMPTS, type Intent } from '../assistant'

describe('what the question is asking', () => {
  it.each<[string, Intent]>([
    ['What is new this week?', 'new'], ['anything posted today', 'new'], ['latest roles', 'new'],
    ['show my best matches', 'best'], ['top roles for me', 'best'], ['which roles should I look at', 'best'],
    ['how many strong matches do I have', 'strong'],
    ['how can I improve my scores', 'improve'], ['why are my scores low', 'improve'], ['what should I fix first', 'improve'],
    ['what needs a follow up', 'followups'], ['anything overdue', 'followups'],
    ['how many applications do I have', 'applied'], ['how many have I applied to', 'applied'],
    ['show remote roles', 'remote'], ['wfh jobs', 'remote'],
    ['which roles state pay', 'pay'], ['anything paying over 20 lakh', 'pay'],
    ['queue my best easy apply roles', 'queue'], ['apply for me to the top five', 'queue'], ['line up some roles', 'queue'],
    ['how am I doing against my weekly goal', 'progress'], ['how is my week going', 'progress'], ['my weekly target', 'progress'],
  ])('%s → %s', (q, want) => { expect(classify(q)).toBe(want) })

  it('says it does not understand rather than guess', () => {
    for (const q of ['', ' ', 'x', 'tell me a joke', 'what is the weather in Pune', 'asdf qwer', 'write my cover letter']) expect(classify(q)).toBe('help')
  })

  it('every prompt Jobinko offers is a question it can place', () => {
    for (const p of PROMPTS) expect(classify(p.q)).not.toBe('help')
  })

  it('survives hostile input', () => {
    for (const q of ['<script>alert(1)</script>', 'a'.repeat(50_000), '\u0000', '😀😀😀']) expect(() => classify(q)).not.toThrow()
  })
})

describe('missions', () => {
  const base = { hasSavedResume: false, profileHealth: 55, tracked: 0, applied: 0, connections: 0 as number | null, alertsSet: false as boolean | null }
  it('reads each mission off real state', () => {
    const m = missions({ ...base, hasSavedResume: true, profileHealth: 80, tracked: 2, applied: 1, connections: 40, alertsSet: true })
    expect(m.every((x) => x.done)).toBe(true)
    expect(missionProgress(m)).toEqual({ done: 6, total: 6 })
    expect(missionProgress(missions(base))).toEqual({ done: 0, total: 6 })
  })
  it('leaves out a mission whose state cannot be known yet, rather than showing it failed', () => {
    const m = missions({ ...base, connections: null, alertsSet: null })
    expect(m.map((x) => x.key)).toEqual(['resume', 'profile', 'track', 'apply'])
  })
  it('profile is done at exactly 80', () => {
    expect(missions({ ...base, profileHealth: 79 })[1].done).toBe(false)
    expect(missions({ ...base, profileHealth: 80 })[1].done).toBe(true)
  })
})

describe('proactive notes', () => {
  it('says nothing when there is nothing — never padded', () => {
    expect(proactive({ newStrong: 0, followupsDue: 0, closedTracked: 0 })).toEqual([])
    expect(proactive({ newStrong: 0, followupsDue: 0, closedTracked: null })).toEqual([])
  })
  it('names the count, with the right plural, and where to go', () => {
    const n = proactive({ newStrong: 1, followupsDue: 3, closedTracked: 2 })
    expect(n.map((x) => x.text)).toEqual([
      '1 new role this week scoring 75 or above.',
      '3 applications are due a follow-up.',
      '2 roles you track have come down from the employer’s board.',
    ])
    expect(n.map((x) => x.href)).toEqual(['/today?tab=new', '/applications', '/applications'])
  })
})
