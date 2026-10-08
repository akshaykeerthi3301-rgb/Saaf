import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RoleSeoPage } from '@/components/features/role-seo-page'
import { readRolePage } from '@/lib/services/public-jobs'
import { isIndexable, pageTitle, roleFromSlug } from '@/lib/seo-pages'

/**
 * /roles/<role> — "Product Manager jobs in India" (F-1203, TASK-158). The slug must be one of Jobinko's own
 * roles (src/lib/taxonomy/roles.ts) or the page is a 404, so no URL can invent a page. Built on first
 * request and refreshed hourly. A page under the thin-content threshold is `noindex`.
 */
export const revalidate = 3600
export const dynamicParams = true
export function generateStaticParams() { return [] }

type Props = { params: Promise<{ role: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const role = roleFromSlug((await params).role)
  if (!role) return { title: 'Not found | Jobinko', robots: { index: false } }
  const data = await readRolePage(role, null)
  return {
    title: pageTitle(role, null, data.total),
    description: `${data.total.toLocaleString('en-IN')} open ${role} roles in India from company career pages, newest first. Sign in free to see how each fits your résumé.`,
    alternates: { canonical: `/roles/${(await params).role}` },
    robots: isIndexable(data.total) ? undefined : { index: false, follow: true },
  }
}

export default async function RolePage({ params }: Props) {
  const role = roleFromSlug((await params).role)
  if (!role) notFound()
  return <RoleSeoPage role={role} city={null} data={await readRolePage(role, null)} />
}
