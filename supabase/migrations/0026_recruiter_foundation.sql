-- Saaf — the four prerequisites a recruiter side needs, and no recruiter side.
--
-- ⚠️ THIS MIGRATION SHIPS NO RECRUITER UI, NO SEARCH INDEX, AND NO WAY TO
-- BECOME A RECRUITER. It builds only what CLAUDE.md architecture invariant #4
-- names as prerequisites, so that a future build is a feature rather than a
-- breach. Invariant #4 says the leak in a dual-sided product is (2), a second
-- RLS policy set — and reading the schema confirmed exactly that.
--
-- WHY NOW. `roles` and `role_requirements` are `to authenticated using (true)`
-- (0002:16-20). Every signed-in account reads the ENTIRE index, including
-- company_name and apply_url, which largely reconstructs the registry that the
-- `boards` table exists to protect. That is correct today only because every
-- authenticated account is a candidate. A recruiter account invalidates it on
-- the day it is created, before anybody writes a line of recruiter code.
--
-- ⚠️ ORDER MATTERS AND THE BLAST RADIUS IS EVERY SHORTLIST IN THE PRODUCT.
-- Every authenticated read of the index goes through the two policies replaced
-- below. If the JWT claim does not evaluate the way this file assumes, the
-- symptom is not an error — it is every candidate's shortlist silently
-- returning zero rows. Run `npm run verify:rls` immediately after applying, and
-- open /today in a browser before considering it done.

-- 1 ----------------------------------------------------------------- identity
--
-- The account type lives in auth.users.app_metadata, NEVER in profiles.
-- profiles is writable by its owner through one `for all` policy (0002:22-23),
-- so a type column there would be SELF-ASSIGNABLE — a user could make
-- themselves a recruiter with a PATCH. app_metadata is writable only by the
-- service role, and confirm-profile.ts already reads it for provider checks.
--
-- Absence means candidate. That default is deliberate and it is what makes this
-- migration safe to apply to a live product: every existing user, and every
-- user created before a recruiter flow exists, is a candidate without a
-- backfill.
create or replace function public.account_type()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb
      -> 'app_metadata' ->> 'account_type',
    'candidate'
  );
$$;

comment on function public.account_type() is
  'Account type from the JWT app_metadata claim; "candidate" when absent. '
  'app_metadata is service-role-only, so this cannot be set by the user. '
  'Absence defaults to candidate so that adding this function changes nothing '
  'for any existing account.';

-- 2 ------------------------------------------------------- narrow the index
--
-- ⚠️ THIS FAILS OPEN TOWARDS CANDIDATES, ON PURPOSE, AND IT IS A TRADE.
-- If the claim is missing or malformed, account_type() returns 'candidate' and
-- the read is allowed. The alternative — defaulting to deny — means any change
-- to how Supabase presents claims empties every shortlist in the product
-- silently. Today there are zero recruiter accounts, so the cost of failing
-- open is zero and the cost of failing closed is the whole product. When
-- recruiters exist, revisit this line FIRST and prove it with a probe that
-- holds a real recruiter JWT.
drop policy if exists "authenticated read roles" on roles;
create policy "candidates read roles" on roles
  for select to authenticated using (public.account_type() = 'candidate');

drop policy if exists "authenticated read requirements" on role_requirements;
create policy "candidates read requirements" on role_requirements
  for select to authenticated using (public.account_type() = 'candidate');

-- 3 ------------------------------------------------------------- consent
--
-- Opt-in, default absent, revocable, and audited. PROJECT-STATE parks "B2B
-- discoverability" pending exactly this, and the third product guarantee is
-- that nothing about a candidate's search is shared. A row here is the ONLY
-- thing that may ever make a candidate visible to an employer.
--
-- revoked_at rather than a delete: a candidate who withdraws consent needs the
-- withdrawal to be provable later, and a deleted row proves nothing.
create table if not exists candidate_discoverability (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  granted_at   timestamptz not null default now(),
  revoked_at   timestamptz,
  -- What they actually agreed to, stored as shown. Consent to a sentence that
  -- has since been reworded is not consent to the new wording.
  consent_text text not null,
  created_at   timestamptz not null default now()
);

create unique index if not exists idx_discoverability_active
  on candidate_discoverability (user_id) where revoked_at is null;

alter table candidate_discoverability enable row level security;

-- Four per-operation policies rather than one `for all`, following
-- resume_documents (0023:62-72): widening one later has to be a deliberate act.
-- Note there is deliberately NO policy granting any recruiter read. The table
-- exists; nothing can consume it yet.
create policy "own consent readable"   on candidate_discoverability
  for select using (auth.uid() = user_id);
create policy "own consent insertable" on candidate_discoverability
  for insert with check (auth.uid() = user_id);
create policy "own consent updatable"  on candidate_discoverability
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own consent deletable"  on candidate_discoverability
  for delete using (auth.uid() = user_id);

comment on table candidate_discoverability is
  'Opt-in consent for employer discoverability. No row means no consent. '
  'No recruiter-side read policy exists and none should be added until an '
  'employer identity table and a side-aware routing layer exist — see '
  'CLAUDE.md architecture invariant #4.';

-- 4 --------------------------------------------------------- what is NOT here
--
-- Deliberately absent, and each for a reason a future session should read
-- before adding it:
--
--   * An employer identity table. Nothing can be a recruiter yet, which is why
--     the narrowing above is safe to apply today.
--   * Any recruiter read policy on profiles, resume_documents or gate_results.
--   * A search index over candidates. That needs consent to exist FIRST, and
--     consent has existed for zero seconds.
--   * A way to set account_type. It is service-role-only by design, so making
--     somebody a recruiter is currently a deliberate manual act — which is the
--     correct amount of friction while there is no consent model in use.
--
-- ⚠️ INSTANT SIGN-IN VERIFIES NOTHING (src/lib/instant-signin.ts:9-13). Anyone
-- can sign in as any address today. Any recruiter authorisation keyed on an
-- email address or domain is therefore forgeable, and recruiter accounts must
-- require Google OAuth before they exist at all.
