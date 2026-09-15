-- Saaf — the contact details an application form asks for.
--
-- WHY THEY WERE NEVER HERE. `profiles` holds what the SCORER needs: title,
-- employer, years, city, preferred role, skills. Saaf never applies on a
-- candidate's behalf, so it never needed to know their phone number, and not
-- collecting a fact you have no use for is the right default.
--
-- The browser extension changes that, and only that. It fills application forms
-- from the details already in the account — which is the whole point of it, and
-- the reason it must not ask the candidate to type their name into a popup when
-- Saaf could have known it. These five columns are the gap between what the
-- scorer needs and what a form asks.
--
-- ⚠️ NO NEW RLS POLICIES, AND THAT IS CORRECT. `profiles` already carries
-- "own profile" for all operations (0002:22-23), scoped to auth.uid() = id.
-- These columns inherit it. The extension reads them over PostgREST holding the
-- candidate's own session, so the policy is the security and nothing new is
-- exposed. ⚠️ Adding a recruiter-readable policy to `profiles` later would
-- expose these too — they are the most personal columns in the table, and
-- `candidate_discoverability` (0026) exists so that decision stays explicit.
--
-- All nullable, no defaults, no backfill: an existing profile stays valid and
-- the extension simply fills fewer boxes until the candidate adds them.

alter table profiles
  add column if not exists full_name     text,
  add column if not exists phone         text,
  add column if not exists linkedin_url  text,
  add column if not exists portfolio_url text,
  add column if not exists notice_period text;

comment on column profiles.full_name is
  'For filling application forms. The scorer never reads it. Email is NOT '
  'duplicated here — it lives on auth.users and the session already carries it.';
comment on column profiles.phone is
  'For filling application forms only. Never shown to an employer by Saaf, '
  'never part of any score, and covered by the existing own-profile policy.';
