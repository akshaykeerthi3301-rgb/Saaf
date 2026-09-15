import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CandidateFacts, RoleFacts } from '../tailor'
import type { ResumeSections } from '../parse/sections'

/**
 * TASK-085 — what a scoped rewrite must and must not do.
 *
 * ⚠️ THE CLAIM THIS FILE DEFENDS IS A PROMISE MADE IN COPY. Stage 3 of the
 * Résumé Studio labels Skills "no model" and tells the candidate in writing
 * that nothing will run. If `rewriteResume` reached a provider anyway — even to
 * discard the answer — that sentence would be false, and the surface's entire
 * argument is that the model boundary sits where the page says it sits.
 *
 * ⚠️ AND THE SAVING IS SMALLER THAN THE PLAN ASSUMED, WHICH IS WHY THE MODEL
 * CALL ITSELF IS WHAT MATTERS. Measured 2026-09-15: with a pasted posting,
 * scoping to the summary alone is only ~8% cheaper in total tokens and to
 * experience alone ~2%, because the prompt is ~895 of ~997 tokens and must
 * still carry the whole document. Skills-only is the one real saving — 100% —
 * because it makes no call. So "did it call the model" is the assertion with
 * teeth, not "was the prompt shorter".
 */

const calls: { prompt: string; schema: Record<string, unknown> }[] = []

vi.mock('@/lib/parse/llm', () => ({
  PROVIDER_LABEL: { groq: 'Groq', gemini: 'Gemini' },
  ModelBusyError: class extends Error {},
  callJsonModel: vi.fn(async (opts: { prompt: string; schema: object }) => {
    calls.push({ prompt: opts.prompt, schema: opts.schema as Record<string, unknown> })
    return {
      raw: JSON.stringify({
        summary: 'Backend engineer with three years building payment services in Python.',
        entries: [{ index: 0, bullets: ['Built payment APIs in Python serving 4,000 requests per second'] }],
      }),
      provider: 'groq' as const,
    }
  }),
}))

const { rewriteResume } = await import('../resume-rewrite')

const SECTIONS: ResumeSections = {
  contact: { name: 'Priya Nair', email: 'priya@example.com', phone: null, location: null, links: [] },
  summary: 'Backend engineer, three years, payments.',
  skills: ['Python', 'Django', 'AWS', 'Docker'],
  experience: [
    {
      title: 'Backend Engineer',
      employer: 'Fintech Co',
      dates: 'Jan 2023 to Present',
      bullets: ['Built payment APIs in Python serving 4,000 requests per second'],
    },
  ],
  education: [],
  other: {},
} as unknown as ResumeSections

const ME: CandidateFacts = {
  currentTitle: 'Backend Engineer',
  employer: 'Fintech Co',
  yearsExperience: 3,
  skills: [],
  domain: null,
  credential: null,
}

const ROLE: RoleFacts = {
  title: 'Senior Backend Engineer',
  company: '',
  description: 'We use Python, AWS and Docker daily.',
}

beforeEach(() => {
  calls.length = 0
})

describe('rewriteResume scope', () => {
  it('SKILLS ONLY MAKES NO MODEL CALL — the promise stage 3 prints', async () => {
    const r = await rewriteResume({
      sections: SECTIONS,
      facts: ME,
      role: ROLE,
      scope: { summary: false, experience: false },
    })
    expect(calls).toHaveLength(0)
    // And it must say so rather than naming a provider that never ran.
    expect(r!.provider).toBeNull()
    expect(r!.changes).toEqual([])
    expect(r!.reverted).toEqual([])
  })

  it('skills-only still reorders, and still adds and removes nothing', async () => {
    const r = await rewriteResume({
      sections: SECTIONS,
      facts: ME,
      role: ROLE,
      scope: { summary: false, experience: false },
    })
    expect([...r!.sections.skills].sort()).toEqual([...SECTIONS.skills].sort())
    expect(r!.sections.skills.slice(0, 3)).toEqual(['Python', 'AWS', 'Docker'])
    expect(r!.skillsReordered).toBe(true)
    // Prose is untouched on this path.
    expect(r!.sections.summary).toBe(SECTIONS.summary)
    expect(r!.sections.experience[0].bullets).toEqual(SECTIONS.experience[0].bullets)
  })

  it('summary-only leaves every bullet exactly as written', async () => {
    const r = await rewriteResume({
      sections: SECTIONS,
      facts: ME,
      role: ROLE,
      scope: { summary: true, experience: false },
    })
    expect(calls).toHaveLength(1)
    expect(r!.sections.experience[0].bullets).toEqual(SECTIONS.experience[0].bullets)
    // ⚠️ The schema must not oblige the model to generate bullets we discard —
    // that is paid for in output tokens and thrown away.
    expect(calls[0].schema.required).toEqual(['summary'])
    expect(Object.keys(calls[0].schema.properties as object)).toEqual(['summary'])
  })

  it('experience-only leaves the summary exactly as written', async () => {
    const r = await rewriteResume({
      sections: SECTIONS,
      facts: ME,
      role: ROLE,
      scope: { summary: false, experience: true },
    })
    expect(calls).toHaveLength(1)
    expect(r!.sections.summary).toBe(SECTIONS.summary)
    expect(calls[0].schema.required).toEqual(['entries'])
  })

  it('omitting the scope rewrites the whole document — the old behaviour', async () => {
    const r = await rewriteResume({ sections: SECTIONS, facts: ME, role: ROLE })
    expect(calls).toHaveLength(1)
    expect(calls[0].schema.required).toEqual(['summary', 'entries'])
    expect(r!.provider).toBe('groq')
  })

  it('still shows the whole document to the model even when scoped', async () => {
    /**
     * ⚠️ NOT AN OVERSIGHT. A summary summarises the experience, so rewriting it
     * without sight of the bullets produces a paragraph grounded in nothing —
     * which `rewriteFailure()` then rejects, spending the tokens for no output.
     * The scope narrows what is RETURNED, not what is seen.
     */
    await rewriteResume({
      sections: SECTIONS,
      facts: ME,
      role: ROLE,
      scope: { summary: true, experience: false },
    })
    expect(calls[0].prompt).toContain('Built payment APIs')
  })

  it('shows a KEPT summary rewrite in the change list', async () => {
    /**
     * ⚠️ THE GAP TASK-085 EXPOSED. Only REJECTED summaries were recorded, so a
     * summary the guard accepted changed the document and appeared nowhere.
     * Invisible while every rewrite also rewrote bullets; glaring the moment
     * "summary only" became a thing a candidate can pick — they pressed the
     * button, it worked, and the result screen showed them nothing.
     */
    const r = await rewriteResume({
      sections: SECTIONS,
      facts: ME,
      role: ROLE,
      scope: { summary: true, experience: false },
    })
    const kept = r!.changes.filter((c) => c.kept)
    expect(kept).toHaveLength(1)
    expect(kept[0].original).toBe(SECTIONS.summary)
    expect(kept[0].rewritten).toContain('Backend engineer')
    expect(r!.reverted).toEqual([])
  })

  it('a summary-only rewrite works on a résumé with no experience section', async () => {
    // The "no work experience" guard applies to bullets, not to prose. Refusing
    // here would block the one thing such a candidate can still improve.
    const empty = { ...SECTIONS, experience: [] } as unknown as ResumeSections
    await expect(
      rewriteResume({ sections: empty, facts: ME, role: ROLE, scope: { summary: true, experience: false } }),
    ).resolves.toBeTruthy()
  })

  it('still refuses an experience rewrite with nothing to rewrite', async () => {
    const empty = { ...SECTIONS, experience: [] } as unknown as ResumeSections
    await expect(
      rewriteResume({ sections: empty, facts: ME, role: ROLE, scope: { summary: false, experience: true } }),
    ).rejects.toThrow(/work-experience/)
  })
})
