-- A permanent record of when a candidate first saw a role.
--
-- gate_results.first_shown_at (0006) resets when a row is deleted and later
-- re-inserted — the freeze trigger only fires on UPDATE, and the sweep in
-- src/lib/evaluate-user.ts genuinely DELETEs rows for a role that leaves a
-- candidate's scope. A role that leaves and later re-enters scope (a
-- classifier flip, a function switch and switch-back via restartOnboarding)
-- would then read as freshly "New" even though the candidate saw it days
-- earlier. This table is insert-once and outlives any number of
-- gate_results delete/recreate cycles for the same (user, role) pairing.

create table role_first_shown (
  user_id        uuid not null references auth.users(id) on delete cascade,
  role_id        uuid not null references roles(id) on delete cascade,
  first_shown_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

alter table role_first_shown enable row level security;

create policy "own first-shown records" on role_first_shown
  for select to authenticated using (auth.uid() = user_id);

comment on table role_first_shown is
  'Insert-once, never updated and never deleted except by cascade on user/role
  removal. The "New" badge on /today reads this, not
  gate_results.first_shown_at, which resets on delete+reinsert. That column is
  left in place, unused for this purpose now, rather than dropped as part of
  a bug fix.';
