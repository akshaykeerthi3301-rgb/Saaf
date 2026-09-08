/**
 * The canonical origin, resolved once.
 *
 * ⚠️ THE ORDER MATTERS AND MIRRORS ingest/digest.ts's siteUrl(). SITE_URL wins
 * once a real domain exists; VERCEL_PROJECT_PRODUCTION_URL is the stable
 * production hostname and NOT the per-deployment VERCEL_URL, which changes on
 * every deploy and would rot a canonical tag or a sitemap the moment the next
 * one lands. localhost is the local-development fallback.
 *
 * Duplicated rather than imported from ingest/ on purpose: ingest runs under
 * the service role outside the web app's import graph, and an ESLint rule keeps
 * src/ from reaching into it.
 */
export function siteUrl(): string {
  const explicit = process.env.SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3000'
}
