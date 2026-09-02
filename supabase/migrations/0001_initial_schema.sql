-- Saaf — initial schema
-- Per docs/PRD.md § 3. Data Model. RLS is added in 0002; no table is usable before it.

create table boards (
  id               uuid primary key default gen_random_uuid(),
  provider         text not null check (provider in
                     ('greenhouse','lever','ashby','workable','recruitee','smartrecruiters')),
  token            text not null,
  company_name     text not null,
  active           boolean not null default true,
  last_ingested_at timestamptz,
  last_error       text,
  created_at       timestamptz not null default now(),
  unique (provider, token)
);

comment on table boards is
  'The private registry. The moat. Service-role only — no user-facing RLS policy exists.';

create table roles (
  id            uuid primary key default gen_random_uuid(),
  board_id      uuid not null references boards(id) on delete cascade,
  external_id   text not null,
  title         text not null,
  location_raw  text,
  in_india      boolean not null,
  city          text,
  function      text check (function in
                  ('engineering','finance','marketing','consulting','hr','other')),
  description   text not null,
  apply_url     text not null,
  posted_at     timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  unique (board_id, external_id)
);

comment on column roles.description is
  'Untrusted third-party text from an ATS provider. Render as text, never as HTML.';
comment on column roles.in_india is
  'Resolved at ingest. ATS boards are global — the 2026-09-02 probe found 137 of 233 roles in India.';

create table role_requirements (
  id           uuid primary key default gen_random_uuid(),
  role_id      uuid not null references roles(id) on delete cascade,
  kind         text not null check (kind in
                 ('experience_years','credential','location','work_authorisation',
                  'channel_budget','institute_tier','hr_track')),
  min_years    numeric(4,1),
  credential   text check (credential in ('CA','CFA','CS','none')),
  value_text   text,
  source_quote text not null,
  confidence   numeric(3,2) not null check (confidence >= 0 and confidence <= 1),
  created_at   timestamptz not null default now()
);

comment on column role_requirements.source_quote is
  'The sentence this requirement was extracted from. Every refusal reason is retrieved, never generated.';
comment on column role_requirements.confidence is
  'Below the 0.7 threshold the requirement is NOT used to gate. A wrong refusal is worse than a wrong match.';

create table profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  current_title      text,
  employer           text,
  years_experience   numeric(4,1),
  function           text check (function in
                       ('engineering','finance','marketing','consulting','hr')),
  city               text,
  work_authorisation text,
  credential         text check (credential in ('CA','CFA','CS','none')),
  confirmed_at       timestamptz,
  portals_used       text[],
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on column profiles.confirmed_at is
  'NULL until the candidate confirms every parsed field. Gates MUST NOT run before this is set.';

create table gate_results (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  role_id     uuid not null references roles(id) on delete cascade,
  outcome     text not null check (outcome in ('cleared','withheld','stretch')),
  refused_on  text check (refused_on in
                ('experience_years','credential','location','work_authorisation',
                 'channel_budget','institute_tier','hr_track')),
  reason      text not null,
  score       numeric(4,1),
  gap_years   numeric(4,1) check (gap_years is null or gap_years <= 2.0),
  computed_at timestamptz not null default now(),
  unique (user_id, role_id)
);

comment on table gate_results is
  'Materialised deliberately. Evaluating gates at request time would put a multi-thousand-row scan on the 90-second path.';

create table refusal_reports (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  gate_result_id uuid not null references gate_results(id) on delete cascade,
  note           text,
  resolved_at    timestamptz,
  created_at     timestamptz not null default now(),
  unique (user_id, gate_result_id)
);

comment on table refusal_reports is
  'The public defect surface promised in the guarantee, and half of success criterion 2.';

create table audit_daily (
  day            date primary key,
  roles_indexed  integer not null,
  roles_withheld integer not null,
  boards_active  integer not null,
  by_reason      jsonb not null,
  created_at     timestamptz not null default now()
);

comment on table audit_daily is
  'Anonymous-readable. The landing page renders this before signup, which is why it is a table and not a live query.';
