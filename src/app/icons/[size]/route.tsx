import { appIcon } from '@/lib/og-card'

/** The home-screen icon at the two sizes an installable app needs. Only 192 and 512 are served; anything else is a 404. */
const SIZES = new Set([192, 512])

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const size = Number((await ctx.params).size)
  if (!SIZES.has(size)) return new Response('Not found', { status: 404 })
  return appIcon(size)
}
