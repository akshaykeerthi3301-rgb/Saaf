/** One role, normalised out of whichever ATS returned it. */
export type NormalisedRole = {
  externalId: string
  title: string
  locationRaw: string
  description: string
  applyUrl: string
  postedAt: string | null
}

export type Provider =
  | 'greenhouse' | 'lever' | 'ashby' | 'workable' | 'recruitee' | 'smartrecruiters'

export type Adapter = {
  provider: Provider
  /** The public, zero-auth endpoint for a board. */
  url: (token: string) => string
  /** Provider payload → normalised roles. Shapes genuinely differ per provider. */
  parse: (raw: unknown, token: string) => NormalisedRole[]
}

export const USER_AGENT =
  'saaf-job-shortlist/0.1 (+https://saaf.vercel.app; contact via the site)'

/**
 * ATS descriptions arrive as HTML, sometimes escaped. Unescape BEFORE stripping
 * tags — doing it the other way round turns &lt;li&gt; into a real <li> that
 * then survives into the "text".
 */
export function toText(html: string): string {
  return html
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const s = (v: unknown): string => (v == null ? '' : String(v))
export const str = s
