import { describe, it, expect } from 'vitest'
import { runWeeklyWith, type Rpc } from '../weekly'

/** A fake database: `dupes` duplicates and `stale` old postings, deleted `batch` at a time. */
function fake(open: number, dupes: number, stale: number) {
  const calls: string[] = []
  const state = { open, dupes, stale }
  const rpc: Rpc = async (name, args = {}) => {
    calls.push(name)
    if (name === 'weekly_new_listings') return { open_now: state.open, new_roles: 7, new_by_provider: { workday: 7 }, new_top_employers: [] }
    if (name === 'weekly_dedupe_batch') { const n = Math.min(state.dupes, Number(args.batch)); state.dupes -= n; state.open -= n; return n }
    if (name === 'weekly_evict_batch') { const n = Math.min(state.stale, Number(args.batch)); state.stale -= n; state.open -= n; return n }
    if (name === 'weekly_counts') return { open_now: state.open, old_remaining: state.stale }
    throw new Error('unexpected ' + name)
  }
  return { rpc, calls, state }
}

describe('the weekly housekeeping runner', () => {
  it('lists first, removes duplicates, then deletes the oldest in batches', async () => {
    const f = fake(10_000, 2_500, 1_500)
    const r = await runWeeklyWith(f.rpc, { batch: 1000, maxEvictFraction: 0.25 })
    expect(f.calls[0]).toBe('weekly_new_listings')
    expect(f.calls.indexOf('weekly_dedupe_batch')).toBeLessThan(f.calls.indexOf('weekly_evict_batch'))
    expect(r.duplicates_deleted).toBe(2_500)
    expect(r.old_deleted).toBe(1_500) // all the stale ones, under the cap of 1,875
    expect(r.open_before).toBe(10_000)
    expect(r.open_after).toBe(6_000)
  })

  it('never deletes more than the cap in one run, whatever is stale', async () => {
    const f = fake(10_000, 0, 9_000)
    const r = await runWeeklyWith(f.rpc, { batch: 1000, maxEvictFraction: 0.25 })
    expect(r.old_deleted).toBe(2_500)
    expect(r.old_remaining).toBe(6_500)
  })

  it('stops cleanly when the time budget runs out, and says so', async () => {
    const f = fake(10_000, 0, 9_000)
    let t = 0
    const r = await runWeeklyWith(f.rpc, { batch: 1000, budgetMs: 2, now: () => t++ })
    expect(r.stopped_for_time).toBe(true)
    expect(Number(r.old_deleted)).toBeLessThan(2_500)
  })
})
