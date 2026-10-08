import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card'

export const alt = 'Jobinko — precision job matching for India, with the arithmetic shown'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image() {
  return ogCard({
    headline: 'Roles that fit, with the arithmetic shown.',
    sub: 'Precision job matching for India. No spam. Free to use.',
  })
}
