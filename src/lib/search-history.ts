import { isEmptyView, viewFromStored, viewToQuery, type FeedView } from '@/lib/feed-query'

/**
 * Search history and "how Jobinko read it" (F-205, F-206). Pure: the shape of a
 * stored search, the words that describe a view, and whether two views are the
 * same one — tested apart from the box that uses them.
 */
export type HistoryEntry = { id: string; text: string; view: FeedView; rating: 'up' | 'down' | null; at: string }

export const MAX_HISTORY = 20

/** Rows from the database, rebuilt through the view whitelist; anything unreadable is dropped. */
export function sanitizeHistory(rows: unknown): HistoryEntry[] {
  if (!Array.isArray(rows)) return []
  const out: HistoryEntry[] = []
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue
    const o = r as { id?: unknown; text?: unknown; view?: unknown; rating?: unknown; created_at?: unknown }
    const view = viewFromStored(o.view)
    if (typeof o.id !== 'string' || typeof o.text !== 'string' || !o.text.trim() || !view || typeof o.created_at !== 'string') continue
    out.push({
      id: o.id, text: o.text.trim().slice(0, 300), view,
      rating: o.rating === 'up' || o.rating === 'down' ? o.rating : null, at: o.created_at,
    })
    if (out.length === MAX_HISTORY) break
  }
  return out
}

const POSTED = { '1': 'Last 24 hours', '3': 'Last 3 days', '7': 'Last week', '30': 'Last month' } as const
const LEVEL = { entry: 'Entry level', mid: 'Mid level', senior: 'Senior level' } as const
const TYPE: Record<string, string> = { fulltime: 'Full-time', intern: 'Internship', contract: 'Contract', parttime: 'Part-time' }
const MODE: Record<string, string> = { remote: 'Remote (stated)', hybrid: 'Hybrid', onsite: 'On-site' }
const ROLE_TYPE = { ic: 'Individual contributor', manager: 'People manager' } as const
const or = (list: string, names: Record<string, string>) => list.split(',').map((x) => names[x] ?? x).join(' or ')

/** The filters a view applies, in words — what "Read as:" shows. Empty when it applies none. */
export function describeView(v: FeedView): string[] {
  const out: string[] = []
  if (v.q) out.push(`“${v.q}”`)
  if (v.city) out.push(`In ${v.city.split(',').join(' or ')}`)
  if (v.remote) out.push('Remote')
  if (v.min80) out.push('Match 80+')
  if (v.fresh) out.push('Last 24 hours')
  if (v.posted) out.push(POSTED[v.posted])
  if (v.level) out.push(LEVEL[v.level])
  if (v.type) out.push(or(v.type, TYPE))
  if (v.mode) out.push(or(v.mode, MODE))
  if (v.roleType) out.push(ROLE_TYPE[v.roleType])
  if (v.only) out.push(`Only ${v.only.split(',').join(', ')}`)
  if (v.easy) out.push('Easy apply')
  if (v.pay) out.push(`Pay ≥ ₹${v.pay} L`)
  if (v.skip) out.push(`Not ${v.skip.split(',').join(', ')}`)
  if (v.sort === 'new') out.push('Newest first')
  return out
}

/** Same filters, whatever the key order or empty keys. */
export const sameView = (a: FeedView, b: FeedView) => viewToQuery(a) === viewToQuery(b)

/** Worth keeping: the sentence was read into at least one filter. A search that read as nothing is not history. */
export const worthRecording = (text: string, view: FeedView) => text.trim().length > 0 && !isEmptyView(view)

/** How long the "Read as" strip stays after a search. */
export const ANSWER_WINDOW_MS = 60 * 60 * 1000

/** The entry the page should show a "Read as" strip for: the newest, if it is the view on screen and recent. */
export function currentAnswer(history: HistoryEntry[], current: FeedView, now: number = Date.now()): HistoryEntry | null {
  const top = history[0]
  if (!top || !sameView(top.view, current)) return null
  const t = Date.parse(top.at)
  return Number.isFinite(t) && now - t < ANSWER_WINDOW_MS && now - t >= -60_000 ? top : null
}
