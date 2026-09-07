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
  | 'workday'

export type Adapter = {
  provider: Provider
  /** The public, zero-auth endpoint for a board. */
  url: (token: string) => string
  /** Provider payload → normalised roles. Shapes genuinely differ per provider. */
  parse: (raw: unknown, token: string) => NormalisedRole[]

  /**
   * Some providers' list endpoints carry no job body, so the description has
   * to be fetched per posting. Declaring these two makes the ingest run do it;
   * SmartRecruiters' adapter previously carried a comment saying ingest
   * "fetches detail separately" when nothing ever did, and every one of its 91
   * roles sat in the index with an empty description — 15% of the whole index
   * scored on its title alone, with no experience floor to read.
   */
  detailUrl?: (token: string, externalId: string) => string
  /** Detail payload → the description text. */
  parseDetail?: (raw: unknown) => string

  /**
   * For a provider whose listing is not one GET.
   *
   * The five original adapters are a single GET returning every posting.
   * Workday's is a POST carrying a JSON body, capped at 20 results a page
   * (measured — 50 and 100 both return nothing), so it has to page. When this
   * is present the ingest calls it instead of `url` + `parse`.
   */
  fetchAll?: (token: string) => Promise<NormalisedRole[]>
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
    // Numeric entities, decimal and hex. SmartRecruiters emits &#xa0; rather
    // than &nbsp; throughout, and it survived into stored descriptions where
    // it splits words the extractor is trying to read.
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const s = (v: unknown): string => (v == null ? '' : String(v))
export const str = s
