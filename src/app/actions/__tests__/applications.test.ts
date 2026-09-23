import { describe, it, expect, vi } from 'vitest'

/**
 * The tracker stored whatever z.string().url() accepted, which is any scheme
 * (docs/QA-AUDIT.md QA-16). Validation runs before the session is read, so a
 * refused link never reaches the database — the fake client below would throw
 * if it were touched.
 */
const touched = vi.hoisted(() => ({ db: false }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => {
    touched.db = true
    throw new Error('the database must not be reached for a refused link')
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))

const { trackRole } = await import('../applications')

describe('trackRole — links are web links', () => {
  it.each(['javascript:alert(document.domain)', 'data:text/html,<script>1</script>', 'ftp://example.com/job'])(
    'refuses %s without touching the database',
    async (applyUrl) => {
      touched.db = false
      const res = await trackRole({ company: 'QA', title: 'QA', applyUrl })
      expect(res.ok).toBe(false)
      expect(touched.db).toBe(false)
    },
  )
})
