-- Saaf — operator switches (2026-10-08, TASK-161, F-712).
--
-- One row per switch, flipped by the founder in the Supabase table editor, read
-- by the app under the service role. First use: `apply_for_me_paused` — the
-- remote kill switch for the extension's "Apply for me". Setting value = 'true'
-- makes GET /api/extension/status answer "paused", and every extension stops
-- before its next job and again before its next Submit click.
--
-- RLS is ON WITH NO POLICIES: no candidate and no anonymous visitor can read or
-- write this table, so a switch cannot be flipped from a browser. The status
-- route exposes exactly one derived fact (paused or not, plus the message).
--
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: a missing table reads as "not paused".
-- (The environment variable APPLY_FOR_ME_PAUSED=1 pauses without this table.)

create table if not exists service_flags (
  key        text primary key check (char_length(key) between 1 and 60),
  value      text not null default '',
  message    text check (char_length(message) <= 200),
  updated_at timestamptz not null default now()
);

alter table service_flags enable row level security;

comment on table service_flags is
  'Operator switches, service role only (RLS on, no policies). apply_for_me_paused = ''true'' halts the extension''s Apply for me. See docs/RUNBOOK.md.';

insert into service_flags (key, value, message)
values ('apply_for_me_paused', 'false', 'Apply for me is paused while Saaf checks a problem. Nothing was submitted; your queue is kept.')
on conflict (key) do nothing;
