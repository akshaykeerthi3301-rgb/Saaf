import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

/**
 * ⚠️ THE DISALLOW LIST IS NOT SECURITY — RLS AND src/proxy.ts ARE. Nothing here
 * protects anything; a crawler that ignores this file gets exactly what any
 * signed-out visitor gets, which is a redirect. It exists so crawl budget goes
 * to the pages that can actually rank instead of being spent on redirects.
 *
 * /api is disallowed with one deliberate exception in mind: /api/audit/today is
 * public by design, but it is JSON with no ranking value, so it stays out.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/today', '/applications', '/resume', '/copilot', '/profile', '/start', '/dev'],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
