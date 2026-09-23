/** One role, normalised out of whichever ATS returned it. */
export type NormalisedRole = {
  externalId: string
  title: string
  locationRaw: string
  description: string
  applyUrl: string
  postedAt: string | null
}

/**
 * What one board fetch returned, and whether it is the WHOLE board.
 *
 * ⚠️ `complete` IS LOAD-BEARING, NOT INFORMATIONAL. ingest/run.ts prunes only
 * boards that came back complete, and skips the active/inactive judgement for
 * ones that did not. A paging adapter that times out on page 3 has seen 40 of
 * 400 postings; upserting that as if it were the board's full list made the
 * other 360 stop being refreshed, and the 30-day prune then deleted them.
 * See docs/CONFLICTS.md F2.
 */
export type FetchResult = { roles: NormalisedRole[]; complete: boolean }

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
   * Detail payload → the posting date, for a provider whose listing has none.
   * Workday's listing says only "Posted 30+ Days Ago"; its detail call carries
   * `startDate`. Measured 2026-09-23: 10,378 Workday roles, 0 with a date.
   */
  parseDetailPostedAt?: (raw: unknown) => string | null

  /**
   * For a provider whose listing is not one GET.
   *
   * The five original adapters are a single GET returning every posting.
   * Workday's is a POST carrying a JSON body, capped at 20 results a page
   * (measured — 50 and 100 both return nothing), so it has to page. When this
   * is present the ingest calls it instead of `url` + `parse`.
   *
   * It must report `complete` honestly: true only when it reached the end of
   * the listing, false when it stopped on its own page cap. See FetchResult.
   *
   * `deadline` is an epoch-ms instant after which the adapter should stop
   * paging and return what it has, with `complete: false`. It exists because a
   * large Workday tenant can page for longer than the whole cron budget, and a
   * board that never finishes is never stamped `last_ingested_at` — so it
   * sorts first again next run and blocks the rotation behind it forever.
   * Stopping early is safe precisely because `complete: false` is honest.
   */
  fetchAll?: (token: string, opts?: { deadline?: number }) => Promise<FetchResult>
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
