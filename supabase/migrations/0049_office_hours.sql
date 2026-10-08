-- Saaf — free live office-hour sessions (2026-10-08, TASK-196; F-1006).
--
-- Written by the founder in the Supabase dashboard (no insert/update policy: only the service role
-- writes), read by signed-in candidates. A session is a title, a host, a start time, how long it runs and
-- the link the host gives to join (a video-call URL on https). Saaf hosts nothing, records nothing and
-- takes no payment; the candidate adds it to their own calendar and joins on the host's own link.
-- Sessions stay listed until three hours after they start, then drop off by themselves.
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: the page says the update is missing.
create table if not exists office_hours (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) <= 140),
  host_name    text not null check (char_length(host_name) <= 120),
  starts_at    timestamptz not null,
  duration_min integer not null default 45 check (duration_min between 10 and 240),
  join_url     text not null check (join_url ~ '^https://'),
  description  text check (description is null or char_length(description) <= 800),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
alter table office_hours enable row level security;
create policy "read upcoming office hours" on office_hours
  for select to authenticated using (active and starts_at > now() - interval '3 hours');
create index if not exists office_hours_by_start on office_hours (starts_at) where active;
