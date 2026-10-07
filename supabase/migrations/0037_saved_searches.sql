-- Saaf — named sets of roles to search for (2026-10-08, TASK-157, F-113).
--
-- A candidate looking at both "Product Manager" and "Business Analyst" roles, or
-- switching between a stretch search and a safe one, keeps each as a named set
-- and switches in one click. Switching rewrites preferred_role / preferred_roles
-- / keywords on the profile (they are what the scorer reads) and re-scores.
--
-- Stored on `profiles`, like saved_filters (0030): small, per-candidate, owner-
-- only by the existing "own profile" policy, so no policy is written and none
-- can be written wrong. Caps (8 searches, 5 roles each) are enforced in the
-- action and the sanitiser (src/lib/saved-searches.ts).
--
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: the menu reads it in its own query and
-- says the update is missing.

alter table profiles
  add column if not exists saved_searches jsonb not null default '[]'::jsonb;

comment on column profiles.saved_searches is
  'Named role sets: [{name, roles[1..5], keywords[]}]. Whitelisted shape only — see src/lib/saved-searches.ts.';
