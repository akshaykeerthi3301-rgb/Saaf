-- Jobinko — the weekly housekeeping, in batches (2026-10-16). REPLACES the one-statement
-- weekly_housekeeping() of 0054, which the database cancelled on its first real run
-- ("canceling statement due to statement timeout"): ranking 43,000 jobs and deleting ~10,000
-- with their cascades in ONE statement exceeds the limit the API gives a function call. It rolled
-- back whole, so nothing was deleted.
--
-- Now four small functions and a runner (ingest/weekly.ts) that loops over them, each call a
-- few seconds and each safe to repeat:
--   weekly_new_listings()            read-only: what arrived in the last 7 days, and the open count
--   weekly_dedupe_batch(batch)       deletes up to `batch` duplicate postings; returns how many
--   weekly_evict_batch(days, batch)  deletes up to `batch` of the OLDEST postings past the window
--   weekly_counts(days)              read-only: open jobs and how many are still past the window
-- The rules are exactly 0054's: duplicates keep the copy on the SMALLEST board id; the oldest are
-- judged by coalesce(posted_at, first_seen_at); a role a candidate tracks in an application is never
-- deleted. The 25%-per-run cap lives in the runner. Service role only.

drop function if exists weekly_housekeeping(integer, numeric);

create or replace function weekly_new_listings() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  open_now integer; new_count integer; by_provider jsonb; top_employers jsonb;
begin
  select count(*) into open_now from roles where closed_at is null;
  select count(*) into new_count from roles where closed_at is null and first_seen_at > now() - interval '7 days';
  select coalesce(jsonb_object_agg(provider, c), '{}'::jsonb) into by_provider from (
    select b.provider, count(*) c from roles r join boards b on b.id = r.board_id
    where r.closed_at is null and r.first_seen_at > now() - interval '7 days' group by b.provider) p;
  select coalesce(jsonb_agg(jsonb_build_object('employer', company_name, 'new_roles', c) order by c desc), '[]'::jsonb)
    into top_employers from (
    select company_name, count(*) c from roles
    where closed_at is null and first_seen_at > now() - interval '7 days'
    group by company_name order by c desc limit 25) t;
  return jsonb_build_object('open_now', open_now, 'new_roles', new_count, 'new_by_provider', by_provider, 'new_top_employers', top_employers);
end $$;

create or replace function weekly_dedupe_batch(batch integer default 1000) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with ranked as (
    select id, row_number() over (
      partition by lower(company_name), lower(title), lower(coalesce(location_raw, ''))
      order by board_id, id) rn
    from roles where closed_at is null),
  victims as (
    select id from ranked
    where rn > 1 and not exists (select 1 from applications a where a.role_id = ranked.id)
    limit batch),
  d as (delete from roles where id in (select id from victims) returning 1)
  select count(*) into n from d;
  return n;
end $$;

create or replace function weekly_evict_batch(max_age_days integer default 90, batch integer default 1000) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with victims as (
    select id from roles r
    where closed_at is null
      and coalesce(posted_at, first_seen_at) < now() - make_interval(days => max_age_days)
      and not exists (select 1 from applications a where a.role_id = r.id)
    order by coalesce(posted_at, first_seen_at) asc
    limit batch),
  d as (delete from roles where id in (select id from victims) returning 1)
  select count(*) into n from d;
  return n;
end $$;

create or replace function weekly_counts(max_age_days integer default 90) returns jsonb
language plpgsql security definer set search_path = public as $$
declare open_now integer; old_left integer;
begin
  select count(*) into open_now from roles where closed_at is null;
  select count(*) into old_left from roles
    where closed_at is null and coalesce(posted_at, first_seen_at) < now() - make_interval(days => max_age_days);
  return jsonb_build_object('open_now', open_now, 'old_remaining', old_left);
end $$;

revoke all on function weekly_new_listings() from public, anon, authenticated;
revoke all on function weekly_dedupe_batch(integer) from public, anon, authenticated;
revoke all on function weekly_evict_batch(integer, integer) from public, anon, authenticated;
revoke all on function weekly_counts(integer) from public, anon, authenticated;
grant execute on function weekly_new_listings() to service_role;
grant execute on function weekly_dedupe_batch(integer) to service_role;
grant execute on function weekly_evict_batch(integer, integer) to service_role;
grant execute on function weekly_counts(integer) to service_role;
