import { createClient } from '@/lib/supabase/server'

/**
 * Reads for the workspace shell and the preference/record fields added in
 * migration 0028.
 *
 * ⚠️ EVERY READ OF A 0028 COLUMN FALLS BACK, AND THAT IS THE POINT OF THIS
 * FILE. Migrations are applied by hand in the Supabase SQL editor, so there is
 * a window where this code is deployed and the columns do not exist. A select
 * naming a missing column fails the WHOLE query — which on /today would read
 * as "no profile" and redirect a confirmed candidate back to onboarding. So the
 * new columns are read on their own, and an error means "not stored yet", not
 * "not there".
 *
 * Runs on the caller's client: RLS ("own profile") is the security, the .eq()
 * filters are for correctness.
 */

export type SearchStatus = 'active' | 'open' | 'closed'
export type Seniority = 'entry' | 'mid' | 'senior' | 'lead' | 'executive'
export type Currency = 'INR' | 'USD' | 'EUR'

export type AccountSummary = {
  email: string
  name: string | null
  initials: string
  status: SearchStatus
  /** False until migration 0028 is applied; the toggle says so rather than failing silently. */
  statusStored: boolean
}

export type Preferences = {
  seniority: Seniority | null
  targetCities: string[]
  salaryMin: number | null
  salaryCurrency: Currency
  /** False until migration 0028 is applied. */
  stored: boolean
}

function initialsOf(name: string | null, email: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (email || 'you').slice(0, 2).toUpperCase()
}

export async function readAccountSummary(userId: string, email: string): Promise<AccountSummary> {
  const supabase = await createClient()
  const [{ data: base }, extra] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    supabase.from('profiles').select('search_status').eq('id', userId).maybeSingle(),
  ])
  const name = (base as { full_name: string | null } | null)?.full_name ?? null
  const status = (extra.data as { search_status: SearchStatus | null } | null)?.search_status ?? 'active'
  return { email, name, initials: initialsOf(name, email), status, statusStored: !extra.error }
}

export async function readPreferences(userId: string): Promise<Preferences> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('seniority, target_cities, salary_min, salary_currency')
    .eq('id', userId)
    .maybeSingle()
  const row = data as {
    seniority: Seniority | null
    target_cities: string[] | null
    salary_min: number | null
    salary_currency: Currency | null
  } | null
  return {
    seniority: row?.seniority ?? null,
    targetCities: row?.target_cities ?? [],
    salaryMin: row?.salary_min ?? null,
    salaryCurrency: row?.salary_currency ?? 'INR',
    stored: !error,
  }
}

/** The 0028 fields of an application record, keyed by application id. */
export type ApplicationRecord = {
  appliedOn: string | null
  resumeVersion: string | null
  salaryNote: string | null
  interviewOn: string | null
  statusChangedAt: string | null
}

export async function readApplicationRecords(): Promise<{ records: Map<string, ApplicationRecord>; stored: boolean }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('applications')
    .select('id, applied_on, resume_version, salary_note, interview_on, status_changed_at')
  const records = new Map<string, ApplicationRecord>()
  type Row = {
    id: string
    applied_on: string | null
    resume_version: string | null
    salary_note: string | null
    interview_on: string | null
    status_changed_at: string | null
  }
  for (const r of (data ?? []) as unknown as Row[]) {
    records.set(r.id, {
      appliedOn: r.applied_on,
      resumeVersion: r.resume_version,
      salaryNote: r.salary_note,
      interviewOn: r.interview_on,
      statusChangedAt: r.status_changed_at,
    })
  }
  return { records, stored: !error }
}

/** The 0035 signals of an application, keyed by application id. */
export type TrackerSignal = { appliedVia: string | null; roleClosedAt: string | null }

/** Its own query: an unknown column fails a whole select, and the board must still load without 0035. */
export async function readTrackerSignals(): Promise<Map<string, TrackerSignal>> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('applications').select('id, applied_via, role_closed_at')
  const out = new Map<string, TrackerSignal>()
  if (error) return out
  for (const r of (data ?? []) as unknown as { id: string; applied_via: string | null; role_closed_at: string | null }[]) {
    out.set(r.id, { appliedVia: r.applied_via, roleClosedAt: r.role_closed_at })
  }
  return out
}

/**
 * role_id → tracker stage, for every indexed role the candidate has tracked.
 * The feed and the job panel read it so a card says "On tracker · Applied"
 * instead of offering to save a role that is already three stages along.
 */
export async function readTrackedStatuses(roleIds?: string[]): Promise<Map<string, string>> {
  const supabase = await createClient()
  let query = supabase.from('applications').select('role_id, status').not('role_id', 'is', null)
  if (roleIds) {
    if (!roleIds.length) return new Map()
    query = query.in('role_id', roleIds.slice(0, 200))
  }
  const { data } = await query
  return new Map(((data ?? []) as { role_id: string; status: string }[]).map((r) => [r.role_id, r.status]))
}

/** How many roles were scored for the candidate, and how many high-precision. */
export async function countMatches(userId: string, strongMin: number): Promise<{ matched: number; strong: number }> {
  const supabase = await createClient()
  const [all, strong] = await Promise.all([
    supabase.from('gate_results').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('gate_results').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('score', strongMin),
  ])
  return { matched: all.count ?? 0, strong: strong.count ?? 0 }
}

/** The sidebar's job-search status. False when migration 0028 is missing. */
export async function writeSearchStatus(userId: string, status: SearchStatus): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ search_status: status, updated_at: new Date().toISOString() })
    .eq('id', userId)
  return { ok: !error }
}

/**
 * The preference matrix. Work mode is an existing column (0009) and is written
 * on its own, so it saves even while 0028 is unapplied; the 0028 fields follow.
 */
export async function writePreferences(userId: string, p: {
  seniority: Seniority | null
  targetCities: string[]
  salaryMin: number | null
  salaryCurrency: Currency
  workMode?: 'remote' | 'hybrid' | 'onsite' | 'no_preference'
}): Promise<{ ok: true } | { ok: false; which: 'work-mode' | 'preferences' }> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  if (p.workMode) {
    const { error } = await supabase.from('profiles').update({ work_mode_preference: p.workMode, updated_at: now }).eq('id', userId)
    if (error) return { ok: false, which: 'work-mode' }
  }
  const { error } = await supabase
    .from('profiles')
    .update({
      seniority: p.seniority,
      target_cities: [...new Set(p.targetCities)],
      salary_min: p.salaryMin,
      salary_currency: p.salaryCurrency,
      updated_at: now,
    })
    .eq('id', userId)
  return error ? { ok: false, which: 'preferences' } : { ok: true }
}
