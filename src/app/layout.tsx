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
  title: 'Saaf AI — Precision Career Copilot for India',
  description: 'Find high-precision career matches in India without the application spam.',
  // Real icons from the saaf-ai design export, replacing the Next.js scaffold
  // favicon. icon.svg is the scalable one; the PNGs cover browsers that ignore
  // SVG favicons, and apple-icon covers an iOS home-screen bookmark.
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
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
