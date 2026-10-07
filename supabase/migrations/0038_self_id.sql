-- Saaf — the candidate's OWN typed answers to demographic questions
-- (2026-10-08, TASK-171, F-602).
--
-- Application forms ask gender, disability, veteran status, caste, religion and
-- similar. Saaf refuses to answer those for anyone by default, and never infers
-- one (extension/autofill.js REFUSALS). A candidate who wants the extension to
-- answer a particular one can type their own answer here, once. Every question
-- starts as "prefer not to say" — which is simply an absent key — and the
-- extension fills only keys that are present.
--
-- jsonb on `profiles`: owner-only by the existing "own profile" policy, so no new
-- policy exists to get wrong. These are special-category personal data, so:
--   * never read by the scorer, the ingest, the digest or any employer-facing path;
--   * included in "Download my data" and removed with the account (cascade);
--   * the keys are a fixed whitelist (src/lib/self-id.ts); anything else is dropped.
--
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: the section says the update is missing.

alter table profiles
  add column if not exists self_id jsonb not null default '{}'::jsonb;

comment on column profiles.self_id is
  'Answers the candidate typed themselves to demographic application questions. Absent key = prefer not to say. Used only by the extension on the candidate''s own press of Fill. Never scored, never shared.';
