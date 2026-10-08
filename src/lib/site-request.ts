/**
 * "Ask Saaf to support this site" (F-714, TASK-192): which hostnames may be filed.
 * Only a hostname ever travels — never a URL, path or page content. Mirrors the CHECK in
 * migration 0047; the extension's popup applies the same shape before it stores anything.
 */
const HOST = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/

/** Sites that are excluded on purpose (extension/README.md), and Saaf itself. A request for one would be noise. */
const NEVER = [/(^|\.)linkedin\.com$/, /(^|\.)naukri\.com$/, /(^|\.)saaf-ten\.vercel\.app$/, /(^|\.)jobinko\.in$/]

/** The hostname to file, or null when it is not one worth filing. */
export function cleanHost(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const h = raw.trim().toLowerCase().replace(/\.$/, '')
  if (h.length < 4 || h.length > 120 || !HOST.test(h)) return null
  if (NEVER.some((re) => re.test(h))) return null
  return h
}
