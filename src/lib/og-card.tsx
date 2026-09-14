import { ImageResponse } from 'next/og'

/**
 * The shared social card, rendered by next/og.
 *
 * ⚠️ ONE RENDERER, THREE ROUTES, BECAUSE NEXT DOES NOT INHERIT THE WAY IT LOOKS
 * LIKE IT DOES. A root `opengraph-image.tsx` applies only to routes that do not
 * declare their own `openGraph` metadata. Both tool pages declare one — for the
 * title and canonical URL — and that silently DROPPED the inherited image.
 * Observed on 2026-09-08: the landing page emitted og:image and
 * /tools/ats-checker, the page the whole acquisition thesis rests on, emitted
 * none. A missing card is invisible in every check except looking at the meta
 * tag, and it is the one thing a WhatsApp forward actually shows.
 *
 * ⚠️ COLOURS ARE LITERAL HERE, AND ONLY IN SATORI SURFACES. Satori resolves no
 * CSS variables and no Tailwind — inline styles only — so design tokens cannot
 * reach it. These are the light theme's --background, --primary, --accent and
 * --muted-foreground from globals.css, as hex. src/app/__tests__/theme-tokens.test.ts
 * exempts this path deliberately and pins the exemption so it cannot widen.
 */
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

export function ogCard({ headline, sub }: { headline: string; sub: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#F1F4F8',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: '#28304A',
              color: '#F1F4F8',
              fontSize: '30px',
              fontWeight: 600,
            }}
          >
            S
          </div>
          <div style={{ fontSize: '30px', fontWeight: 600, color: '#28304A', letterSpacing: '-0.02em' }}>
            Saaf
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '68px',
              fontWeight: 600,
              color: '#28304A',
              letterSpacing: '-0.045em',
              lineHeight: 1.05,
            }}
          >
            {headline}
          </div>
          <div style={{ fontSize: '32px', color: '#6E7689', marginTop: '24px', lineHeight: 1.35 }}>
            {sub}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '9999px', backgroundColor: '#12876A' }} />
          <div style={{ fontSize: '26px', color: '#12876A', fontWeight: 600 }}>
            Free · No sign-up · Nothing stored
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  )
}
