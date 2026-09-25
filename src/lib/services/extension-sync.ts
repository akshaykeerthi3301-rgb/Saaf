import { createClient } from '@/lib/supabase/server'

/**
 * The web app's half of the extension bridge (2026-09-25, Jobright parity).
 *
 * The extension holds no session by design — it never signs in and never
 * writes to our database. So the bridge runs the other way: the signed-in web
 * app, on the candidate's own browser, pushes profile fields INTO the extension
 * and collects the roles the extension queued on job sites. Every read and
 * write here runs on the caller's client under RLS; the actions re-authenticate
 * before calling any of it.
 */

type Stage = 'saved' | 'applying' | 'applied' | 'interviewing' | 'offer' | 'closed'

/** What the extension's form filler may hold. Salary and yes/no answers are not here — the web app does not collect them. */
export type ExtensionProfile = {
  fullName: string
  email: string
  phone: string
  city: string
  preferredLocations: string
  currentTitle: string
  currentEmployer: string
  yearsExperience: string
  noticePeriod: string
  workAuth: string
  linkedin: string
  portfolio: string
}

export type ExtensionSync = {
  profile: ExtensionProfile
  resumeText: string
  tracked: { url: string; status: Stage }[]
}

type ProfileRow = {
  full_name: string | null
  phone: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  notice_period: string | null
  current_title: string | null
  employer: string | null
  years_experience: number | null
  city: string | null
  work_authorisation: string | null
  target_cities: string[] | null
}

/** Same page, ignoring query, hash and a trailing slash — the extension uses the same rule. */
export function pageKey(url: string): string {
  try {
    const u = new URL(url)
    return u.origin + u.pathname.replace(/\/+$/, '')
  } catch {
    return url
  }
}

export async function readExtensionSync(userId: string, email: string): Promise<ExtensionSync> {
  const supabase = await createClient()
  const [{ data: p }, { data: doc }, { data: apps }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, phone, linkedin_url, portfolio_url, notice_period, current_title, employer, years_experience, city, work_authorisation, target_cities')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('resume_documents')
      .select('body')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('applications').select('apply_url, status').not('apply_url', 'is', null).limit(500),
  ])
  const row = (p as unknown as ProfileRow | null)
  const s = (v: string | number | null | undefined) => (v == null ? '' : String(v))
  return {
    profile: {
      fullName: s(row?.full_name),
      email,
      phone: s(row?.phone),
      city: s(row?.city),
      preferredLocations: (row?.target_cities ?? []).join(', '),
      currentTitle: s(row?.current_title),
      currentEmployer: s(row?.employer),
      yearsExperience: s(row?.years_experience),
      noticePeriod: s(row?.notice_period),
      workAuth: s(row?.work_authorisation),
      linkedin: s(row?.linkedin_url),
      portfolio: s(row?.portfolio_url),
    },
    resumeText: s((doc as { body: string | null } | null)?.body),
    tracked: ((apps ?? []) as unknown as { apply_url: string; status: Stage }[])
      .map((a) => ({ url: a.apply_url, status: a.status })),
  }
}

export type QueuedRole = { url: string; title: string; company: string; status: 'saved' | 'applying' }

/**
 * File the roles the extension queued. Returns the urls handled — filed,
 * promoted, or already on the board — so the extension can drop them.
 *
 * ⚠️ DEDUPED BY PAGE, NOT BY INSERT. A hand-added role has no role_id, so the
 * (user_id, role_id) unique index does not cover it and a plain insert would
 * file the same posting twice every time the queue drained twice. A queued
 * "applying" promotes a Saved card and never drags a later-stage card back.
 */
export async function fileQueuedRoles(userId: string, items: QueuedRole[]): Promise<{ handled: string[]; filed: number }> {
  const supabase = await createClient()
  const { data } = await supabase.from('applications').select('id, apply_url, status').not('apply_url', 'is', null)
  const existing = new Map<string, { id: string; status: Stage }>()
  for (const r of (data ?? []) as unknown as { id: string; apply_url: string; status: Stage }[]) {
    existing.set(pageKey(r.apply_url), { id: r.id, status: r.status })
  }

  const handled: string[] = []
  let filed = 0
  const now = new Date().toISOString()
  for (const item of items) {
    const key = pageKey(item.url)
    const have = existing.get(key)
    if (have) {
      if (item.status === 'applying' && have.status === 'saved') {
        const { error } = await supabase
          .from('applications')
          .update({ status: 'applying', updated_at: now, status_changed_at: now })
          .eq('id', have.id)
        if (error) continue
        have.status = 'applying'
      }
      handled.push(item.url)
      continue
    }
    const { error } = await supabase.from('applications').insert({
      user_id: userId,
      role_id: null,
      company: item.company,
      title: item.title,
      apply_url: item.url,
      status: item.status,
    })
    if (error) continue
    existing.set(key, { id: '', status: item.status })
    handled.push(item.url)
    filed++
  }
  return { handled, filed }
}
