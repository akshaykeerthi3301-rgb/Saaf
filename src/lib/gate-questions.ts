export type Fn = 'engineering' | 'finance' | 'marketing' | 'consulting' | 'hr'

/**
 * The function-typed gate question — shared between the onboarding gate
 * screen (src/app/(onboarding)/start/gate/page.tsx) and the profile edit
 * form (src/components/features/profile-form.tsx), so the two can't drift
 * apart the way src/lib/evaluate-user.ts and ingest/recompute.ts once did.
 *
 * The question changes with the function because the disqualifier does.
 * Marketing, consulting and HR ask a real question (per
 * productos/design/3-Onboarding-Flow.md) but the answer is stored, not yet
 * gated on — see docs/PRD.md §13.
 */
export const QUESTIONS: Record<Fn, { q: string; note: string; options: string[] }> = {
  finance: {
    q: 'Which credential do you hold?',
    note: 'Finance gates on a credential, not on years. We check the one that actually applies to you.',
    options: ['CA', 'CFA', 'CS', 'None of these'],
  },
  engineering: {
    q: 'Confirm your experience band',
    note: 'Engineering gates on an experience band. A role asking for more than you have is withheld, with the number stated.',
    options: ['That looks right'],
  },
  marketing: {
    q: "Largest paid budget you've owned",
    note: "Marketing usually gates on channel ownership and budget scale rather than years. That gate isn't live yet — only location and stated seniority apply to your list for now — but we're asking so your answer is ready the moment it is.",
    options: ['Under ₹10L/month', '₹10L–₹50L/month', 'Over ₹50L/month', "I haven't owned a paid budget"],
  },
  consulting: {
    q: 'Where did you study?',
    note: "Consulting often gates on institute tier. That gate isn't live yet — only location and stated seniority apply to your list for now — but we're asking so your answer is ready the moment it is.",
    options: ['A Tier-1 institute (IIM, ISB, or equivalent)', 'A Tier-2 institute', 'Any other institute'],
  },
  hr: {
    q: 'Recruitment or generalist?',
    note: "HR often gates on a recruitment-versus-generalist split. That gate isn't live yet — only location and stated seniority apply to your list for now — but we're asking so your answer is ready the moment it is.",
    options: ['Recruitment / Talent Acquisition', 'HR Generalist / HRBP', 'Neither of these'],
  },
}

/** Functions with a stored-but-not-gated answer, distinct from finance
 *  (which gates for real) and engineering (which just confirms years already
 *  collected on the previous screen). */
export const ASSESSMENT_ONLY_FUNCTIONS: Fn[] = ['marketing', 'consulting', 'hr']
