import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'
import { listPublicJobsForSitemap } from '@/lib/services/public-jobs'

/**
 * Every public URL, and nothing else.
 *
 * ⚠️ SIGNED-IN ROUTES ARE DELIBERATELY ABSENT. /today, /applications, /resume,
 * /copilot and /profile are behind auth and personal to one candidate; listing
 * them invites a crawler to spend its budget on pages it will only ever be
 * redirected away from. /start is excluded for the same reason.
 *
 * The tools are listed FIRST and weighted highest because they are the pages
 * this product needs to rank — see the acquisition note in
 * src/app/(marketing)/tools/ats-checker/page.tsx.
 *
 * Public job pages were added 2026-09-25 (founder decision, PROJECT-STATE
 * Stage AF): the newest 5,000 roles in India. Rebuilt daily, after the ingest.
 */
export const revalidate = 86400

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const now = new Date()
  // A sitemap that fails to build is worse than one without jobs: the tools
  // must stay listed even if the database is unreachable at build time.
  const jobs = await listPublicJobsForSitemap(5000).catch((e: unknown) => {
    // Loud, not silent: a sitemap without jobs looks fine to everyone but Google.
    console.error('sitemap: job pages left out — database unreachable at build/revalidate', e)
    return []
  })

  return [
    { url: `${base}/tools/ats-checker`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/tools/paste-jd`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/tools`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    // Updated by the daily cron, so it genuinely changes daily — unlike the rest.
    { url: `${base}/audit`, lastModified: now, changeFrequency: 'daily', priority: 0.5 },
    { url: `${base}/extension`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    ...jobs.map((j) => ({ url: `${base}/jobs/${j.id}`, lastModified: new Date(j.lastSeenAt), changeFrequency: 'daily' as const, priority: 0.6 })),
  ]
}
