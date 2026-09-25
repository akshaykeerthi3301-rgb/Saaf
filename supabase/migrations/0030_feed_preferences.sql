-- Saaf — hidden jobs and saved filters on the candidate's own profile
-- (2026-09-25, Phase 15: gaps observed inside Jobright, PROJECT-STATE Stage AG).
--
-- WHY COLUMNS ON profiles AND NOT NEW TABLES. Both are small, per-candidate
-- and read on every /today render with the profile. `profiles` already carries
-- the owner-only policy (0002: `for all using (auth.uid() = id)`), so no new
-- policy is written and none can be written wrong. Caps are enforced in the
-- server actions (500 hidden roles, 10 saved filters).
--
-- hidden_role_ids: plain uuids, NOT a foreign key. A role the ingest deletes
-- (closed) simply stops matching; an FK on an array is not possible anyway.
--
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: /today reads these in a separate,
-- error-tolerant query, and the hide/save controls say this update is missing.

alter table profiles
  add column if not exists hidden_role_ids uuid[] not null default '{}',
  add column if not exists saved_filters   jsonb  not null default '[]'::jsonb;

comment on column profiles.hidden_role_ids is
  'Roles the candidate hid from their feed and digest. Never affects a score.';
comment on column profiles.saved_filters is
  'Named /today views: [{name, view:{min80,fresh,remote,easy,q,city}}]. Whitelisted keys only — see src/lib/feed-query.ts.';
