-- Jobinko — the weekly housekeeping job (2026-10-16, founder: "list new job listings and
-- delete the oldest ones every week"; "duplicates … should never be placed in our jobinko").
--
-- One function, run once a week by /api/cron/weekly (service role) or by hand:
--   select weekly_housekeeping();            -- defaults: 90 days, at most 25% of open roles
--
-- It does three things, in this order, and writes one row of history:
--   1. LISTS what arrived this week — roles first seen in the last 7 days: the count, the
--      count per provider and the 25 employers with the most — BEFORE anything is deleted.
--   2. REMOVES DUPLICATES: the same posting (company, title, location) on several career
--      sites of one employer keeps the copy on the SMALLEST board id — the same row the
--      ingest rule keeps (ingest/dedupe.ts dropHeldBySiblings). Roles a candidate tracks in
--      an application are never deleted.
--   3. DELETES THE OLDEST: open roles whose posting date (posted_at, else first_seen_at) is
--      older than max_age_days, oldest first, untracked only, and at most
--      max_evict_fraction of the open roles in one run — so a wrong date on one board cannot
--      empty the index; the rest goes the next week. The ingest skips postings older than
--      the same window (ingest/lifecycle.ts), so a deleted role is not simply re-added.
--
-- Deleting a role cascades to its requirements and to every candidate's match rows for it;
-- the nightly recompute rebuilds the matches. Closed roles are not touched (they have their
-- own 30-day rule). SAFE TO RUN BY HAND AND SAFE TO RE-RUN: each step is idempotent.

create table if not exists weekly_listing_reports (
  week_start     date primary key,
  new_roles      integer not null,
  new_by_provider jsonb  not null default '{}'::jsonb,
  new_top_employers jsonb not null default '[]'::jsonb,
  duplicates_deleted integer not null default 0,
  old_deleted    integer not null default 0,
  old_remaining  integer not null default 0,
  open_before    integer not null,
  open_after     integer not null,
  max_age_days   integer not null,
  created_at     timestamptz not null default now()
);

-- RLS on with no policy: service role only. No candidate reads this.
alter table weekly_listing_reports enable row level security;

comment on table weekly_listing_reports is
  'One row per week written by weekly_housekeeping(): what arrived, what was removed. Service role only.';

create or replace function weekly_housekeeping(
  max_age_days integer default 90,
  max_evict_fraction numeric default 0.25
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff        timestamptz := now() - make_interval(days => max_age_days);
  open_before   integer;
  new_count     integer;
  by_provider   jsonb;
  top_employers jsonb;
  dup_deleted   integer := 0;
  old_cap       integer;
  old_deleted   integer := 0;
  old_left      integer;
  open_after    integer;
  wk            date := (now() at time zone 'Asia/Kolkata')::date;
begin
  select count(*) into open_before from roles where closed_at is null;

  -- 1. what arrived this week (counted before any deletion below)
  select count(*) into new_count from roles
    where closed_at is null and first_seen_at > now() - interval '7 days';

  select coalesce(jsonb_object_agg(provider, c), '{}'::jsonb) into by_provider from (
    select b.provider, count(*) c from roles r join boards b on b.id = r.board_id
    where r.closed_at is null and r.first_seen_at > now() - interval '7 days'
    group by b.provider) p;

  select coalesce(jsonb_agg(jsonb_build_object('employer', company_name, 'new_roles', c) order by c desc), '[]'::jsonb)
    into top_employers from (
    select company_name, count(*) c from roles
    where closed_at is null and first_seen_at > now() - interval '7 days'
    group by company_name order by c desc limit 25) t;

  -- 2. duplicates: keep the smallest board id; never a role a candidate tracks
  with ranked as (
    select id, row_number() over (
      partition by lower(company_name), lower(title), lower(coalesce(location_raw, ''))
      order by board_id, id) rn
    from roles where closed_at is null),
  d as (
    delete from roles
    where id in (select id from ranked where rn > 1)
      and not exists (select 1 from applications a where a.role_id = roles.id)
    returning 1)
  select count(*) into dup_deleted from d;

  -- 3. the oldest: past the window, oldest first, capped
  old_cap := floor((open_before - dup_deleted) * max_evict_fraction);
  with victims as (
    select id from roles r
    where closed_at is null
      and coalesce(posted_at, first_seen_at) < cutoff
      and not exists (select 1 from applications a where a.role_id = r.id)
    order by coalesce(posted_at, first_seen_at) asc
    limit old_cap),
  d as (delete from roles where id in (select id from victims) returning 1)
  select count(*) into old_deleted from d;

  select count(*) into old_left from roles
    where closed_at is null and coalesce(posted_at, first_seen_at) < cutoff;
  select count(*) into open_after from roles where closed_at is null;

  insert into weekly_listing_reports as w
    (week_start, new_roles, new_by_provider, new_top_employers, duplicates_deleted, old_deleted,
     old_remaining, open_before, open_after, max_age_days)
  values (wk, new_count, by_provider, top_employers, dup_deleted, old_deleted, old_left,
          open_before, open_after, max_age_days)
  on conflict (week_start) do update set
    new_roles = excluded.new_roles, new_by_provider = excluded.new_by_provider,
    new_top_employers = excluded.new_top_employers,
    duplicates_deleted = w.duplicates_deleted + excluded.duplicates_deleted,
    old_deleted = w.old_deleted + excluded.old_deleted, old_remaining = excluded.old_remaining,
    open_before = least(w.open_before, excluded.open_before), open_after = excluded.open_after,
    max_age_days = excluded.max_age_days, created_at = now();

  return jsonb_build_object(
    'week_start', wk, 'new_roles', new_count, 'new_by_provider', by_provider,
    'new_top_employers', top_employers, 'duplicates_deleted', dup_deleted,
    'old_deleted', old_deleted, 'old_remaining', old_left,
    'open_before', open_before, 'open_after', open_after, 'max_age_days', max_age_days);
end;
$$;

revoke all on function weekly_housekeeping(integer, numeric) from public, anon, authenticated;
grant execute on function weekly_housekeeping(integer, numeric) to service_role;
