import { describe, it, expect } from 'vitest'
import {
  activeFilters, applyDrawerFilters, applyTextFilter, cleanSkip, drawerParams, EMPTY_VIEW, feedViewSchema, interpretFeedQuery, isEmptyView, jobTypeOf,
  levelOfYears, matchesQuery, onlyFilter, parseFeedQuery, promptChips, relaxations, soloCounts, toggleSkill, viewFromParams,
  viewFromStored, viewToParams, viewToQuery, withoutFilter,
  type FeedView,
} from '../feed-query'

describe('parseFeedQuery — a sentence becomes the pills', () => {
  it('reads role words, city and pills', () => {
    const v = parseFeedQuery('Product manager jobs in Bangalore, easy apply, posted today')
    expect(v).toMatchObject({ q: 'product manager', city: 'Bengaluru', easy: true, fresh: true, remote: false, min80: false })
  })

  it('treats "remote ok" as allowed, not required', () => {
    const v = parseFeedQuery('fintech PM in Bengaluru, remote ok')
    expect(v.remote).toBe(false)
    expect(v.q).toBe('fintech pm')
    expect(parseFeedQuery('remote data analyst').remote).toBe(true)
  })

  it('prefers the longest city name', () => {
    expect(parseFeedQuery('analyst in navi mumbai').city).toBe('Navi Mumbai')
  })

  it('reads a strong-match request', () => {
    expect(parseFeedQuery('strong match sales roles').min80).toBe(true)
    expect(parseFeedQuery('sales above 80').min80).toBe(true)
  })

  it('returns an empty view for filler', () => {
    expect(parseFeedQuery('show me some jobs please')).toMatchObject({ q: '', city: '' })
  })
})

describe('matchesQuery', () => {
  const role = { title: 'Senior Product Manager, Payments', company: 'Razorpay', location: 'Bengaluru' }
  it('needs every word in the title or company', () => {
    expect(matchesQuery('product manager', role)).toBe(true)
    expect(matchesQuery('razorpay payments', role)).toBe(true)
    expect(matchesQuery('product designer', role)).toBe(false)
  })
  it('expands the short forms candidates type', () => {
    expect(matchesQuery('pm', role)).toBe(true)
    expect(matchesQuery('sde', { title: 'Software Engineer II', company: 'X', location: '' })).toBe(true)
  })
  it('matches word starts, not the middle of a word', () => {
    expect(matchesQuery('pay', role)).toBe(true)
    expect(matchesQuery('ment', role)).toBe(false)
  })
})

describe('applyTextFilter', () => {
  const text = new Map([
    ['a', { title: 'Product Manager', company: 'Zeta', location: 'Bangalore, Karnataka' }],
    ['b', { title: 'Product Manager', company: 'Zeta', location: 'Mumbai' }],
    ['c', { title: 'Data Engineer', company: 'Zeta', location: 'Bengaluru' }],
  ])
  const rows = [{ role_id: 'a' }, { role_id: 'b' }, { role_id: 'c' }, { role_id: 'd' }]
  it('filters by words and by city, with aliases', () => {
    expect(applyTextFilter(rows, { q: 'product', city: 'Bengaluru' }, text).map((r) => r.role_id)).toEqual(['a'])
  })
  it('is a no-op with no filter, keeping even rows with no text read', () => {
    expect(applyTextFilter(rows, { q: '', city: '' }, text)).toHaveLength(4)
  })
})

describe('views round-trip through the URL, and only whitelisted keys survive', () => {
  it('round-trips', () => {
    const v = parseFeedQuery('remote pm in pune easy apply')
    expect(viewFromParams(Object.fromEntries(new URLSearchParams(viewToQuery(v))))).toEqual(v)
  })
  it('drops anything else', () => {
    const q = viewToQuery(viewFromParams({ min80: '1', evil: 'javascript:alert(1)', q: 'pm' }))
    expect(q).toBe('min80=1&q=pm')
  })
})

describe('toggleSkill', () => {
  it('adds once, case-insensitively, and removes', () => {
    expect(toggleSkill(['SQL'], 'python', true)).toEqual(['SQL', 'python'])
    expect(toggleSkill(['SQL'], 'sql', true)).toEqual(['SQL'])
    expect(toggleSkill(['SQL', 'Python'], 'sql', false)).toEqual(['Python'])
  })
  it('respects the 40-skill cap', () => {
    const forty = Array.from({ length: 40 }, (_, i) => `s${i}`)
    expect(toggleSkill(forty, 'new', true)).toHaveLength(40)
  })
})

// ------------------------------------------------------------ TASK-155: the drawer

/** Every field set at once — a view that exercises the whole shape. */
const FULL: FeedView = {
  min80: true, fresh: true, remote: true, easy: true, q: 'product manager', city: 'Pune',
  posted: '7', level: 'mid', type: 'contract', mode: 'hybrid', pay: 12, skip: 'Accenture,TCS', sort: 'new',
}
const roundTrip = (v: FeedView) => viewFromParams(Object.fromEntries(new URLSearchParams(viewToQuery(v))))

describe('every drawer field round-trips through the URL', () => {
  it('the whole shape', () => expect(roundTrip(FULL)).toEqual(FULL))

  it.each([
    ['posted', { posted: '3' as const }],
    ['posted', { posted: '30' as const }],
    ['level', { level: 'entry' as const }],
    ['level', { level: 'senior' as const }],
    ['type', { type: 'intern' as const }],
    ['type', { type: 'parttime' as const }],
    ['type', { type: 'fulltime' as const }],
    ['mode', { mode: 'remote' as const }],
    ['mode', { mode: 'hybrid' as const }],
    ['mode', { mode: 'onsite' as const }],
    ['pay', { pay: 1 }],
    ['pay', { pay: 500 }],
    ['skip', { skip: 'Zeta' }],
    ['sort', { sort: 'new' as const }],
    ['sort', { sort: 'pay' as const }],
    ['sort', { sort: 'company' as const }],
  ])('%s alone: %j', (_k, patch) => {
    const v = { ...EMPTY_VIEW, ...patch }
    expect(roundTrip(v)).toEqual(v)
    // and it writes exactly one key, so one field cannot leak into another
    expect([...new URLSearchParams(viewToQuery(v)).keys()]).toHaveLength(1)
  })

  it('writes a clean URL: unset fields write nothing', () => {
    expect(viewToQuery(EMPTY_VIEW)).toBe('')
    expect(viewToQuery({ ...EMPTY_VIEW, level: 'mid', pay: 8 })).toBe('level=mid&pay=8')
  })

  it('refuses values outside the whitelist instead of passing them on', () => {
    const v = viewFromParams({ posted: '9999', level: 'god', type: '<script>', mode: 'underwater', pay: '-5', skip: undefined, sort: 'oldest' })
    expect(v).toEqual(EMPTY_VIEW)
    expect(viewFromParams({ pay: '501' }).pay).toBe(0)
    expect(viewFromParams({ pay: '12.9' }).pay).toBe(12)
    expect(viewFromParams({ pay: 'abc' }).pay).toBe(0)
  })

  it('keeps the drawer params together for links that carry them', () => {
    expect(drawerParams(FULL)).toEqual([['posted', '7'], ['level', 'mid'], ['type', 'contract'], ['mode', 'hybrid'], ['pay', '12'], ['skip', 'Accenture,TCS']])
    expect(drawerParams(EMPTY_VIEW)).toEqual([])
  })

  it('counts a drawer field or the sort as a non-empty view', () => {
    expect(isEmptyView(EMPTY_VIEW)).toBe(true)
    for (const patch of [{ posted: '3' }, { level: 'mid' }, { type: 'intern' }, { mode: 'hybrid' }, { pay: 5 }, { skip: 'X' }, { sort: 'new' }, { sort: 'pay' }] as Partial<FeedView>[]) {
      expect(isEmptyView({ ...EMPTY_VIEW, ...patch })).toBe(false)
    }
  })
})

describe('cleanSkip', () => {
  it('trims, drops blanks and duplicates, keeps the first spelling', () => {
    expect(cleanSkip(' Accenture ,, tcs,ACCENTURE ,\n Infosys ')).toBe('Accenture,tcs,Infosys')
  })
  it('is idempotent', () => {
    const once = cleanSkip('A b , c d,  e')
    expect(cleanSkip(once)).toBe(once)
  })
  it('caps the list and each name', () => {
    expect(cleanSkip(Array.from({ length: 30 }, (_, i) => `co${i}`).join(',')).split(',')).toHaveLength(10)
    expect(cleanSkip('x'.repeat(200))).toHaveLength(40)
  })
})

describe('a saved filter restores exactly', () => {
  it('through the stored shape and back', () => {
    // What writeSavedFilters would put in jsonb and readFeedPrefs would read out.
    const stored = JSON.parse(JSON.stringify(FULL))
    expect(viewFromStored(stored)).toEqual(FULL)
  })
  it('viewToParams is the inverse of viewFromParams', () => {
    expect(viewFromParams(viewToParams(FULL))).toEqual(FULL)
  })
  it('a filter saved before the drawer existed restores with the new fields off', () => {
    const old = { min80: true, fresh: false, remote: true, easy: false, q: 'analyst', city: 'Pune' }
    expect(viewFromStored(old)).toEqual({ ...EMPTY_VIEW, min80: true, remote: true, q: 'analyst', city: 'Pune' })
  })
  it('tampered storage cannot produce a view the controls could not', () => {
    expect(viewFromStored({ posted: 'forever', level: ['x'], pay: 9e9, skip: 5, type: {} })).toEqual(EMPTY_VIEW)
    expect(viewFromStored(null)).toBeNull()
    expect(viewFromStored('str')).toBeNull()
  })
  it('a number stored for pay is read as pay', () => {
    expect(viewFromStored({ pay: 15 })?.pay).toBe(15)
  })
})

describe('the saveFilter boundary (Zod)', () => {
  it('accepts a full view', () => expect(feedViewSchema.safeParse(FULL).success).toBe(true))
  it('accepts the empty view', () => expect(feedViewSchema.safeParse(EMPTY_VIEW).success).toBe(true))
  it.each([
    ['unknown window', { posted: '365' }],
    ['unknown level', { level: 'principal' }],
    ['unknown type', { type: 'volunteer' }],
    ['unknown work mode', { mode: 'underwater' }],
    ['negative pay', { pay: -1 }],
    ['fractional pay', { pay: 1.5 }],
    ['pay as text', { pay: '12' }],
    ['pay beyond the cap', { pay: 501 }],
    ['unknown sort', { sort: 'oldest' }],
    ['an extra key', { admin: true }],
  ])('refuses %s', (_n, patch) => {
    expect(feedViewSchema.safeParse({ ...EMPTY_VIEW, ...patch }).success).toBe(false)
  })
})

describe('jobTypeOf — read from the title', () => {
  it.each([
    ['Software Engineering Intern', 'intern'],
    ['Summer Internship 2026', 'intern'],
    ['Contract Product Designer', 'contract'],
    ['Senior Contract Software Engineer', 'contract'],
    ['Software Engineer (Contract)', 'contract'],
    ['Data Analyst - Contract', 'contract'],
    ['Data Analyst, Contract', 'contract'],
    ['Backend Developer Contract', 'contract'],
    ['Contractor, Payments', 'contract'],
    ['Developer (Contract-to-Hire)', 'contract'],
    ['Material Management, Vendor Management Expert-Fixed Term', 'contract'],
    ['Temporary Office Assistant', 'contract'],
    ['Office Assistant (Temp)', 'contract'],
    ['Data Analyst (Fixed-Term)', 'contract'],
    ['Part-time Content Writer', 'parttime'],
    ['Part time Support', 'parttime'],
    ['Senior Product Manager', 'fulltime'],
  ] as const)('%s → %s', (title, type) => expect(jobTypeOf(title)).toBe(type))

  it('does not read a function that merely contains the word (found on the live feed, 2026-10-07)', () => {
    expect(jobTypeOf('Manager Contract Management')).toBe('fulltime')
    expect(jobTypeOf('Contract Manager')).toBe('fulltime')
    expect(jobTypeOf('Contract Specialist, Procurement')).toBe('fulltime')
    expect(jobTypeOf('Contract Analyst')).toBe('fulltime')
    expect(jobTypeOf('Senior Contracts Counsel')).toBe('fulltime')
    expect(jobTypeOf('Sales Contract Administrator')).toBe('fulltime')
  })

  it('does not read a word that merely contains one', () => {
    expect(jobTypeOf('International Business Manager')).toBe('fulltime')
    expect(jobTypeOf('Internal Auditor')).toBe('fulltime')
    expect(jobTypeOf('Temple Operations Lead')).toBe('fulltime')
  })
})

describe('levelOfYears — the bands', () => {
  it.each([[0, 'entry'], [1, 'entry'], [2, 'entry'], [3, 'mid'], [5, 'mid'], [6, 'senior'], [12, 'senior']] as const)(
    '%s years → %s', (y, level) => expect(levelOfYears(y)).toBe(level),
  )
})

describe('applyDrawerFilters — one field moves the count the expected way', () => {
  const NOW = Date.parse('2026-10-07T12:00:00Z')
  const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()
  const ids = ['a', 'b', 'c', 'd', 'e', 'f']
  const rows = ids.map((role_id) => ({ role_id }))
  const text = new Map([
    ['a', { title: 'Product Manager', company: 'Zeta', location: '' }],
    ['b', { title: 'Product Manager Intern', company: 'Accenture India Pvt Ltd', location: '' }],
    ['c', { title: 'Contract Product Designer', company: 'TCS', location: '' }],
    ['d', { title: 'Senior Engineer', company: 'Accentureworks', location: '' }],
    ['e', { title: 'Designer', company: 'Razorpay', location: '' }],
    ['f', { title: 'Part-time Writer', company: 'Zeta', location: '' }],
  ])
  const postedAt = new Map([['a', daysAgo(1)], ['b', daysAgo(2)], ['c', daysAgo(10)], ['d', daysAgo(40)], ['e', daysAgo(5)]]) // f has no date
  const floors = new Map([['a', 4], ['b', 0], ['c', 2], ['d', 8]]) // e, f state nothing
  const pays = new Map([['a', 1_800_000], ['b', 300_000], ['e', 1_200_000]])
  const facts = { text, postedAt, floors, pays }
  const run = (patch: Partial<FeedView>) => applyDrawerFilters(rows, { ...EMPTY_VIEW, ...patch }, facts, NOW)
  const idsOf = (patch: Partial<FeedView>) => run(patch).rows.map((r) => r.role_id)

  it('is a no-op with nothing on — even for rows nothing was read for', () => {
    expect(applyDrawerFilters(rows, EMPTY_VIEW, { text: new Map() }, NOW)).toEqual({ rows, notes: { undated: 0, unstatedLevel: 0, unstatedPay: 0, unstatedMode: 0 } })
  })

  it('posted: keeps the window, leaves out the undated, and counts them', () => {
    expect(idsOf({ posted: '3' })).toEqual(['a', 'b'])
    expect(idsOf({ posted: '7' })).toEqual(['a', 'b', 'e'])
    expect(idsOf({ posted: '30' })).toEqual(['a', 'b', 'c', 'e'])
    expect(run({ posted: '30' }).notes.undated).toBe(1) // f
  })
  it('a wider window never has fewer roles than a narrower one', () => {
    expect(idsOf({ posted: '3' }).length).toBeLessThanOrEqual(idsOf({ posted: '7' }).length)
    expect(idsOf({ posted: '7' }).length).toBeLessThanOrEqual(idsOf({ posted: '30' }).length)
  })

  it('level: bands by years asked, and KEEPS roles that state none', () => {
    expect(idsOf({ level: 'entry' })).toEqual(['b', 'c', 'e', 'f'])
    expect(idsOf({ level: 'mid' })).toEqual(['a', 'e', 'f'])
    expect(idsOf({ level: 'senior' })).toEqual(['d', 'e', 'f'])
    expect(run({ level: 'mid' }).notes.unstatedLevel).toBe(2) // e, f
  })

  it('type: from the title', () => {
    expect(idsOf({ type: 'intern' })).toEqual(['b'])
    expect(idsOf({ type: 'contract' })).toEqual(['c'])
    expect(idsOf({ type: 'parttime' })).toEqual(['f'])
    expect(idsOf({ type: 'fulltime' })).toEqual(['a', 'd', 'e'])
  })
  it('type: the four types partition the list', () => {
    const all = (['fulltime', 'intern', 'contract', 'parttime'] as const).flatMap((t) => idsOf({ type: t }))
    expect([...all].sort()).toEqual([...ids].sort())
  })

  it('pay: needs a stated pay at or above the floor; the rest are left out and counted', () => {
    expect(idsOf({ pay: 10 })).toEqual(['a', 'e'])
    expect(idsOf({ pay: 15 })).toEqual(['a'])
    expect(idsOf({ pay: 1 })).toEqual(['a', 'b', 'e'])
    expect(run({ pay: 10 }).notes.unstatedPay).toBe(3) // c, d, f
  })

  it('skip: matches the employer as normalised, not by substring in the middle', () => {
    expect(idsOf({ skip: 'Accenture' })).toEqual(['a', 'c', 'e', 'f']) // b (Accenture India Pvt Ltd) and d (Accentureworks) go
    expect(idsOf({ skip: 'zeta' })).toEqual(['b', 'c', 'd', 'e'])
    expect(idsOf({ skip: 'Accenture,Zeta' })).toEqual(['c', 'e'])
  })
  it('skip: a name too short to be unambiguous matches only the whole employer', () => {
    expect(idsOf({ skip: 'tc' })).toEqual(ids) // "tc" does not take out "TCS"
    expect(idsOf({ skip: 'tcs' })).toEqual(['a', 'b', 'd', 'e', 'f'])
  })

  it('filters combine as AND', () => {
    expect(idsOf({ posted: '30', type: 'fulltime', level: 'mid' })).toEqual(['a', 'e'])
    expect(idsOf({ posted: '7', skip: 'Zeta', pay: 10 })).toEqual(['e'])
  })

  it('the drawer does not touch the pills or the text filter: it only narrows', () => {
    const narrowed = run({ posted: '7', level: 'entry' }).rows
    expect(narrowed.every((r) => rows.includes(r))).toBe(true)
  })

  it('a role with no title/employer read is not skipped, and is dropped by a type filter', () => {
    const bare = [{ role_id: 'zz' }]
    expect(applyDrawerFilters(bare, { ...EMPTY_VIEW, skip: 'Zeta' }, { text: new Map() }, NOW).rows).toHaveLength(1)
    expect(applyDrawerFilters(bare, { ...EMPTY_VIEW, type: 'intern' }, { text: new Map() }, NOW).rows).toHaveLength(0)
  })
})

describe('"why so few results" (TASK-156)', () => {
  // A toy pipeline: 100 roles; each filter keeps a fixed share, independently.
  const KEEP: Record<string, (i: number) => boolean> = {
    remote: (i) => i % 2 === 0,      // 50
    posted: (i) => i % 5 === 0,      // 20
    level: (i) => i % 7 === 0,       // 15
    city: (i) => i < 40,             // 40
  }
  const count = (v: FeedView) => {
    let n = 0
    for (let i = 0; i < 100; i++) {
      if (v.remote && !KEEP.remote(i)) continue
      if (v.posted && !KEEP.posted(i)) continue
      if (v.level && !KEEP.level(i)) continue
      if (v.city && !KEEP.city(i)) continue
      n++
    }
    return n
  }
  const all: FeedView = { ...EMPTY_VIEW, remote: true, posted: '7', level: 'mid', city: 'Pune' }

  it('lists the active filters, and withoutFilter takes exactly one off', () => {
    expect(activeFilters(all)).toEqual(['remote', 'city', 'posted', 'level'])
    expect(withoutFilter(all, 'remote').remote).toBe(false)
    expect(withoutFilter(all, 'level').level).toBe('')
    expect(activeFilters(withoutFilter(all, 'city'))).toEqual(['remote', 'posted', 'level'])
  })

  it('the sort is not a filter: it survives both operations', () => {
    const sorted = { ...all, sort: 'new' as const }
    expect(withoutFilter(sorted, 'remote').sort).toBe('new')
    expect(onlyFilter(sorted, 'remote').sort).toBe('new')
    expect(activeFilters({ ...EMPTY_VIEW, sort: 'new' })).toEqual([])
  })

  it('reports the exact count with one filter off, biggest gain first, only where it adds roles', () => {
    expect(count(all)).toBe(1) // only role 0 is even, a multiple of 5 and of 7, and under 40
    const r = relaxations(all, count)
    expect(r).toHaveLength(4) // every filter, taken off alone, adds roles
    for (const x of r) expect(x.count).toBe(count(withoutFilter(all, x.key)))
    expect(r.every((x) => x.count > 0)).toBe(true)
    expect(r.map((x) => x.count)).toEqual([...r.map((x) => x.count)].sort((a, b) => b - a))
  })

  it('offers nothing to relax when removing any one filter still leaves nothing', () => {
    const none = (v: FeedView) => (v.remote && v.posted && v.level && v.city ? 0 : v.remote || v.posted || v.level || v.city ? 0 : 100)
    expect(relaxations(all, none)).toEqual([])
  })

  it('soloCounts: what each filter leaves alone, narrowest first', () => {
    expect(soloCounts(all, count)).toEqual([
      { key: 'level', count: 15 }, { key: 'posted', count: 20 }, { key: 'city', count: 40 }, { key: 'remote', count: 50 },
    ])
  })

  it('onlyFilter keeps just the one filter', () => {
    expect(onlyFilter(all, 'posted')).toEqual({ ...EMPTY_VIEW, posted: '7' })
    expect(onlyFilter({ ...EMPTY_VIEW, pay: 12, q: 'pm' }, 'pay')).toEqual({ ...EMPTY_VIEW, pay: 12 })
  })
})

describe('promptChips — searches built from the candidate\'s own profile', () => {
  it('uses the role, city and experience', () => {
    const c = promptChips({ role: 'Product Manager', city: 'Pune', years: 8 })
    expect(c).toContain('Product Manager in Pune')
    expect(c).toContain('Product Manager, senior level')
    expect(c.length).toBeLessThanOrEqual(6)
  })
  it('reads years into a level', () => {
    expect(promptChips({ role: 'Analyst', years: 1 })).toContain('entry level Analyst')
    expect(promptChips({ role: 'Analyst', years: 4 })).toContain('Analyst, mid level')
  })
  it('every chip parses back into the search it describes', () => {
    for (const chip of promptChips({ role: 'Data Analyst', city: 'Pune', years: 1 })) {
      const v = parseFeedQuery(chip)
      expect(v.q).toBe('data analyst')
    }
  })
  it('offers general chips when there is no role yet', () => {
    expect(promptChips({}).length).toBeGreaterThan(0)
  })
})

describe('an exclusion list ends where the next filter begins (found by the history strip, 2026-10-08)', () => {
  it('does not read "newest first" as an employer', () => {
    const v = parseFeedQuery('product manager in Pune, excluding TCS, newest first')
    expect(v.skip).toBe('TCS')
    expect(v.sort).toBe('new')
  })
  it('still takes several employers, and keeps a company whose name starts like a filter word', () => {
    expect(parseFeedQuery('analyst excluding TCS, Infosys and Top Glove').skip).toBe('TCS,Infosys,Top Glove')
  })
  it('hands a trailing filter back whatever it is', () => {
    const v = parseFeedQuery('designer excluding Accenture, remote')
    expect(v.skip).toBe('Accenture')
    expect(v.remote).toBe(true)
  })
})

// ------------------------------------------------------------ TASK-210: work mode, stated type, more sorts

describe('work mode and sort words in a sentence', () => {
  it.each([
    ['hybrid product manager in Pune', { mode: 'hybrid', city: 'Pune' }],
    ['on-site analyst roles', { mode: 'onsite' }],
    ['onsite jobs in Chennai', { mode: 'onsite', city: 'Chennai' }],
    ['designer, work from office', { mode: 'onsite' }],
    ['highest paying data analyst roles', { sort: 'pay' }],
    ['analyst roles sorted by company', { sort: 'company' }],
    ['alphabetical product manager', { sort: 'company' }],
  ])('%s', (text, want) => {
    expect(parseFeedQuery(text)).toMatchObject(want)
  })
  it('"hybrid or remote" is still "remote is fine", not a hybrid filter', () => {
    expect(parseFeedQuery('hybrid or remote marketing').mode).toBe('')
  })
  it('"remove hybrid" takes the filter off, and "also hybrid" adds it', () => {
    const cur = { ...EMPTY_VIEW, mode: 'hybrid' as const, city: 'Pune' }
    expect(interpretFeedQuery('remove hybrid', cur).mode).toBe('')
    expect(interpretFeedQuery('also onsite', { ...EMPTY_VIEW, city: 'Pune' }).mode).toBe('onsite')
  })
})

describe('the drawer: mode and stated type', () => {
  const rows = ['a', 'b', 'c', 'd'].map((role_id) => ({ role_id }))
  const text = new Map(rows.map((r) => [r.role_id, { title: r.role_id === 'd' ? 'Software Engineering Intern' : 'Engineer', company: 'Acme', location: '' }]))

  it('a work-mode filter keeps only roles whose employer states it, and counts those it left out', () => {
    const modes = new Map<string, 'remote' | 'hybrid' | 'onsite'>([['a', 'hybrid'], ['b', 'onsite']])
    const { rows: kept, notes } = applyDrawerFilters(rows, { ...EMPTY_VIEW, mode: 'hybrid' }, { text, modes })
    expect(kept.map((r) => r.role_id)).toEqual(['a'])
    expect(notes.unstatedMode).toBe(2) // c and d state nothing: not "not hybrid", just unknown
  })

  it('a stated contract type beats the title; the title decides only where nothing is stated', () => {
    const types = new Map<string, 'fulltime' | 'parttime' | 'intern' | 'contract'>([['a', 'contract']])
    const intern = applyDrawerFilters(rows, { ...EMPTY_VIEW, type: 'intern' }, { text, types }).rows.map((r) => r.role_id)
    expect(intern).toEqual(['d'])
    const contract = applyDrawerFilters(rows, { ...EMPTY_VIEW, type: 'contract' }, { text, types }).rows.map((r) => r.role_id)
    expect(contract).toEqual(['a'])
    // 'a' is called Engineer (full-time by title) but its employer's system says contract
    const fulltime = applyDrawerFilters(rows, { ...EMPTY_VIEW, type: 'fulltime' }, { text, types }).rows.map((r) => r.role_id)
    expect(fulltime).toEqual(['b', 'c'])
  })

  it('mode takes part in "why so few results" like every other filter', () => {
    const v = { ...EMPTY_VIEW, mode: 'hybrid' as const, remote: true }
    expect(activeFilters(v)).toEqual(['remote', 'mode'])
    expect(withoutFilter(v, 'mode').mode).toBe('')
    expect(onlyFilter(v, 'mode')).toMatchObject({ mode: 'hybrid', remote: false })
  })
})
