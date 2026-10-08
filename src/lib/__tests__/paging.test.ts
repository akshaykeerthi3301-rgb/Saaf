import { describe, it, expect } from 'vitest'
import { chunk, pageAll, PAGE } from '../paging'

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
