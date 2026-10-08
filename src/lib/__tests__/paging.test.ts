import { describe, it, expect } from 'vitest'
import { chunk, mapLimit, pageAll, pageAllParallel, PAGE } from '../paging'

describe('chunk', () => {
  it('splits into fixed sizes and keeps the remainder', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 3)).toEqual([])
  })
})

describe('pageAll', () => {
  const source = (n: number) => Array.from({ length: n }, (_, i) => i)
  const pager = (rows: number[]) => async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null })

  it('reads past PostgREST\'s 1,000-row ceiling and stops on the short page', async () => {
    expect(await pageAll(pager(source(2500)))).toHaveLength(2500)
  })
  it('does not loop forever on an exact multiple of the page size', async () => {
    expect(await pageAll(pager(source(PAGE * 2)))).toHaveLength(PAGE * 2)
  })
  it('throws the database error instead of returning a silent partial list', async () => {
    await expect(pageAll(async () => ({ data: null, error: new Error('boom') }))).rejects.toThrow('boom')
  })
})

describe('pageAllParallel', () => {
  const rows = (n: number) => Array.from({ length: n }, (_, i) => i)
  const source = (all: number[], calls: number[][]) => async (from: number, to: number, withCount: boolean) => {
    calls.push([from, to, withCount ? 1 : 0])
    return { data: all.slice(from, to + 1), error: null, count: withCount ? all.length : undefined }
  }
  it('asks for the total once, then the remaining pages together', async () => {
    const calls: number[][] = []
    const out = await pageAllParallel(source(rows(3500), calls))
    expect(out).toEqual(rows(3500))
    expect(calls).toEqual([[0, 999, 1], [1000, 1999, 0], [2000, 2999, 0], [3000, 3999, 0]])
  })
  it('stops after one request when everything fits in the first page', async () => {
    const calls: number[][] = []
    expect(await pageAllParallel(source(rows(400), calls))).toHaveLength(400)
    expect(calls).toHaveLength(1)
  })
  it('throws when a later page fails instead of returning a silent partial list', async () => {
    const bad = async (from: number, _to: number, withCount: boolean) =>
      from >= 2000 ? { data: null, error: new Error('late page failed') } : { data: rows(PAGE), error: null, count: withCount ? 3000 : undefined }
    await expect(pageAllParallel(bad)).rejects.toThrow('late page failed')
  })
})

describe('mapLimit', () => {
  it('never runs more than the limit at once and returns results in input order', async () => {
    let inFlight = 0, peak = 0
    const out = await mapLimit([5, 1, 4, 2, 3, 6, 7], 3, async (n) => {
      inFlight++; peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, n))
      inFlight--
      return n * 10
    })
    expect(out).toEqual([50, 10, 40, 20, 30, 60, 70])
    expect(peak).toBeLessThanOrEqual(3)
  })
  it('handles an empty list', async () => {
    expect(await mapLimit([], 4, async (x: number) => x)).toEqual([])
  })
})
