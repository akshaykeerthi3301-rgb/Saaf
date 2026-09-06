-- Saaf — the application tracker.
--
-- Parity item 1 from docs/PARITY.local.md: a competitor's only free feature Saaf has no
-- answer to. It costs no model call, touches no locked decision, and it is where
-- the shortlist currently dead-ends — a candidate decides a role is worth their
-- next forty minutes and then leaves for a spreadsheet.
--
-- role_id is NULLABLE on purpose. Half the point is tracking a job the candidate
-- found anywhere, which is the same reason the paste-a-JD path exists; a tracker
-- that only accepts roles from our own index is a worse spreadsheet. Company and
-- title are therefore stored on the row rather than read through the join, and
-- they are denormalised for a second reason: roles are pruned after 30 days, and
-- an application must outlive the posting it came from.
--
-- ON DELETE SET NULL rather than CASCADE for exactly that — pruning a stale
-- posting must never delete a candidate's record of having applied to it.

create type application_status as enum (
  'saved', 'applied', 'interviewing', 'offer', 'closed'
);

create table applications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  role_id        uuid references roles (id) on delete set null,
  company        text not null,
  title          text not null,
  apply_url      text,
  status         application_status not null default 'saved',
  note           text,
  follow_up_on   date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- One row per candidate per indexed role, so "track this" from the shortlist is
-- idempotent the way the report control is. Roles tracked by hand (role_id null)
-- are not constrained: a candidate may legitimately apply to two openings at the
-- same company with the same title in different cities.
create unique index idx_applications_user_role
  on applications (user_id, role_id) where role_id is not null;

create index idx_applications_board on applications (user_id, status, updated_at desc);
create index idx_applications_follow_up
  on applications (user_id, follow_up_on) where follow_up_on is not null;

alter table applications enable row level security;

create policy "own applications" on applications
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table applications is
  'The candidate''s own pipeline. Written by the candidate, never by the ingest —
  unlike gate_results, this table has a user-facing insert and update policy
  because the candidate is the only author of it.';

comment on column applications.role_id is
  'Null when the job came from outside the index. Set null on role delete so a
  pruned posting never erases a record of having applied.';
