import type { MetadataRoute } from 'next'

/**
 * The web app manifest — what makes Jobinko installable to a phone's home screen or a
 * desktop app window (F-1111, TASK-201). It only describes the site; it adds no
 * offline mode and no background work. `start_url` is the feed, which sends a signed-out
 * visitor to sign in like any other visit.
 *
 * Colours are the light theme's --background, oklch(0.975 0.006 250) ≈ #F4F7FB (the default
 * since 2026-11-10). They are literals because a manifest cannot read CSS.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Jobinko',
    short_name: 'Jobinko',
    description: 'Job matches with the arithmetic shown.',
    start_url: '/today',
    scope: '/',
    display: 'standalone',
    background_color: '#F4F7FB',
    theme_color: '#F4F7FB',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
