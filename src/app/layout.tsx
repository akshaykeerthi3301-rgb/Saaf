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

/** `saaf.theme` is 'light' | 'dark' when chosen, absent for auto. Kept tiny: it blocks first paint. */
const THEME_SCRIPT = `try{var t=localStorage.getItem('saaf.theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Light is the default; `dark` is added before first paint by the script
    // below when the device asks for it or the candidate chose it (ThemeToggle).
    // suppressHydrationWarning covers exactly that one class.
    <html lang="en" suppressHydrationWarning className={`${publicSans.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Inline and blocking on purpose: a deferred script would paint the
            light palette first and flash on every dark-mode load. ⚠️ The CSP in
            next.config.ts is report-only today; enforcing it needs this
            script's hash (or a nonce) added to script-src. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <AnalyticsProvider />
        {children}
      </body>
    </html>
  )
}
