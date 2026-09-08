import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card'

export const alt = 'Free resume and job search tools — no sign-up'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image() {
  return ogCard({
    headline: 'Two free tools. No account.',
    sub: 'Check your résumé’s ATS score, and score any posting against it.',
  })
}
