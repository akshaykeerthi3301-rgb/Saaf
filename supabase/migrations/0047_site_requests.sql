-- Saaf — "Ask Saaf to support this site" (2026-10-08, TASK-192; F-714).
--
-- One row per (candidate, site): only the HOSTNAME the candidate asked for — never a URL, a
-- path or anything from the page. Owner-only, so the founder counts the requests in the
-- Supabase table editor (or with the service role), and a candidate sees only their own.
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: the extension keeps the request until it can be filed.
create table if not exists site_requests (
  user_id    uuid not null references auth.users (id) on delete cascade,
  host       text not null check (char_length(host) between 4 and 120 and host ~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, host)
);
alter table site_requests enable row level security;
create policy "own site requests" on site_requests for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
