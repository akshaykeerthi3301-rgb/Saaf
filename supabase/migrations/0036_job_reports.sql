-- Saaf — "report a problem with this posting" (2026-10-08, TASK-181, F-309).
--
-- A candidate who finds a posting that is closed, looks like a scam, has the
-- wrong details or is a duplicate can say so from the job panel. One row per
-- (candidate, role, kind), so a second tap is not a second report.
--
-- company/title are stored on the row, as applications does (0015): the ingest
-- prunes roles, and a report about a posting must outlive it. role_id is
-- ON DELETE SET NULL for the same reason.
--
-- RLS: a candidate may insert, read and withdraw THEIR OWN reports and nobody
-- else's; there is no update policy. Triage is the founder's, in the Supabase
-- table editor under the service role — no user-facing screen reads other
-- people's reports.
--
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: the control says so instead of failing.

create table if not exists job_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  role_id     uuid references roles (id) on delete set null,
  company     text,
  title       text,
  kind        text not null check (kind in ('closed', 'scam', 'wrong-details', 'duplicate', 'other')),
  note        text check (char_length(note) <= 500),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index if not exists job_reports_one_per_kind
  on job_reports (user_id, role_id, kind) where role_id is not null;
create index if not exists job_reports_open on job_reports (created_at desc) where resolved_at is null;

alter table job_reports enable row level security;

create policy "own job reports are readable" on job_reports
  for select to authenticated using (auth.uid() = user_id);
create policy "own job reports are insertable" on job_reports
  for insert to authenticated with check (auth.uid() = user_id);
create policy "own job reports are deletable" on job_reports
  for delete to authenticated using (auth.uid() = user_id);

comment on table job_reports is
  'Candidate reports about a posting (closed, scam, wrong details, duplicate). Written by the candidate; triaged by the founder under the service role.';
