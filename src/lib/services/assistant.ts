import { createClient } from '@/lib/supabase/server'
import { displayEmployer } from '@/lib/display-names'
import { istDay } from '@/lib/day'
import { HIGH_PRECISION_MIN } from '@/lib/score-bands'
import { profileHealth } from '@/lib/profile-health'
import { helpCard, type Answer, type Card, type Intent, type MissionFacts, type ProactiveFacts, type RoleItem } from '@/lib/assistant'
import { listResumes } from '@/lib/services/resume-documents'
import { countConnections } from '@/lib/services/network'
import { readPreferences } from '@/lib/services/workspace'
import { readRoleFacts, readStatedPays } from '@/lib/services/shortlist'
import { payFromRow } from '@/lib/role-facts'
import { weeklyLine } from '@/lib/agent'
import { proposeForCandidate, readAgentSettings, readAppliedThisWeek } from '@/lib/services/agent'

/**
 * What "Ask Jobinko" reads to answer. Every query runs as the signed-in candidate, so RLS
 * is the security and nothing here can see another person's rows; the user_id filters
 * are for correctness. Each read is bounded (a handful of rows, or a count) — a question
 * must never cost what the feed costs.
 */
type RoleJoin = { title: string; company_name: string | null } | null
type ScoreRow = { role_id: string; score: number | null; roles: RoleJoin }

const toItem = (r: ScoreRow): RoleItem => ({ id: r.role_id, title: r.roles?.title ?? '', company: displayEmployer(r.roles?.company_name), score: Math.round(r.score ?? 0) })
const NEW_DAYS = 7
const IN_CHUNK = 100

async function topScored(userId: string, limit: number, extra?: (q: ReturnType<ReturnType<Awaited<ReturnType<typeof createClient>>['from']>['select']>) => unknown) {
  const supabase = await createClient()
  let q = supabase.from('gate_results').select('role_id, score, roles(title, company_name)').eq('user_id', userId).order('score', { ascending: false, nullsFirst: false }).limit(limit)
  if (extra) q = extra(q as never) as typeof q
  const { data, error } = await q
  return { rows: ((data ?? []) as unknown as ScoreRow[]).filter((r) => r.roles), error }
}

/** Role ids first shown to this candidate in the last week, with their scores. Capped: a week of arrivals is a few hundred at most. */
async function newThisWeek(userId: string): Promise<ScoreRow[]> {
  const supabase = await createClient()
  const since = new Date(Date.now() - NEW_DAYS * 86_400_000).toISOString()
  const { data: shown } = await supabase.from('role_first_shown').select('role_id').eq('user_id', userId).gte('first_shown_at', since).limit(300)
  const ids = ((shown ?? []) as { role_id: string }[]).map((r) => r.role_id)
  const out: ScoreRow[] = []
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const { data } = await supabase.from('gate_results').select('role_id, score, roles(title, company_name)').eq('user_id', userId).in('role_id', ids.slice(i, i + IN_CHUNK))
    out.push(...((data ?? []) as unknown as ScoreRow[]).filter((r) => r.roles))
  }
  return out.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
}

const rolesCard = (title: string, rows: ScoreRow[], href: string, total?: number): Card => ({
  type: 'roles', title, items: rows.slice(0, 5).map(toItem), href,
  more: total && total > 5 ? `and ${(total - 5).toLocaleString('en-IN')} more` : undefined,
})

export async function answerFor(userId: string, intent: Intent): Promise<Answer> {
  const supabase = await createClient()

  if (intent === 'help') return { intent, cards: [{ type: 'text', text: 'I answer a set of questions about your own shortlist and tracker — I do not guess at anything else. Try one of these:' }, helpCard()] }

  if (intent === 'progress') {
    const [{ settings, stored }, done] = await Promise.all([readAgentSettings(userId), readAppliedThisWeek()])
    if (done === null) return { intent, cards: [{ type: 'text', text: 'I could not read your tracker just now. That is on our side, not a result.' }] }
    const line = weeklyLine(done, settings.weeklyTarget)
    return { intent, cards: [{ type: 'progress', done, target: settings.weeklyTarget, line }, { type: 'link', label: stored ? 'Change the target in your profile' : 'Set a weekly target (needs a database update)', href: '/profile' }] }
  }

  if (intent === 'queue') {
    const r = await proposeForCandidate(userId, { max: 5 })
    if (!r.stored) return { intent, cards: [{ type: 'text', text: 'The agent needs a database update (0048) that has not been applied yet, so it cannot propose anything.' }] }
    if (r.settings.mode === 'off') return { intent, cards: [{ type: 'text', text: 'The agent is off in your settings, so I will not propose roles to queue.' }, { type: 'link', label: 'Change that in your profile', href: '/profile' }] }
    if (!r.picks.length) {
      const why = r.appliedThisWeek !== null && r.settings.weeklyTarget > 0 && r.appliedThisWeek >= r.settings.weeklyTarget
        ? `You have already applied to ${r.appliedThisWeek} this week, which meets your target of ${r.settings.weeklyTarget}.`
        : `No Easy-apply role you have not already tracked, hidden or queued scores ${r.settings.minScore} or above right now${r.settings.weeklyTarget > 0 ? ', or this week’s room under your target is used up' : ''}.`
      return { intent, cards: [{ type: 'text', text: why }, { type: 'link', label: 'Change your target or minimum score', href: '/profile' }] }
    }
    return { intent, cards: [{ type: 'queue', title: `${r.picks.length} Easy-apply role${r.picks.length === 1 ? '' : 's'} scoring ${r.settings.minScore}+, not yet tracked`, items: r.picks.map((c) => ({ roleId: c.roleId, title: c.title, company: c.company, score: c.score, url: c.applyUrl })), note: 'Adding them only queues them. Nothing is submitted until you switch on “Apply for me” in the extension and press Start — and you can remove any from its queue first.' }] }
  }

  if (intent === 'best') {
    const { rows, error } = await topScored(userId, 5)
    if (error) return { intent, cards: [{ type: 'text', text: 'I could not read your shortlist just now. That is on our side, not a result.' }] }
    if (!rows.length) return { intent, cards: [{ type: 'text', text: 'Nothing has been scored for you yet.' }, { type: 'link', label: 'Check your profile', href: '/profile' }] }
    return { intent, cards: [rolesCard('Your five highest scores', rows, '/today')] }
  }

  if (intent === 'new') {
    const rows = await newThisWeek(userId)
    if (!rows.length) return { intent, cards: [{ type: 'text', text: 'Nothing new has been shown to you in the last 7 days. That is a quiet week for the roles you search for, not a verdict on you.' }] }
    const strong = rows.filter((r) => (r.score ?? 0) >= HIGH_PRECISION_MIN).length
    return { intent, cards: [{ type: 'stat', label: 'New in the last 7 days', value: rows.length.toLocaleString('en-IN'), note: `${strong} scoring ${HIGH_PRECISION_MIN} or above` }, rolesCard('Highest scoring of them', rows, '/today?tab=new', rows.length)] }
  }

  if (intent === 'strong') {
    const { count } = await supabase.from('gate_results').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('score', HIGH_PRECISION_MIN)
    const { count: all } = await supabase.from('gate_results').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    return { intent, cards: [{ type: 'stat', label: `Scoring ${HIGH_PRECISION_MIN} or above`, value: (count ?? 0).toLocaleString('en-IN'), note: `of ${(all ?? 0).toLocaleString('en-IN')} roles scored for you` }, { type: 'link', label: 'See them on your feed', href: '/today?min80=1' }] }
  }

  if (intent === 'improve') {
    const { data } = await supabase.from('gate_results').select('components:score_breakdown->components').eq('user_id', userId).order('score', { ascending: false, nullsFirst: false }).limit(100)
    type C = { key: string; label: string; points: number; max: number }
    const totals = new Map<string, { label: string; points: number; max: number }>()
    for (const r of (data ?? []) as unknown as { components: C[] | null }[]) {
      for (const c of r.components ?? []) {
        if (c.key === 'cap' || c.max <= 0) continue
        const t = totals.get(c.key) ?? { label: c.label, points: 0, max: 0 }
        t.points += c.points; t.max += c.max; totals.set(c.key, t)
      }
    }
    // By POINTS LOST, not by share earned: a component that only applies to a few postings (a credential) can sit at 0% and still cost you almost nothing.
    const worst = [...totals.values()].map((t) => ({ label: t.label, lost: t.max - t.points, share: t.points / t.max })).sort((a, b) => b.lost - a.lost)[0]
    if (!worst) return { intent, cards: [{ type: 'text', text: 'Nothing has been scored for you yet, so there is nothing to improve against.' }] }
    return { intent, cards: [{ type: 'stat', label: 'Losing you the most points, across your top 100 roles', value: worst.label, note: `${Math.round(worst.lost).toLocaleString('en-IN')} points lost in total · ${Math.round(worst.share * 100)}% of its points earned` }, { type: 'link', label: 'See what to do about it', href: '/copilot' }] }
  }

  if (intent === 'followups') {
    const { data } = await supabase.from('applications').select('id, title, company, follow_up_on, status').lte('follow_up_on', istDay()).neq('status', 'closed').order('follow_up_on', { ascending: true }).limit(20)
    const due = ((data ?? []) as { id: string; title: string; company: string; follow_up_on: string; status: string }[]).filter((a) => a.status !== 'rejected')
    if (!due.length) return { intent, cards: [{ type: 'text', text: 'Nothing is due a follow-up.' }, { type: 'link', label: 'Open the tracker', href: '/applications' }] }
    return { intent, cards: [{ type: 'stat', label: 'Due a follow-up', value: due.length.toLocaleString('en-IN'), note: due.slice(0, 3).map((a) => `${a.title} at ${a.company}`).join(' · ') }, { type: 'link', label: 'Open the tracker', href: '/applications' }] }
  }

  if (intent === 'applied') {
    const { data } = await supabase.from('applications').select('status').limit(1000)
    const counts = new Map<string, number>()
    for (const r of (data ?? []) as { status: string }[]) counts.set(r.status, (counts.get(r.status) ?? 0) + 1)
    const total = [...counts.values()].reduce((a, b) => a + b, 0)
    if (!total) return { intent, cards: [{ type: 'text', text: 'Your tracker is empty.' }, { type: 'link', label: 'Find a role to track', href: '/today' }] }
    const words = ['saved', 'applying', 'applied', 'interviewing', 'offer', 'rejected', 'closed'].filter((k) => counts.get(k)).map((k) => `${counts.get(k)} ${k === 'closed' ? 'archived' : k}`)
    return { intent, cards: [{ type: 'stat', label: 'On your tracker', value: total.toLocaleString('en-IN'), note: words.join(' · ') }, { type: 'link', label: 'Open the tracker', href: '/applications' }] }
  }

  if (intent === 'remote') {
    const { rows } = await topScored(userId, 5, (q) => (q as unknown as { filter: (c: string, o: string, v: string) => unknown }).filter('score_breakdown->>location', 'eq', 'remote'))
    if (!rows.length) return { intent, cards: [{ type: 'text', text: 'None of the roles scored for you read as remote.' }] }
    return { intent, cards: [rolesCard('Your highest-scoring remote roles', rows, '/today?remote=1')] }
  }

  // pay: of your 60 highest scores, those whose employer or posting states a figure.
  const { rows } = await topScored(userId, 60)
  const ids = rows.map((r) => r.role_id)
  const [paid, facts] = await Promise.all([readStatedPays(ids), readRoleFacts(ids)])
  const withPay = rows.filter((r) => paid.has(r.role_id)).sort((a, b) => (paid.get(b.role_id) ?? 0) - (paid.get(a.role_id) ?? 0))
  if (!withPay.length) return { intent, cards: [{ type: 'text', text: 'None of your 60 highest-scoring roles states pay in rupees. Few Indian postings do — about 1 in 40 — and Jobinko never estimates one.' }] }
  const items = withPay.slice(0, 5).map((r) => {
    const row = facts.facts.get(r.role_id)
    return { ...toItem(r), note: (row ? payFromRow(row)?.text : null) ?? `₹${((paid.get(r.role_id) ?? 0) / 100_000).toFixed(1).replace(/\.0$/, '')} LPA` }
  })
  return { intent, cards: [{ type: 'roles', title: 'Among your 60 highest scores, these state pay', items, href: '/today?sort=pay', more: withPay.length > 5 ? `and ${withPay.length - 5} more` : undefined }] }
}

// ---------------------------------------------------------------------- facts

export async function readMissionFacts(userId: string): Promise<MissionFacts> {
  const supabase = await createClient()
  const [resumes, apps, connections, alerts, profile, prefs] = await Promise.all([
    listResumes(userId).catch(() => []),
    supabase.from('applications').select('status').limit(1000),
    countConnections(userId),
    supabase.from('profiles').select('alert_settings').eq('id', userId).maybeSingle(),
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    readPreferences(userId),
  ])
  const rows = ((apps.data ?? []) as { status: string }[])
  const p = (profile.data ?? {}) as Record<string, unknown>
  const health = profileHealth({
    currentTitle: p.current_title as string | null, employer: p.employer as string | null,
    yearsExperience: p.years_experience === null || p.years_experience === undefined ? null : Number(p.years_experience),
    city: p.city as string | null, preferredRole: p.preferred_role as string | null,
    extraRoles: ((p.preferred_roles as string[] | null) ?? []).filter((r) => r.toLowerCase() !== String(p.preferred_role ?? '').toLowerCase()),
    skills: (p.skills as string[] | null) ?? [], workMode: p.work_mode_preference as string | null,
    seniority: prefs.seniority, salaryMin: prefs.salaryMin,
  })
  return {
    hasSavedResume: resumes.length > 0,
    profileHealth: health.score,
    tracked: rows.length,
    applied: rows.filter((r) => ['applied', 'interviewing', 'offer'].includes(r.status)).length,
    connections,
    alertsSet: alerts.error ? null : (alerts.data as { alert_settings: unknown } | null)?.alert_settings != null,
  }
}

export async function readProactiveFacts(userId: string): Promise<ProactiveFacts> {
  const supabase = await createClient()
  const [fresh, due, closed] = await Promise.all([
    newThisWeek(userId),
    supabase.from('applications').select('status').lte('follow_up_on', istDay()).neq('status', 'closed').limit(200),
    supabase.from('applications').select('status').not('role_closed_at', 'is', null).limit(200),
  ])
  const live = (rows: { status: string }[] | null) => (rows ?? []).filter((r) => r.status !== 'rejected' && r.status !== 'closed').length
  return {
    newStrong: fresh.filter((r) => (r.score ?? 0) >= HIGH_PRECISION_MIN).length,
    followupsDue: live(due.data as { status: string }[] | null),
    closedTracked: closed.error ? null : live(closed.data as { status: string }[] | null),
  }
}

