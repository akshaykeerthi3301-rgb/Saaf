import { describe, it, expect } from 'vitest'
import { closedNote, trackerStats } from '../tracker-stats'

const row = (status: 'saved' | 'applying' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'closed', extra: Record<string, unknown> = {}) =>
  ({ status, appliedOn: null, ...extra }) as Parameters<typeof trackerStats>[0][number]

describe('trackerStats', () => {
  it('counts only stages that have cards, in pipeline order', () => {
    const s = trackerStats([row('applied'), row('saved'), row('applied'), row('offer')], '2026-10-08')
    expect(s.stages.map((x) => `${x.label} ${x.count}`)).toEqual(['Saved 1', 'Applied 2', 'Offer 1'])
    expect(s.total).toBe(4)
  })

  it('counts applications dated in the last seven days, today included, never the future', () => {
    const s = trackerStats([
      row('applied', { appliedOn: '2026-10-08' }), row('applied', { appliedOn: '2026-10-02' }),
      row('applied', { appliedOn: '2026-10-01' }), row('applied', { appliedOn: '2026-10-20' }), row('applied'),
    ], '2026-10-08')
    expect(s.appliedThisWeek).toBe(2)
  })

  it('credits "Apply for me" only for applications that really got past Applying', () => {
    const s = trackerStats([
      row('applied', { appliedVia: 'apply-for-me' }), row('interviewing', { appliedVia: 'apply-for-me' }),
      row('applying', { appliedVia: 'apply-for-me' }), row('applied', { appliedVia: 'manual' }), row('applied'),
    ], '2026-10-08')
    expect(s.appliedBySaaf).toBe(2)
  })

  it('counts closed postings only while the candidate still has the card open', () => {
    const s = trackerStats([
      row('saved', { roleClosedAt: '2026-10-05T00:00:00Z' }), row('interviewing', { roleClosedAt: '2026-10-05T00:00:00Z' }),
      row('closed', { roleClosedAt: '2026-10-05T00:00:00Z' }), row('rejected', { roleClosedAt: '2026-10-05T00:00:00Z' }), row('saved'),
    ], '2026-10-08')
    expect(s.postingClosed).toBe(2)
  })
})

describe('closedNote', () => {
  it('says nothing for a card that is not closed, archived or rejected cards', () => {
    expect(closedNote({ status: 'saved', roleClosedAt: null })).toBeNull()
    expect(closedNote({ status: 'closed', roleClosedAt: '2026-10-05T00:00:00Z' })).toBeNull()
    expect(closedNote({ status: 'rejected', roleClosedAt: '2026-10-05T00:00:00Z' })).toBeNull()
  })
  it('names the date and does not claim the job is filled', () => {
    const n = closedNote({ status: 'interviewing', roleClosedAt: '2026-10-05T10:00:00Z' })
    expect(n?.label).toBe('Posting closed')
    expect(n?.title).toContain('2026-10-05')
    expect(n?.title).toContain('may still be open elsewhere')
  })
})
