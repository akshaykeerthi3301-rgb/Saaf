import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { __resetRateLimits } from '@/lib/rate-limit'

/**
 * Résumé parsing was an unauthenticated, unmetered model call
 * (docs/QA-AUDIT.md QA-08). The session and the model are faked; the file is
 * the synthetic fixture read by the real parser.
 */
const state = vi.hoisted(() => ({ user: { id: 'user-1' } as { id: string } | null }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}))

const countMatchingRoles = vi.hoisted(() => vi.fn())
vi.mock('@/lib/services/shortlist', () => ({ countMatchingRoles }))

const readResumeWithModel = vi.hoisted(() => vi.fn())
vi.mock('@/lib/parse/llm', async (original) => ({
  ...(await original<typeof import('@/lib/parse/llm')>()),
  readResumeWithModel,
}))

const { parseResume } = await import('../parse-resume')

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const form = () => {
  const bytes = readFileSync(join(process.cwd(), 'bench/corpus/synthetic/rohan.docx'))
  const fd = new FormData()
  fd.set('file', new File([bytes], 'rohan.docx', { type: DOCX }))
  return fd
}

beforeEach(() => {
  __resetRateLimits()
  state.user = { id: 'user-1' }
  readResumeWithModel.mockReset()
  readResumeWithModel.mockResolvedValue({ skills: ['Java', 'Spring Boot'], domain: 'Banking' })
  countMatchingRoles.mockReset()
  countMatchingRoles.mockResolvedValue(213)
})

describe('parseResume — signed in and metered', () => {
  it('refuses a caller with no session, before reading the file or calling the model', async () => {
    state.user = null
    const res = await parseResume(form())
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/Sign in again/)
    expect(readResumeWithModel).not.toHaveBeenCalled()
  })

  it('uses the model for five reads, then parses without it and says so', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await parseResume(form())
      expect(res.ok).toBe(true)
      if (res.ok) expect(res.fields.skills).toEqual(['Java', 'Spring Boot'])
    }
    expect(readResumeWithModel).toHaveBeenCalledTimes(5)

    const sixth = await parseResume(form())
    // The upload still succeeds — skipping the model protects the budget
    // without stranding someone halfway through onboarding.
    expect(sixth.ok).toBe(true)
    if (!sixth.ok) return
    expect(readResumeWithModel).toHaveBeenCalledTimes(5)
    expect(sixth.fields.currentTitle).toBeTruthy()
    expect(sixth.warnings.join(' ')).toMatch(/without our model/)
  })
})

describe('parseResume — the suggested target role (QA-09)', () => {
  it('suggests the current title when the index holds postings for it', async () => {
    const res = await parseResume(form())
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.fields.currentTitle).toBe('Systems Engineer')
    expect(countMatchingRoles).toHaveBeenCalledWith(['Systems Engineer'], false)
    expect(res.suggestedRole).toBe('Systems Engineer')
  })

  it('suggests nothing when no posting carries the title', async () => {
    countMatchingRoles.mockResolvedValue(0)
    const res = await parseResume(form())
    expect(res.ok && res.suggestedRole).toBeUndefined()
  })
})
