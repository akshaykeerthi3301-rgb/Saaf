/**
 * Reading a job posting's title and company out of its page — the pure half of
 * "paste a link into the tracker" (2026-09-25, Jobright parity: their tracker
 * parses an external job's details from its link).
 *
 * Pure functions only; the fetch and its network guards live in
 * src/lib/services/job-link.ts so this file is testable without a network.
 */

export type JobFromPage = { title: string; company: string }

/**
 * Boards whose pages we will not fetch, even at a candidate's request. Their
 * terms prohibit automated reading, and the same line is held everywhere else
 * in Saaf (the extension's host list, the ingest). The candidate types these in.
 */
const REFUSED_HOSTS = /(^|\.)(linkedin\.com|naukri\.com|indeed\.[a-z.]+|glassdoor\.[a-z.]+|foundit\.in|instahyre\.com|monsterindia\.com|shine\.com|iimjobs\.com|hirist\.tech|wellfound\.com)$/i

export function refusedHost(hostname: string): boolean {
  return REFUSED_HOSTS.test(hostname)
}

/**
 * True for any address a server-side fetch must never reach: loopback,
 * private ranges, link-local (cloud metadata lives at 169.254.169.254),
 * carrier-grade NAT, and their IPv6 equivalents.
 */
export function isPrivateAddress(ip: string): boolean {
  const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip
  const m = v4.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])]
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  const s = ip.toLowerCase()
  return s === '::' || s === '::1' || /^f[cd]/.test(s) || /^fe[89ab]/.test(s)
}

const decode = (s: string) => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&rsquo;/g, "'").replace(/\s+/g, ' ').trim()

function meta(html: string, prop: string): string {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i')
  const m = html.match(re)
  return m ? decode(m[1] ?? m[2] ?? '') : ''
}

/**
 * Title and company from a posting's HTML: schema.org JobPosting first (the
 * employer's own statement, which Google for Jobs requires), then Open Graph
 * tags, then the <title>. Empty strings where the page says nothing — never a
 * guess.
 */
export function parseJobHtml(html: string): JobFromPage {
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown
    try { data = JSON.parse(m[1]) } catch { continue }
    const found = findPosting(data)
    if (found) {
      const org = found.hiringOrganization
      const company = typeof org === 'string' ? org : (org && typeof org === 'object' && 'name' in org ? String((org as { name: unknown }).name ?? '') : '')
      const title = typeof found.title === 'string' ? found.title : ''
      if (title) return { title: decode(title).slice(0, 300), company: decode(company).slice(0, 200) }
    }
  }
  const ogTitle = meta(html, 'og:title')
  const site = meta(html, 'og:site_name')
  const docTitle = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
  return { title: (ogTitle || docTitle).slice(0, 300), company: site.slice(0, 200) }
}

type Node = { '@type'?: unknown; '@graph'?: unknown; title?: unknown; hiringOrganization?: unknown }

function findPosting(node: unknown): Node | null {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const n of node) { const f = findPosting(n); if (f) return f }
    return null
  }
  const n = node as Node
  const t = n['@type']
  if (t === 'JobPosting' || (Array.isArray(t) && t.includes('JobPosting'))) return n
  return n['@graph'] ? findPosting(n['@graph']) : null
}
