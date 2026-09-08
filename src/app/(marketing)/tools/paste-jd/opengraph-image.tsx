import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card'

export const alt = 'Should I apply? Score any job posting against your resume'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image() {
  return ogCard({
    headline: 'Should I apply?',
    sub: 'Paste a posting and your résumé. Get a score that shows its working.',
  })
}
