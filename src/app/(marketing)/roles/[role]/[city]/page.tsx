import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RoleSeoPage } from '@/components/features/role-seo-page'
import { readRolePage } from '@/lib/services/public-jobs'
import { cityFromSlug, isIndexable, pageTitle, roleFromSlug } from '@/lib/seo-pages'

/** /roles/<role>/<city> — "Product Manager jobs in Pune". Same rules as the role page; both slugs must be Jobinko's own. */
export const revalidate = 3600
export const dynamicParams = true
export function generateStaticParams() { return [] }

type Props = { params: Promise<{ role: string; city: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params
  const role = roleFromSlug(p.role), city = cityFromSlug(p.city)
  if (!role || !city) return { title: 'Not found | Jobinko', robots: { index: false } }
  const data = await readRolePage(role, city)
  return {
    title: pageTitle(role, city, data.total),
    description: `${data.total.toLocaleString('en-IN')} open ${role} roles in ${city.name} from company career pages, newest first. Sign in free to see how each fits your résumé.`,
    alternates: { canonical: `/roles/${p.role}/${p.city}` },
    robots: isIndexable(data.total) ? undefined : { index: false, follow: true },
  }
}

export default async function RoleCityPage({ params }: Props) {
  const p = await params
  const role = roleFromSlug(p.role), city = cityFromSlug(p.city)
  if (!role || !city) notFound()
  return <RoleSeoPage role={role} city={city} data={await readRolePage(role, city)} />
}
