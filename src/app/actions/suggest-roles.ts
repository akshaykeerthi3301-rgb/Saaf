'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({ query: z.string().max(80) })

export type RoleSuggestion = { phrase: string; count: number }

/** Words that carry no role meaning on their own. */
const STOP = new Set([
  'and', 'or', 'the', 'a', 'an', 'of', 'for', 'to', 'in', 'at', 'on', 'with',
  'i', 'ii', 'iii', 'iv', 'senior', 'sr', 'junior', 'jr', 'lead', 'new',
])

/** Longest phrase first, so "Product Manager" outranks "Product". */
const MAX_WORDS = 3

/**
 * Suggest role titles that actually exist in the index, with the number of
 * roles each one returns.
 *
 * The blind free-text box was measurably bad: "manager" matched 228 of 650
 * roles (35% of the index) and "Founder's Office" matched none at all, with
 * nothing on screen to tell the candidate either had happened until their
 * shortlist came back useless or empty.
 *
 * Counts come from the SAME query the matcher runs, not an approximation —
 * a suggestion reading "56 roles" produces exactly 56 roles. Showing an
 * estimate here would be the kind of unearned number this product exists to
 * argue against.
 */
export async function suggestRoles(query: string): Promise<RoleSuggestion[]> {
  const parsed = schema.safeParse({ query })
  if (!parsed.success) return []
  const q = parsed.data.query.trim()
  if (q.length < 2) return []

  const supabase = await createClient()

  // Candidate phrases are drawn from titles that contain what was typed, so
  // every suggestion is a real phrase from a real posting.
  const { data: titles, error } = await supabase
    .from('roles')
    .select('title')
    .eq('in_india', true)
    .ilike('title', `%${q}%`)
    .limit(400)
  if (error || !titles?.length) return []

  const needle = q.toLowerCase()
  const freq = new Map<string, number>()

  for (const { title } of titles) {
    // Segment on punctuation before building phrases. A title like "Product
    // Management - Senior Product Manager" is two separate role phrases, and
    // running n-grams straight across the dash inventes ones nobody wrote —
    // "management senior product" appeared as a suggestion before this.
    const segments = title.toLowerCase().split(/[^a-z0-9&+ ]+/)

    for (const segment of segments) {
      const words = segment.split(/\s+/).filter(Boolean)

      for (let n = MAX_WORDS; n >= 1; n--) {
        for (let i = 0; i + n <= words.length; i++) {
          const slice = words.slice(i, i + n)
          if (STOP.has(slice[0]) || STOP.has(slice[slice.length - 1])) continue
          const phrase = slice.join(' ')
          if (!phrase.includes(needle)) continue
          // A phrase has to start and end on a word — "& hr" is not a role.
          if (!/^[a-z0-9].*[a-z0-9]$|^[a-z0-9]$/.test(phrase)) continue
          freq.set(phrase, (freq.get(phrase) ?? 0) + 1)
        }
      }
    }
  }

  const ranked = [...freq.entries()]
    // Prefer phrases that are both common and specific: a two-word phrase
    // seen 40 times beats a one-word phrase seen 60, because the one-word
    // version is what produced the 228-role result in the first place.
    .sort((a, b) => b[1] * (1 + a[0].split(' ').length * 0.35) - a[1] * (1 + b[0].split(' ').length * 0.35))
    .slice(0, 12)

  // Drop a phrase wholly contained in a better-ranked one ("product" under
  // "product manager") so the list offers real alternatives, not prefixes.
  const kept: string[] = []
  for (const [phrase] of ranked) {
    if (kept.some((k) => k.includes(phrase))) continue
    kept.push(phrase)
    if (kept.length === 5) break
  }

  const counts = await Promise.all(
    kept.map(async (phrase) => {
      const { count } = await supabase
        .from('roles')
        .select('id', { count: 'exact', head: true })
        .eq('in_india', true)
        .textSearch('title_tsv', phrase, { type: 'websearch', config: 'english' })
      return { phrase, count: count ?? 0 }
    })
  )

  return counts
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .map(({ phrase, count }) => ({
      phrase: phrase.replace(/\b[a-z]/g, (c) => c.toUpperCase()),
      count,
    }))
}
