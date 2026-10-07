import { describe, it, expect } from 'vitest'
import { repostChip } from '../repost'

const rec = (firstPostedAt: string, count = 1) => ({ firstPostedAt, count })

describe('repostChip', () => {
  it('shows nothing where nothing was recorded', () => {
    expect(repostChip('2026-09-20T00:00:00Z', null)).toBeNull()
    expect(repostChip('2026-09-20T00:00:00Z', undefined)).toBeNull()
    expect(repostChip('2026-09-20T00:00:00Z', rec('2026-08-01T00:00:00Z', 0))).toBeNull()
  })

  it('shows nothing for a second copy listed the same week — that can be a second vacancy', () => {
    expect(repostChip('2026-09-20T00:00:00Z', rec('2026-09-16T00:00:00Z'))).toBeNull()
  })

  it('shows the chip once the earlier copy is a week or more older, and says how much', () => {
    const c = repostChip('2026-09-20T00:00:00Z', rec('2026-08-01T00:00:00Z', 2))
    expect(c?.label).toBe('Reposted')
    expect(c?.title).toContain('2 times before')
    expect(c?.title).toContain('50 days')
    expect(c?.title).toContain('2026-08-01')
  })

  it('shows nothing when this copy has no date of its own — the gap cannot be stated', () => {
    expect(repostChip(null, rec('2026-08-01T00:00:00Z'))).toBeNull()
  })

  it('does not show a chip for a record dated AFTER the posting', () => {
    expect(repostChip('2026-08-01T00:00:00Z', rec('2026-09-20T00:00:00Z'))).toBeNull()
  })
})
