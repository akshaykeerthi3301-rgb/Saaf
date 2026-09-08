import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card'

export const alt = 'Check your ATS resume score, free'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image() {
  return ogCard({
    headline: 'Check your ATS resume score.',
    sub: 'See what a parser actually reads out of your résumé — and the line causing each problem.',
  })
}
