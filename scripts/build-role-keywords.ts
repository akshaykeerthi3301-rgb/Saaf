/**
 * Mine the terms real postings use, per role, into a static file.
 *
 * ⚠️ THE ATS CHECKER MUST NOT TOUCH THE DATABASE — src/lib/ats-check.ts declares
 * "NO DATABASE, NO STORAGE" and a test enforces it. So the role-keyword data is
 * built HERE, offline, against the live index, and committed as JSON that the
 * checker imports as a plain constant.
 *
 * ⚠️ MEASURED, NOT INVENTED, AND THAT IS THE WHOLE POINT. A hand-written list of
 * "keywords for a Product Manager" is exactly the confident, unverifiable advice
 * this product exists to argue against — we would be telling a candidate their
 * résumé is missing a word because somebody felt it should be there. Every term
 * below appears in postings we actually hold, and the file records how many, so
 * a finding can say "named in 41 of the 68 Product Manager postings we index"
 * rather than "experts recommend".
 *
 * Re-run after a large ingest: npx tsx --env-file=.env.local scripts/build-role-keywords.ts
 */
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DOMAINS } from '../src/lib/taxonomy/roles'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

/** Words that appear everywhere and mean nothing for a résumé check. */
const STOP = new Set([
  'the','and','for','with','you','our','are','will','has','have','that','this','from','your','who',
  'all','any','can','not','but','its','their','they','them','was','were','been','being','more','most',
  'work','working','team','teams','role','job','position','company','experience','years','year','new',
  'strong','good','excellent','ability','able','skills','skill','knowledge','understanding','including',
  'across','within','into','out','about','over','under','also','well','other','others','such','both',
  'india','indian','bengaluru','bangalore','mumbai','delhi','hyderabad','pune','chennai','remote',
  'candidate','candidates','applicants','opportunity','join','looking','seeking','required','requirements',
  'responsibilities','preferred','plus','etc','per','via','use','used','using','ensure','ensuring',
  'support','supporting','help','helping','drive','driving','build','building','manage','managing',
  'develop','developing','deliver','delivering','lead','leading','create','creating','provide','providing',
  'business','product','products','customer','customers','client','clients','partner','partners','stakeholders',
  'high','level','end','full','time','part','day','days','week','month','months','one','two','three',
  'equal','opportunity','employer','diversity','inclusive','benefits','salary','apply','application',
  // Function words and vague qualifiers. They survive a frequency filter because
  // they genuinely are frequent — they are simply not vocabulary. A résumé
  // "missing" the word "through" is not a finding.
  'through','what','based','key','related','needs','activities','various','overall','effective',
  'effectively','relevant','appropriate','timely','detailed','multiple','several','ensure','ensures',
  'while','where','when','which','would','should','could','may','must','make','makes','making','take',
  'takes','get','gets','set','sets','put','give','gives','need','needed','want','wants','like','many',
  'much','very','just','only','same','different','best','better','great','right','left','next','last',
  'first','second','including','include','includes','included','ability','abilities','part','parts',
])

const words = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9+#. ]+/g, ' ').split(/\s+/)
    .filter((w) => w.length >= 3 && w.length <= 24 && !STOP.has(w) && !/^\d+$/.test(w))

async function main() {
  const out: Record<string, { terms: string[]; postings: number }> = {}
  const allRoles = DOMAINS.flatMap((d) => d.roles)
  console.log(`mining ${allRoles.length} roles…\n`)

  for (const role of allRoles) {
    const { data } = await db
      .from('roles')
      .select('description')
      .eq('in_india', true)
      .textSearch('title_tsv', role, { type: 'websearch', config: 'english' })
      .limit(200)

    const rows = (data ?? []).filter((r) => (r.description ?? '').length > 200)
    if (rows.length < 5) { console.log(`  ${role.padEnd(34)} ${rows.length} postings — skipped`); continue }

    // Document frequency, not raw count: a term repeated forty times in one
    // posting is that employer's habit, not the role's vocabulary.
    const df = new Map<string, number>()
    for (const r of rows) {
      for (const w of new Set(words(r.description ?? ''))) df.set(w, (df.get(w) ?? 0) + 1)
    }
    const terms = [...df.entries()]
      // Named in at least a third of postings for the role — common enough that
      // its absence is worth mentioning, rare enough to still be informative.
      .filter(([, n]) => n / rows.length >= 0.34)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([w]) => w)

    if (terms.length >= 4) {
      out[role] = { terms, postings: rows.length }
      console.log(`  ${role.padEnd(34)} ${String(rows.length).padStart(3)} postings → ${terms.slice(0, 6).join(', ')}`)
    } else {
      console.log(`  ${role.padEnd(34)} ${rows.length} postings — too few shared terms`)
    }
  }

  /**
   * Second pass: drop terms that are common to MOST roles.
   *
   * Document frequency within a role finds what that role's postings say; it
   * cannot tell that "key", "through" and "based" are said by every posting of
   * every kind. A term carried by more than 60% of role profiles is describing
   * job adverts in general, and telling a candidate their résumé is missing it
   * would be noise wearing the costume of a finding.
   *
   * Done by measurement rather than by extending the stop-list by hand, so it
   * keeps working as the index grows and nobody has to remember to curate it.
   * The stop-list above handles a different case: function words that ARE
   * frequent and simply are not vocabulary.
   */
  const roleCount = Object.keys(out).length
  const globalDf = new Map<string, number>()
  for (const { terms } of Object.values(out)) {
    for (const t of terms) globalDf.set(t, (globalDf.get(t) ?? 0) + 1)
  }
  const tooCommon = new Set(
    [...globalDf.entries()].filter(([, n]) => n / roleCount > 0.45).map(([t]) => t),
  )
  console.log(`\n  dropping ${tooCommon.size} terms common to >45% of roles: ${[...tooCommon].join(', ')}`)
  for (const key of Object.keys(out)) {
    out[key].terms = out[key].terms.filter((t) => !tooCommon.has(t))
    if (out[key].terms.length < 4) delete out[key]
  }

  const path = join(__dirname, '..', 'src', 'lib', 'taxonomy', 'role-keywords.json')
  writeFileSync(path, JSON.stringify(out, null, 2) + '\n')
  console.log(`\n  wrote ${Object.keys(out).length} roles → ${path}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
