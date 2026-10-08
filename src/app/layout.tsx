import type { Metadata } from 'next'
import { Public_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { AnalyticsProvider } from '@/components/features/analytics-provider'
import { siteUrl } from '@/lib/site'

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
  /**
   * ⚠️ REQUIRED FOR THE SOCIAL CARD TO RESOLVE. Open Graph URLs must be
   * absolute; without metadataBase, Next emits relative ones and every
   * WhatsApp or LinkedIn share renders as bare text. Resolved from the same
   * chain as the sitemap — see src/lib/site.ts.
   */
  metadataBase: new URL(siteUrl()),
  // Tracks the <h1> on the landing page. They drifted apart once already —
  // the hero changed and this did not — and the title is what a share card and
  // a search result show, so it is the half more people see.
  title: 'Jobinko — AI career copilot for India',
  description:
    'Roles ranked against your résumé, with the arithmetic behind every score shown. Free ATS résumé checker, no account needed.',
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
    // `dark` is the shipped system since 2026-09-23 — see the .dark block in globals.css.
    <html lang="en" className={`dark ${publicSans.variable} ${jetbrainsMono.variable}`}>
      <body>
        <AnalyticsProvider />
        {children}
      </body>
    </html>
  )
}
