import { lookup } from 'node:dns/promises'
import { createClient } from '@/lib/supabase/server'
import { displayEmployer } from '@/lib/display-names'
import { isPrivateAddress, parseJobHtml, refusedHost, type JobFromPage } from '@/lib/job-link'

/**
 * Title and company for a pasted job link: our own index first, then the page.
 *
 * ⚠️ A SERVER FETCHING A URL A USER TYPED IS THE TEXTBOOK SSRF (server-side
 * request forgery) SHAPE, so the fetch is fenced: https only, standard port,
 * every address the hostname resolves to must be public, redirects are
 * followed by hand (at most 3) and each hop is re-checked, 5 s timeout, 1.5 MB
 * cap, HTML only. Only two short strings ever leave this function.
 *
 * Known residual: DNS can change between our lookup and fetch's own
 * (rebinding). What an attacker could learn that way is the <title> of an
 * internal page; on Vercel's serverless network there is little behind it.
 * The caller is also signed in and rate-limited.
 */

export type JobLinkResult =
  | { ok: true; job: JobFromPage; source: 'index' | 'page' }
  | { ok: false; reason: string }

const MAX_BYTES = 1_500_000
const TIMEOUT_MS = 5000

async function publicHttpsUrl(raw: string): Promise<URL | string> {
  let u: URL
  try { u = new URL(raw) } catch { return 'That is not a link we can read.' }
  if (u.protocol !== 'https:') return 'Only https:// links can be read.'
  if (u.port && u.port !== '443') return 'That link uses an unusual port, so we will not fetch it.'
  if (u.username || u.password) return 'That link carries a login, so we will not fetch it.'
  if (refusedHost(u.hostname)) return 'We do not read LinkedIn, Naukri or other job-board pages — their terms forbid it. Type the company and title instead.'
  try {
    const addrs = await lookup(u.hostname, { all: true })
    if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) return 'That link does not point to a public website.'
  } catch {
    return 'That website could not be found.'
  }
  return u
}

async function fetchPage(raw: string): Promise<string | { error: string }> {
  let current = raw
  for (let hop = 0; hop <= 3; hop++) {
    const checked = await publicHttpsUrl(current)
    if (typeof checked === 'string') return { error: checked }
    const res = await fetch(checked, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'JobinkoBot/1.0 (+job tracker link preview)', accept: 'text/html' },
    }).catch(() => null)
    if (!res) return { error: 'That page did not answer in time.' }
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('location')
      if (!next) return { error: 'That page redirected nowhere.' }
      current = new URL(next, checked).toString()
      continue
    }
    if (!res.ok) return { error: 'That page could not be opened.' }
    if (!(res.headers.get('content-type') ?? '').includes('html')) return { error: 'That link is not a web page.' }

    // Read at most MAX_BYTES; a posting page is tens of kilobytes.
    const reader = res.body?.getReader()
    if (!reader) return { error: 'That page was empty.' }
    const chunks: Uint8Array[] = []
    let size = 0
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      size += value.byteLength
    }
    await reader.cancel().catch(() => {})
    return new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))).subarray(0, MAX_BYTES))
  }
  return { error: 'That link redirected too many times.' }
}

export async function readJobFromLink(url: string): Promise<JobLinkResult> {
  // Our index first: no fetch at all, and the company name is our cleaned one.
  const supabase = await createClient()
  const { data } = await supabase.from('roles').select('title, company_name').eq('apply_url', url).limit(1).maybeSingle()
  const row = data as { title: string; company_name: string | null } | null
  if (row) return { ok: true, job: { title: row.title, company: displayEmployer(row.company_name) }, source: 'index' }

  const page = await fetchPage(url)
  if (typeof page !== 'string') return { ok: false, reason: page.error }
  const job = parseJobHtml(page)
  if (!job.title && !job.company) return { ok: false, reason: 'That page did not say what the job is. Type it in.' }
  return { ok: true, job, source: 'page' }
}
