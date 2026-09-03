/**
 * The one gate question asked on the onboarding gate screen
 * (src/app/(onboarding)/start/gate/page.tsx) and the profile edit form
 * (src/components/features/profile-form.tsx), so the two can't drift apart
 * the way src/lib/evaluate-user.ts and ingest/recompute.ts once did.
 *
 * Previously branched per candidate function (finance asked credential,
 * engineering just confirmed years, marketing/consulting/HR asked a
 * stored-but-not-gated placeholder question). That branch depended on
 * profiles.function, which no longer exists as a candidate-facing concept —
 * matching is now free text (profiles.preferred_role), so there is no
 * reliable bucket left to gate a question's visibility on. Asked
 * unconditionally instead: it's cheap, and "None of these" is always a valid,
 * never-penalised answer, so there's no real cost to asking it of everyone.
 */
export const CREDENTIAL_QUESTION = {
  q: 'Which credential do you hold?',
  note: 'Some roles gate on a professional credential — CA, CFA, or Company Secretary. If none apply, choose "None of these"; it never counts against you.',
  options: ['CA', 'CFA', 'CS', 'None of these'],
}
