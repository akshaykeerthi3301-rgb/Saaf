import type { Metadata } from 'next'
import { Public_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { AnalyticsProvider } from '@/components/features/analytics-provider'

/**
 * Self-hosted at build time by next/font — no request reaches Google from a
 * visitor's browser. That matters for this product specifically: the third
 * guarantee is "nothing shared about your search", and a font CDN request from
 * a job-search page is exactly the kind of leak that promise rules out.
 */
const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-public-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Saaf',
  description: 'A daily shortlist of roles you can actually get, ranked by honest odds.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${publicSans.variable} ${jetbrainsMono.variable}`}>
      <body>
        <AnalyticsProvider />
        {children}
      </body>
    </html>
  )
}
