-- Saaf — track when a candidate first saw a role, independent of computed_at.
--
-- computed_at is overwritten on every nightly recompute (src/lib/evaluate-user.ts,
-- ingest/recompute.ts) — it answers "when did we last check this pairing," never
-- "what's new since I looked." first_shown_at is the missing half: set once by
-- the column default on insert, then frozen by the trigger below regardless of
-- what any future upsert payload contains. Powers the "New" badge on /today.

alter table gate_results add column first_shown_at timestamptz not null default now();

comment on column gate_results.first_shown_at is
  'Set once, on first insert for this (user_id, role_id) pair. Powers the
  "new since your last visit" badge. Never overwritten — see freeze_first_shown_at
  trigger below.';

create function freeze_gate_results_first_shown_at()
returns trigger
language plpgsql
as $$
begin
  new.first_shown_at := old.first_shown_at;
  return new;
end;
$$;

create trigger freeze_first_shown_at
  before update on gate_results
  for each row
  execute function freeze_gate_results_first_shown_at();

comment on trigger freeze_first_shown_at on gate_results is
  'Makes first_shown_at write-once regardless of upsert payload contents — a
  stronger guarantee than relying on the JS client omitting the column.';
