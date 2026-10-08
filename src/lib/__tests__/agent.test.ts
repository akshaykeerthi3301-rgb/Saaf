import { describe, it, expect } from 'vitest'
import { DEFAULT_AGENT, proposeQueue, sanitizeAgentSettings, weekStart, weeklyLine, type AgentSettings, type Candidate } from '../agent'

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const cand = (n: number, over: Partial<Candidate> = {}): Candidate => ({ roleId: U(n), title: `Role ${n}`, company: 'Acme', score: 80, applyUrl: 'https://boards.greenhouse.io/x/jobs/1', easy: true, tracked: false, hidden: false, ...over })
const settings = (over: Partial<AgentSettings> = {}): AgentSettings => ({ ...DEFAULT_AGENT, ...over })
const NOW = new Date('2026-10-08T06:00:00Z') // Thursday

describe('agent settings', () => {
  it('start from the default and keep only what is recognised', () => {
    expect(sanitizeAgentSettings(undefined)).toEqual(DEFAULT_AGENT)
    expect(sanitizeAgentSettings({ mode: 'auto-everything', weeklyTarget: 9999, minScore: 12, queued: 'x' })).toEqual(DEFAULT_AGENT)
    expect(sanitizeAgentSettings({ mode: 'queue', weeklyTarget: 10, minScore: 80, queued: [{ id: U(1), at: '2026-10-07T00:00:00Z' }, { id: 'nope', at: 'x' }, null] }))
      .toEqual({ mode: 'queue', weeklyTarget: 10, minScore: 80, queued: [{ id: U(1), at: '2026-10-07T00:00:00Z' }] })
  })
  it('the safe mode is the default: Saaf suggests, it does not queue on its own', () => {
    expect(DEFAULT_AGENT.mode).toBe('suggest')
  })
})

describe('proposing a queue', () => {
  it('only Easy-apply, untracked, unhidden, never-queued roles at or above the candidate’s own minimum — best first', () => {
    const out = proposeQueue([cand(1, { score: 78 }), cand(2, { score: 92 }), cand(3, { easy: false }), cand(4, { tracked: true }), cand(5, { hidden: true }), cand(6, { score: 60 }), cand(7, { applyUrl: 'javascript:alert(1)' })], settings({ weeklyTarget: 10 }), { appliedThisWeek: 0, now: NOW })
    expect(out.map((r) => r.roleId)).toEqual([U(2), U(1)])
  })
  it('never proposes a role Saaf already queued', () => {
    const s = settings({ weeklyTarget: 10, queued: [{ id: U(2), at: '2026-09-01T00:00:00Z' }] })
    expect(proposeQueue([cand(2), cand(1)], s, { appliedThisWeek: 0, now: NOW }).map((r) => r.roleId)).toEqual([U(1)])
  })
  it('stops at the weekly target, counting what was applied and what was queued since Monday', () => {
    const s = settings({ weeklyTarget: 5, queued: [{ id: U(90), at: '2026-10-06T10:00:00Z' }, { id: U(91), at: '2026-09-20T10:00:00Z' }] })
    const many = Array.from({ length: 9 }, (_, i) => cand(i + 1, { score: 99 - i }))
    // target 5 − applied 2 − queued this week 1 (the September one is last week's) = room for 2.
    expect(proposeQueue(many, s, { appliedThisWeek: 2, now: NOW })).toHaveLength(2)
    expect(proposeQueue(many, s, { appliedThisWeek: 4, now: NOW })).toHaveLength(0)
  })
  it('off proposes nothing; a target of zero means "no cap" but still at most five at a time', () => {
    const many = Array.from({ length: 9 }, (_, i) => cand(i + 1))
    expect(proposeQueue(many, settings({ mode: 'off' }), { appliedThisWeek: 0, now: NOW })).toEqual([])
    expect(proposeQueue(many, settings({ weeklyTarget: 0 }), { appliedThisWeek: 0, now: NOW })).toHaveLength(5)
  })
})

describe('the week and the meter', () => {
  it('a week starts Monday 00:00 India time', () => {
    expect(weekStart(NOW).toISOString()).toBe('2026-10-04T18:30:00.000Z') // Mon 5 Oct 00:00 IST
    expect(weekStart(new Date('2026-10-04T18:29:00Z')).toISOString()).toBe('2026-09-27T18:30:00.000Z') // still Sunday in India
  })
  it('says it plainly', () => {
    expect(weeklyLine(3, 10)).toBe('3 of 10 this week — 7 to go.')
    expect(weeklyLine(10, 10)).toBe('10 of 10 this week — target met.')
    expect(weeklyLine(1, 0)).toContain('not set a weekly target')
  })
})
