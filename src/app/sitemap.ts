import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

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
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  const now = new Date()

  return [
    { url: `${base}/tools/ats-checker`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/tools/paste-jd`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/tools`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    // Updated by the daily cron, so it genuinely changes daily — unlike the rest.
    { url: `${base}/audit`, lastModified: now, changeFrequency: 'daily', priority: 0.5 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
