import type { MetadataRoute } from 'next'

/**
 * The web app manifest — what makes Saaf installable to a phone's home screen or a
 * desktop app window (F-1111, TASK-201). It only describes the site; it adds no
 * offline mode and no background work. `start_url` is the feed, which sends a signed-out
 * visitor to sign in like any other visit.
 *
 * Colours are the dark theme's own: --background is oklch(0.141 …) ≈ #0b0b12 and the brand
 * is the indigo the whole app uses. They are literals because a manifest cannot read CSS.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Saaf',
    short_name: 'Saaf',
    description: 'Job matches with the arithmetic shown.',
    start_url: '/today',
    scope: '/',
    display: 'standalone',
    background_color: '#0b0b12',
    theme_color: '#0b0b12',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
