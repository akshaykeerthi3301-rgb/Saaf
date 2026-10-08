/**
 * The numbers behind the data blog (F-1206, TASK-203). Run it, read what it prints, and put those numbers
 * — with today's date — in src/lib/blog.ts. A post quotes a measurement taken on a stated day; it is
 * never a live figure, so a reader (and the founder) can re-run this and see the same method.
 *
 *   npx tsx --env-file=.env.local scripts/blog-measure.ts
 */
import { createClient } from '@supabase/supabase-js'
import keywords from '../src/lib/taxonomy/role-keywords.json'
import { findStatedPay } from '../src/lib/stated-pay'
import { CITIES, resolveCity } from '../src/lib/taxonomy/locations'
import { cityPatterns } from '../src/lib/seo-pages'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const today = new Date().toISOString().slice(0, 10)

async function main() {
  const total = (await db.from('roles').select('id', { count: 'exact', head: true }).eq('in_india', true)).count ?? 0
  console.log(`MEASURED ${today} — open roles in India: ${total}`)

  // 1. How many state a salary? A random-ish sample: pages spread across the table by id order.
  let sampled = 0, stated = 0
  for (let from = 0; from < total && sampled < 4000; from += Math.floor(total / 8)) {
    const { data } = await db.from('roles').select('description').eq('in_india', true).order('id').range(from, from + 499)
    for (const r of (data ?? []) as { description: string | null }[]) { sampled++; if (r.description && findStatedPay(r.description)) stated++ }
  }
  console.log(`\nSALARY: ${stated} of ${sampled} sampled descriptions state pay = ${((100 * stated) / sampled).toFixed(1)}% (text read; structured provider fields not counted)`)

  // 2. Where the roles are.
  const remote = (await db.from('roles').select('id', { count: 'exact', head: true }).eq('in_india', true).or('location_raw.ilike.%remote%,location_raw.ilike.%anywhere%,location_raw.ilike.%work from home%')).count ?? 0
  console.log(`\nREMOTE (location says remote): ${remote} = ${((100 * remote) / total).toFixed(1)}%`)
  const counts: [string, number][] = []
  for (const c of CITIES.slice(0, 40)) {
    const n = (await db.from('roles').select('id', { count: 'exact', head: true }).eq('in_india', true).or(cityPatterns(c).map((p) => `city.ilike.%${p}%`).join(','))).count ?? 0
    counts.push([c.name, n])
  }
  counts.sort((a, b) => b[1] - a[1])
  console.log('TOP CITIES:', counts.slice(0, 10).map(([c, n]) => `${c} ${n} (${((100 * n) / total).toFixed(1)}%)`).join(' · '))
  console.log('top 3 share:', ((100 * counts.slice(0, 3).reduce((a, [, n]) => a + n, 0)) / total).toFixed(1) + '%')
  void resolveCity

  // 3. Years asked, by role (from role-keywords.json, medians over postings that state a bar).
  const rows = Object.entries(keywords as unknown as Record<string, { medianYears?: number; postings: number }>).filter(([, v]) => v.medianYears !== undefined).map(([r, v]) => [r, v.medianYears!, v.postings] as const).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  console.log(`\nYEARS: ${rows.length} roles have a median`)
  console.log('highest:', rows.slice(0, 6).map(([r, y, n]) => `${r} ${y}y (n=${n})`).join(' · '))
  console.log('lowest:', rows.slice(-6).map(([r, y, n]) => `${r} ${y}y (n=${n})`).join(' · '))
  const ys = rows.map((r) => r[1]).sort((a, b) => a - b)
  console.log('median of medians:', ys[Math.floor(ys.length / 2)])
}
void main()
