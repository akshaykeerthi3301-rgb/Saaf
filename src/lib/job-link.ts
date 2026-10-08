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
 * in Jobinko (the extension's host list, the ingest). The candidate types these in.
 */
const REFUSED_HOSTS = /(^|\.)(linkedin\.com|naukri\.com|indeed\.[a-z.]+|glassdoor\.[a-z.]+|foundit\.in|instahyre\.com|monsterindia\.com|shine\.com|iimjobs\.com|hirist\.tech|wellfound\.com)$/i

export function refusedHost(hostname: string): boolean {
  return REFUSED_HOSTS.test(hostname)
}

/**
 * True for any address a server-side fetch must never reach: loopback,
 * private ranges, link-local (cloud metadata lives at 169.254.169.254),
 * carrier-grade NAT, reserved and documentation ranges, and their IPv6
 * equivalents — including IPv4 addresses smuggled inside IPv6.
 *
 * ⚠️ HARDENED 2026-09-25 AFTER THE SECURITY REVIEW. The first version read
 * "::ffff:" + dotted quad but not the hex spelling of the same address
 * ("::ffff:7f00:1" is 127.0.0.1), nor NAT64 (64:ff9b::/96) or 6to4 (2002::/16),
 * each of which can route to an internal IPv4 address. Anything this cannot
 * parse is treated as private: refusing is the safe direction.
 */
export function isPrivateAddress(ip: string): boolean {
  const v4 = parseV4(ip)
  if (v4) return privateV4(v4)
  const h = parseV6(ip)
  if (!h) return true
  const zeroPrefix = (n: number) => h.slice(0, n).every((x) => x === 0)
  // ::/128, ::1, IPv4-compatible ::a.b.c.d
  if (zeroPrefix(6)) {
    if (zeroPrefix(7) && (h[7] === 0 || h[7] === 1)) return true
    return privateV4(embedded(h[6], h[7]))
  }
  if (zeroPrefix(5) && h[5] === 0xffff) return privateV4(embedded(h[6], h[7])) // IPv4-mapped
  if (h[0] === 0x64 && h[1] === 0xff9b && h.slice(2, 6).every((x) => x === 0)) return privateV4(embedded(h[6], h[7])) // NAT64
  if (h[0] === 0x2002) return privateV4(embedded(h[1], h[2])) // 6to4
  if ((h[0] & 0xfe00) === 0xfc00) return true // unique local fc00::/7
  if ((h[0] & 0xffc0) === 0xfe80) return true // link-local fe80::/10
  if ((h[0] & 0xff00) === 0xff00) return true // multicast
  if (h[0] === 0x2001 && h[1] === 0x0db8) return true // documentation
  return false
}

function embedded(hi: number, lo: number): number[] {
  return [hi >> 8, hi & 0xff, lo >> 8, lo & 0xff]
}

function parseV4(ip: string): number[] | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return null
  const o = m.slice(1).map(Number)
  return o.every((x) => x <= 255) ? o : null
}

function privateV4([a, b, c]: number[]): boolean {
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    || (a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113)
}

/** Eight 16-bit groups, or null. Handles "::" and a trailing dotted quad. */
function parseV6(raw: string): number[] | null {
  let ip = raw.toLowerCase().replace(/^\[|\]$/g, '').split('%')[0]
  const dotted = ip.match(/(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (dotted) {
    const q = parseV4(dotted[1])
    if (!q) return null
    ip = ip.slice(0, -dotted[1].length) + `${((q[0] << 8) | q[1]).toString(16)}:${((q[2] << 8) | q[3]).toString(16)}`
  }
  const halves = ip.split('::')
  if (halves.length > 2) return null
  const part = (s: string) => (s ? s.split(':') : [])
  const head = part(halves[0]), tail = halves.length === 2 ? part(halves[1]) : []
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return null
  const groups = [...head, ...Array(fill).fill('0'), ...tail]
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null
  return groups.map((g) => parseInt(g, 16))
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
