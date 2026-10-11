import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { json, refuse, requireExtensionUser } from '@/lib/extension-session'
import { createClient } from '@/lib/supabase/server'
import { draftCoverLetter } from '@/lib/copilot-writer'
import { TONES, fillVariables, unfilledTags } from '@/lib/copilot-templates'
import { readPrimaryResume } from '@/lib/services/profile-cards'
import { matchedSkills, type CandidateFacts } from '@/lib/tailor'
import { PROVIDER_LABEL } from '@/lib/parse/llm'
import { MAX_JD_CHARS, MIN_JD_CHARS } from '@/lib/jd-match'

/**
 * "Generate Cover Letter" from the job page: the same writer and the same honesty checks as the website's Cover Letter
 * Studio (`draftCoverLetter` drops any sentence the profile does not support), but for the posting on screen instead of a
 * role from the Jobinko index. The browser names only the posting; the candidate's facts are read here, under their login.
 * Nothing is saved — the person reads and edits the letter in the panel first, and only then does it go in a form.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const body = z.object({
  jdText: z.string().trim().min(MIN_JD_CHARS, 'The posting is too short to write a letter for.').max(MAX_JD_CHARS),
  jdTitle: z.string().trim().max(200).optional(),
  company: z.string().trim().max(200).optional(),
  tone: z.enum(TONES).default('Professional'),
})

export async function POST(req: NextRequest) {
  const gate = await requireExtensionUser(req, { scope: 'cover-letter', limit: 6, windowMs: 10 * 60_000 })
  if ('response' in gate) return gate.response
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return refuse(400, parsed.error.issues[0]?.message ?? 'bad-request')

  const supabase = await createClient()
  const { data: p } = await supabase
    .from('profiles')
    .select('full_name, current_title, employer, years_experience, skills, domain, credential')
    .eq('id', gate.user.userId)
    .maybeSingle()
  if (!p) return json({ ok: false, error: 'Confirm your profile on Jobinko first.' }, { status: 404 })

  const me: CandidateFacts = {
    currentTitle: p.current_title, employer: p.employer, yearsExperience: p.years_experience,
    skills: p.skills ?? [], domain: p.domain, credential: p.credential,
  }
  const role = { title: parsed.data.jdTitle || 'this role', company: parsed.data.company || '', description: parsed.data.jdText }
  const matched = matchedSkills(me, role)
  const draft = await draftCoverLetter(me, role, parsed.data.tone, matched)
  // When the writing model is busy the website's own template is used, with [Blanks]. The extension KNOWS the role, the company, the
  // person's name and a matched skill, so those blanks are filled here; whatever is left (a project the person must name) is reported
  // so the panel can ask for it before the letter can be used.
  const name = (p.full_name as string | null)?.trim() || (await readPrimaryResume(gate.user.userId))?.resume.sections.contact.name || ''
  const text = fillVariables(draft.text, {
    Role: parsed.data.jdTitle, Company: parsed.data.company, 'Your Name': name, Name: name, 'Target Skill': matched[0] ?? me.skills[0], 'Hiring Manager': 'Hiring Manager',
  })
  return json({ ok: true, text, matched, unfilled: unfilledTags(text), providerLabel: draft.provider ? PROVIDER_LABEL[draft.provider] : null, dropped: draft.dropped.length })
}
