-- Saaf — search history and a rating for how a sentence was read
-- (2026-10-08, TASK-172, F-205, F-206).
--
-- Typing "remote PM jobs posted this week" in the feed's search box is read into
-- filters by a deterministic parser (src/lib/feed-query.ts). Each search the
-- candidate runs is kept — the words they typed AND the filters it was read into —
-- so they can restore it exactly, and can say whether Saaf read it right
-- (rating: up / down). The ratings are how the parser's misreadings get found.
--
-- One row per (candidate, words): searching the same words again moves it to the
-- top instead of adding a second. At most 20 are kept per candidate; the oldest is
-- dropped — a cap enforced here, not trusted to the action.
--
-- OWNER-ONLY BY RLS, and the words are the candidate's own: they are part of
-- "Download my data" and go with the account (cascade). The founder reads ratings
-- under the service role to tune the parser; no screen shows anyone else's.
--
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: the search box simply shows no history.

create table if not exists search_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 300),
  view       jsonb not null,
  rating     text check (rating in ('up', 'down')),
  created_at timestamptz not null default now(),
  unique (user_id, text)
);

create index if not exists search_history_recent on search_history (user_id, created_at desc);

alter table search_history enable row level security;

create policy "own searches are readable"   on search_history for select to authenticated using (auth.uid() = user_id);
create policy "own searches are insertable" on search_history for insert to authenticated with check (auth.uid() = user_id);
create policy "own searches are updatable"  on search_history for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own searches are deletable"  on search_history for delete to authenticated using (auth.uid() = user_id);

create or replace function enforce_search_history_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from search_history
  where id in (
    select id from search_history where user_id = new.user_id order by created_at desc offset 20
  );
  return new;
end;
$$;

drop trigger if exists search_history_cap on search_history;
create trigger search_history_cap
  after insert on search_history
  for each row execute function enforce_search_history_cap();
