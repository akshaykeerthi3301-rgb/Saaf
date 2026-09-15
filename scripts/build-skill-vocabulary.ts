/**
 * Mine a SKILL vocabulary out of the index. Run:
 *   npx tsx --env-file=.env.local scripts/build-skill-vocabulary.ts
 *
 * ⚠️ WHY THIS EXISTS. src/lib/interview-prep.ts had no vocabulary and guessed
 * from shape: a capital letter meant "skill". Run against 60 real postings it
 * asked candidates "How much have you worked with Poland?" in 78% of its
 * questions — because Poland, CRED, Coupang Eats and Determination all carry a
 * capital. The module was reverted on 2026-09-15 (Stage U) pending this file.
 *
 * ⚠️ THE SIGNAL IS DISPERSION ACROSS EMPLOYERS, NOT FREQUENCY. That is the whole
 * idea and it is what a frequency list cannot do. "Coupang Eats" appears many
 * times — all of them in Coupang's own postings. "Docker" appears across
 * hundreds of unrelated employers. So a term earns its place by the number of
 * DISTINCT BOARDS naming it, never by how often it is said. A company name
 * cannot pass that test no matter how much it is repeated, and neither can a
 * team name, a product name or an internal grade.
 *
 * Three exclusions, all reusing data the repo already holds rather than a new
 * hand-written list:
 *   - places      src/lib/taxonomy/locations.ts (CITIES, INDIAN_STATES)
 *   - employers   registry/boards.json + roles.company_name
 *   - filler      the soft-trait and boilerplate stoplist below
 *
 * Measured, not invented — the same rule scripts/build-role-keywords.ts states.
 * Every term records how many boards and postings name it, so a finding can say
 * "named by 84 employers we index" instead of "experts recommend".
 */
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { CITIES, INDIAN_STATES } from '../src/lib/taxonomy/locations'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

/** A term must be named by at least this many DISTINCT employers to count. */
const MIN_BOARDS = 12
/**
 * A term that is also an employer name needs this many distinct boards to be
 * treated as a technology rather than a company. Measured, not guessed — run
 * with --audit-employers to print the ranked list this was read off.
 */
const EMPLOYER_OVERRIDE_BOARDS = 40
/** Two-letter terms must clear this instead of MIN_BOARDS. See the filter. */
const SHORT_TERM_BOARDS = 150
/** Roles to scan. The whole index is ~23k; this caps the read, not the answer. */
const SCAN_LIMIT = Number(process.env.SCAN_LIMIT ?? 14000)

/**
 * Soft traits, grades and boilerplate that survive every structural filter.
 * These are the words a posting uses about a person rather than about a tool.
 */
const NOT_SKILLS = new Set([
  'curious','collaborative','motivated','passionate','driven','consistent','proactive','flexible',
  'adaptable','dynamic','excellent','strong','good','great','ability','determination','individuality',
  'ownership','communication','teamwork','leadership','integrity','empathy','accountability',
  'english','hindi','fluent','native','bachelor','bachelors','master','masters','degree','diploma',
  'mba','btech','btech','mtech','phd','university','college','school','graduate','postgraduate',
  'senior','junior','lead','principal','staff','associate','assistant','manager','director','head',
  'intern','trainee','executive','officer','specialist','analyst','engineer','developer','consultant',
  'monday','tuesday','wednesday','thursday','friday','saturday','sunday',
  'january','february','march','april','may','june','july','august','september','october','november','december',
  'company','team','teams','role','roles','job','jobs','position','department','division','group',
  'client','clients','customer','customers','stakeholder','stakeholders','vendor','partners',
  'experience','years','year','months','minimum','maximum','preferred','required','mandatory',
  'responsibilities','requirements','qualifications','benefits','description','summary','overview',
  'india','indian','asia','apac','emea','global','international','regional','local','onsite','remote','hybrid',
  'llc','ltd','limited','inc','pvt','private','technologies','technology','solutions','services','systems',
  'group','holdings','ventures','labs','studio','studios','works','corp','corporation','gmbh','plc',
  /**
   * ⚠️ FUNCTION WORDS SURVIVE THE CAPITALISATION RATIO, BECAUSE COMPANY NAMES
   * CAPITALISE THEM MID-SENTENCE. "The", "For", "And" and "New" all cleared 0.6
   * on the strength of appearing inside employer names and headings — "The
   * Better India", "New Relic" — and the ratio has no way to tell that from a
   * proper noun. This is the one place a wordlist is the right tool, and it is
   * closed: English has a fixed set of these.
   */
  'the','and','for','with','you','our','are','will','has','have','that','this','from','your','who',
  'all','any','can','not','but','its','their','they','them','was','were','been','being','more','most',
  'into','out','about','over','under','also','well','other','others','such','both','each','every',
  'when','where','what','which','while','after','before','during','between','through','because',
  'act','take','make','made','give','get','got','put','set','let','see','say','said','come','came',
  'new','nice','good','best','better','top','high','low','full','part','next','last','first','second',
  'level','life','people','market','industry','standard','equal','employment','internal','corporate',
  'center','centre','office','offices','review','training','innovation','success','talent','health',
  'medical','digital','enterprise','cross','research','production','maintenance','agent','app','tech',
  /**
   * ⚠️ THE PLACES EXCLUSION ONLY KNEW INDIAN PLACES, AND THE BUG THAT STARTED
   * ALL OF THIS WAS "Poland". src/lib/taxonomy/locations.ts holds CITIES and
   * INDIAN_STATES because it exists to decide whether a ROLE is in India —
   * there was never a reason for it to know about Warsaw. Postings name foreign
   * countries constantly ("collaborate with teams in Poland, Denmark,
   * Germany"), every one of them capitalised mid-sentence across many
   * employers, so they clear both filters cleanly. Closed set, so a list is the
   * right tool.
   */
  /**
   * ⚠️ MEASURED 2026-09-15 (TASK-083), NOT GUESSED. The gap table put the
   * vocabulary on screen as "skills this posting names", and
   * `scripts/verify-gap-table.ts` plus a scan of 391 live descriptions showed
   * these in the top hundred by frequency, every one of them prose or a place
   * fragment rather than a skill:
   *
   *   familiarity  96/391 postings   "Familiarity with Kubernetes"
   *   science      98                 the back half of "Computer Science"
   *   computer     96                 the front half of the same
   *   certified    25                 "Certified Scrum Master"
   *   statement    12                 boilerplate
   *   states       15                 "United States"
   *   san          14                 "San Francisco" — a PLACE fragment, and
   *                                   the exact shape of the Poland defect
   *   workplaces   11 · generative 14 · sr 12
   *
   * They clear both structural filters honestly: a hundred employers write
   * "Familiarity with…" and capitalise it at the head of a bullet. A wordlist
   * is the right tool for the same reason it is right for the function words
   * above — the set is small, closed, and found by measurement.
   *
   * ⚠️ `skills.json` HAS NOT BEEN REBUILT SINCE THIS LINE WAS ADDED, so
   * `src/lib/taxonomy/skills.ts` filters the same words at read time. Rebuilding
   * makes that runtime list a no-op; delete it then, not before.
   */
  'familiarity','science','computer','certified','statement','states','san','workplaces','generative','sr',
  'poland','germany','france','denmark','sweden','norway','finland','netherlands','belgium','austria',
  'switzerland','spain','portugal','italy','greece','ireland','scotland','wales','england','britain',
  'america','americas','canada','mexico','brazil','argentina','chile','colombia','peru',
  'china','japan','korea','singapore','malaysia','indonesia','thailand','vietnam','philippines',
  'australia','zealand','israel','turkey','egypt','nigeria','kenya','africa','europe','european',
  'russia','ukraine','poland','czech','hungary','romania','bulgaria','croatia','serbia',
  'york','london','paris','berlin','tokyo','dubai','sydney','toronto','boston','chicago','austin',
  'seattle','francisco','angeles','diego','denver','atlanta','dallas','houston','miami','phoenix',
  // Grades, titles and miscellany that are neither skills nor places.
  'notice','fortune','chief','directors','designer','architect','vp','svp','avp','evp',
  'ii','iii','iv','vi','vii','viii','ix','xi','xii','li','ltd','llp',
  /**
   * ⚠️ INVESTOR NAMES AND COUNTRY ABBREVIATIONS RIDE IN ON "ABOUT US"
   * BOILERPLATE. Every funded company's posting says "backed by Lightspeed,
   * Sequoia and Accel" and "the largest platform in the U.S.", so these clear
   * employer-dispersion easily — they appear across hundreds of unrelated
   * boards precisely because they are not that board's own name. Found when
   * the extension's missing-keywords list told a candidate their résumé was
   * missing "U.S" and "Lightspeed".
   */
  'u.s','u.k','u.a.e','usa','uae','emea','apj','anz',
  'lightspeed','sequoia','accel','tiger','softbank','sapphire','insight','bessemer',
  'andreessen','benchmark','greylock','matrix','nexus','elevation','blume','kalaari',
  'ventures','partners','capital','holdings','fund','funds','investors','backed',
  /**
   * ⚠️ DOCUMENT FURNITURE. Postings are forms, and the form's own labels are
   * capitalised mid-sentence on almost every board: "Job Title:", "Reports To:",
   * "(4 x bullets max)". They clear dispersion trivially — every employer uses
   * the same template words — and they are not skills. Found by reading the
   * rendered page rather than by the noise measurement, which had been built
   * from the previous run's mistakes and so could only find those again.
   */
  'title','titles','max','min','maximum','location','locations','department','reports','reporting',
  'summary','purpose','scope','objective','objectives','duties','function','functions','band','grade',
  'shift','shifts','type','types','category','status','code','ref','reference','posted','apply',
  'affairs','notice','period','ctc','salary','compensation','benefits','perks','leave','holiday',
  /**
   * ⚠️ THE LAST THREE CLASSES, NAMED FROM AN HONEST SAMPLE. Judged by eye over
   * 60 hash-ordered terms rather than against a regex built from earlier
   * failures — which is how the previous "4.1% noise" figure was produced and
   * why it was too flattering: it could only count mistakes already known.
   *
   * C-suite titles clear dispersion because every posting says "reports to the
   * CTO". Verbs clear it because every posting says "liaise with". Directional
   * and place fragments clear it because "South", "Valley" and "Bay" sit inside
   * office locations on thousands of boards. None is a skill.
   */
  'ceo','cto','coo','cfo','cmo','chro','ciso','cio','cpo','cdo','md','gm','dgm','agm',
  'liaise','collaborate','coordinate','communicate','execute','implement','facilitate','mentor',
  'articulate','influence','negotiate','prioritise','prioritize','strategize','ideate','champion',
  'south','north','east','west','central','valley','bay','park','city','town','district','sector',
  'competencies','competency','accountabilities','accountability','deliverables','capabilities',
  'accountant','recruiter','scientist','technician','operator','supervisor','coordinator',
])

type Row = { board_id: string; description: string | null; company_name: string | null }

/**
 * Candidate terms out of one description, WITH THE POSITION THEY APPEARED IN.
 *
 * ⚠️ SENTENCE-INITIAL CAPITALS ARE THE TRAP, AND THE FIRST BUILD FELL IN IT.
 * A bare /\b[A-Z]\w+/ matches the first word of every sentence, so the first
 * vocabulary this script produced was topped by "we" (1,090 employers), "this"
 * (980), "you" (959) and "as" (793). Dispersion cannot save you there: every
 * employer writes "We are looking for", so a common English word scores higher
 * on employer-spread than Docker does.
 *
 * So two counts per term rather than one:
 *   capMid  capitalised and NOT at the start of a sentence — "experience with
 *           Docker", "using Kubernetes". Real proper-noun skills live here.
 *   lower   the same token appearing all-lowercase anywhere.
 *
 * A technology is nearly always capitalised: capMid dominates. A common word is
 * usually lowercase, and its capitals are almost all sentence-initial, so it
 * fails the ratio no matter how many employers use it. That is a measurement,
 * not a wordlist, which is why it needs no maintenance as the index grows.
 */
type Seen = { capMid: Set<string>; capMidCount: number; lower: number }

function scan(text: string, boardId: string, acc: Map<string, Seen>): void {
  const get = (k: string): Seen => {
    let v = acc.get(k)
    if (!v) { v = { capMid: new Set(), capMidCount: 0, lower: 0 }; acc.set(k, v) }
    return v
  }

  // Walk tokens with their preceding character so sentence position is knowable.
  const re = /([.!?:;\n•\u2022]\s*)?\b([A-Za-z][A-Za-z0-9+#.]{1,19})\b/g
  let m: RegExpExecArray | null
  let first = true
  while ((m = re.exec(text)) !== null) {
    const sentenceStart = Boolean(m[1]) || first
    first = false
    const raw = m[2]
    if (raw.length < 2 || raw.length > 20) continue
    const k = raw.toLowerCase()

    const isAllCaps = /^[A-Z0-9+#.]{2,}$/.test(raw)
    const isCapitalised = /^[A-Z]/.test(raw)

    if (raw === k) {
      get(k).lower++
    } else if (isAllCaps || (isCapitalised && !sentenceStart)) {
      // An acronym counts wherever it sits — "SQL" at the start of a bullet is
      // still SQL, and bullets are where postings put their technologies.
      const v = get(k)
      v.capMid.add(boardId)
      v.capMidCount++
    }
  }
}

async function main(): Promise<void> {
  // The two exclusion sets that come from data rather than from opinion.
  const places = new Set<string>()
  for (const c of CITIES) {
    places.add(c.name.toLowerCase())
    for (const a of c.aliases ?? []) places.add(String(a).toLowerCase())
  }
  for (const st of INDIAN_STATES) places.add(st.toLowerCase())

  const employers = new Set<string>()
  const addEmployer = (name: string | null | undefined) => {
    if (!name) return
    for (const w of name.split(/[\s,.\-()&]+/)) {
      const t = w.trim().toLowerCase()
      if (t.length >= 3) employers.add(t)
    }
  }
  type Board = { company_name?: string }
  for (const b of JSON.parse(readFileSync('registry/boards.json', 'utf8')) as Board[]) addEmployer(b.company_name)

  const acc = new Map<string, Seen>()

  let scanned = 0
  for (let from = 0; from < SCAN_LIMIT; from += 500) {
    const { data, error } = await db
      .from('roles')
      .select('board_id, description, company_name')
      .eq('in_india', true)
      .range(from, from + 499)
    if (error) throw new Error(error.message)
    if (!data?.length) break
    for (const r of data as Row[]) {
      addEmployer(r.company_name)
      if (!r.description) continue
      scanned++
      scan(r.description, r.board_id, acc)
    }
    if (data.length < 500) break
    process.stdout.write('.')
  }
  console.log(`\nscanned ${scanned} descriptions, ${acc.size} candidate terms\n`)

  const kept: { term: string; boards: number; capRatio: number }[] = []
  const rejected = { places: 0, employers: 0, filler: 0, tooNarrow: 0, mostlyLowercase: 0, tooShort: 0 }

  for (const [term, v] of acc) {
    if (places.has(term)) { rejected.places++; continue }
    if (NOT_SKILLS.has(term)) { rejected.filler++; continue }
    if (v.capMid.size < MIN_BOARDS) { rejected.tooNarrow++; continue }
    /**
     * ⚠️ AN EMPLOYER NAME IN OUR REGISTRY IS OFTEN ALSO A TECHNOLOGY, AND THE
     * FIRST BUILD DELETED ALL OF THEM. Docker, Figma, MongoDB, Stripe, Twilio,
     * Databricks and Snowflake are every one of them a board in
     * registry/boards.json AND among the most valuable skill terms there are.
     * A blanket employer exclusion removed exactly the words a candidate most
     * needs to prepare for.
     *
     * Dispersion already separates the two cases, so the exclusion only has to
     * apply where dispersion is weak. "Coupang" is named on its own board and a
     * handful of others; "Docker" is named by employers all over the index. The
     * threshold below is read off the measurement printed by --audit-employers.
     */
    if (employers.has(term) && v.capMid.size < EMPLOYER_OVERRIDE_BOARDS) { rejected.employers++; continue }
    // ⚠️ THE RATIO IS WHAT SEPARATES A TECHNOLOGY FROM AN ENGLISH WORD.
    // "development" appears lowercase in nearly every posting that also
    // capitalises it once in a heading; "Kubernetes" almost never appears
    // lowercase. 0.6 was chosen by reading the tail of the output, which is
    // where the boundary is legible.
    const ratio = v.capMidCount / (v.capMidCount + v.lower)
    if (ratio < 0.6) { rejected.mostlyLowercase++; continue }
    /**
     * ⚠️ TWO-LETTER TERMS ARE THE NOISIEST CLASS IN THE SET, and they need a
     * far higher bar rather than a wordlist. "ai" (803 boards), "ml", "bi",
     * "ux" and "qa" are real and enormous; "mr", "wi", "xv", "pp" and "hq" are
     * initials, table headers and fragments that clear 12 boards easily because
     * two letters collide with everything. Raising the dispersion bar for them
     * alone keeps the rule measured instead of curated — no list to maintain,
     * and a genuinely universal two-letter term still passes.
     */
    if (term.length <= 2 && v.capMid.size < SHORT_TERM_BOARDS) { rejected.tooShort++; continue }
    kept.push({ term, boards: v.capMid.size, capRatio: Number(ratio.toFixed(2)) })
  }
  kept.sort((a, b) => b.boards - a.boards)

  if (process.argv.includes('--audit-employers')) {
    const both = [...acc.entries()]
      .filter(([t, v]) => employers.has(t) && v.capMid.size >= MIN_BOARDS && !places.has(t) && !NOT_SKILLS.has(t))
      .map(([t, v]) => ({ t, boards: v.capMid.size }))
      .sort((a, b) => b.boards - a.boards)
    console.log('\nTERMS THAT ARE BOTH AN EMPLOYER IN OUR REGISTRY AND WIDELY NAMED:')
    console.log('  ' + both.slice(0, 60).map((x) => `${x.t}(${x.boards})`).join(' '))
    console.log(`\n  ${both.filter((x) => x.boards >= EMPLOYER_OVERRIDE_BOARDS).length} clear the ${EMPLOYER_OVERRIDE_BOARDS}-board override; ${both.length} total\n`)
  }
  console.log('rejected:', JSON.stringify(rejected))
  console.log(`kept ${kept.length} terms named by >= ${MIN_BOARDS} distinct employers\n`)
  console.log('top 40:'); console.log('  ' + kept.slice(0, 40).map((k) => `${k.term}(${k.boards})`).join(' '))
  console.log('\nthe tail, where the noise would be:')
  console.log('  ' + kept.slice(-30).map((k) => `${k.term}(${k.boards})`).join(' '))

  const out = {
    builtAt: new Date().toISOString().slice(0, 10),
    minBoards: MIN_BOARDS,
    descriptionsScanned: scanned,
    terms: Object.fromEntries(kept.map((k) => [k.term, { boards: k.boards, capRatio: k.capRatio }])),
  }
  writeFileSync('src/lib/taxonomy/skills.json', JSON.stringify(out, null, 0) + '\n')
  console.log(`\nwrote src/lib/taxonomy/skills.json (${kept.length} terms)`)
}

main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
