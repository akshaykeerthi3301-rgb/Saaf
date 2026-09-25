-- Saaf — three Jobright-parity features that need their own tables
-- (2026-09-25, Phase 16, founder direction; PROJECT-STATE Stage AI).
--
--   1. connections           — the candidate's OWN LinkedIn connections, uploaded
--                               from LinkedIn's "Download your data" export.
--   2. interview_questions   — questions candidates report being asked.
--   3. coaches               — a directory the founder curates; coach_applications
--                               for people who want to be listed.
--
-- Apply in the Supabase SQL editor, then run `npm run verify:rls`.

-- 1 ------------------------------------------------------------- connections
--
-- ⚠️ THIRD PARTIES' PERSONAL DATA. These rows describe people who never signed
-- up to Saaf. Kept to the minimum the feature needs (name, company, position,
-- their LinkedIn URL — NO email address even though the export has one), readable
-- ONLY by the candidate who uploaded them, and deleted with that candidate.
-- Nothing here is ever shown to anyone else or used for anything but "who do I
-- know at this company". Replaced wholesale on every upload.
create table if not exists connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  full_name     text not null check (char_length(full_name) <= 120),
  company       text check (char_length(company) <= 200),
  company_norm  text,
  position      text check (char_length(position) <= 200),
  profile_url   text check (profile_url is null or profile_url ~ '^https://([a-z]+\.)?linkedin\.com/'),
  connected_on  date,
  created_at    timestamptz not null default now()
);
create index if not exists idx_connections_user_company on connections (user_id, company_norm);
alter table connections enable row level security;
create policy "own connections" on connections
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
comment on table connections is
  'The candidate''s own LinkedIn connections export, minimised. Third-party personal data: owner-only, deleted with the owner, never shared.';

-- 2 ----------------------------------------------------- interview_questions
--
-- Reported by candidates, readable by every signed-in candidate — that is the
-- point of a question bank. The reporter is kept for deletion and abuse, and is
-- never shown. Starts EMPTY: there is no seed data, because a seeded "real
-- question" we did not collect would be an invented one.
create table if not exists interview_questions (
  id            uuid primary key default gen_random_uuid(),
  company       text not null check (char_length(company) between 1 and 200),
  company_norm  text not null,
  role_title    text check (char_length(role_title) <= 200),
  kind          text not null check (kind in ('behavioural', 'technical', 'case', 'hr', 'other')),
  question      text not null check (char_length(question) between 10 and 600),
  asked_in      date,
  reported_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists idx_interview_questions_company on interview_questions (company_norm, created_at desc);
alter table interview_questions enable row level security;
create policy "read questions" on interview_questions
  for select to authenticated using (true);
create policy "report own questions" on interview_questions
  for insert to authenticated with check (auth.uid() = reported_by);
create policy "delete own questions" on interview_questions
  for delete to authenticated using (auth.uid() = reported_by);

-- 3 ------------------------------------------------------------------ coaches
--
-- Curated by the founder in the Supabase dashboard (no insert policy: only the
-- service role writes). Saaf lists coaches and links to each coach's own
-- booking page; it takes no payment and holds no calendar.
create table if not exists coaches (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  headline      text not null,
  bio           text,
  expertise     text[] not null default '{}',
  languages     text[] not null default '{}',
  price_note    text,
  booking_url   text not null check (booking_url ~ '^https://'),
  profile_url   text check (profile_url is null or profile_url ~ '^https://'),
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
alter table coaches enable row level security;
create policy "read active coaches" on coaches
  for select to authenticated using (active);

create table if not exists coach_applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null check (char_length(name) <= 120),
  headline      text not null check (char_length(headline) <= 200),
  experience    text not null check (char_length(experience) <= 2000),
  booking_url   text check (booking_url is null or booking_url ~ '^https://'),
  created_at    timestamptz not null default now()
);
alter table coach_applications enable row level security;
-- Insert only. The founder reads applications in the dashboard; an applicant
-- cannot read anyone's, including their own list, by design.
create policy "apply as coach" on coach_applications
  for insert to authenticated with check (auth.uid() = user_id);
