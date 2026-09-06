-- Saaf — fix the public audit page, which has been publishing wrong numbers.
--
-- ingest/audit.ts computed `by_reason` by selecting every role_requirements
-- row through PostgREST and aggregating them in JavaScript. PostgREST caps a
-- response at 1,000 rows. There are 1,496. It has therefore been aggregating
-- 67% of the data and publishing the result as fact.
--
-- Measured against production on 2026-09-06:
--
--     kind               published   actual   understated by
--     location                 431      652        221  (34%)
--     title_seniority          231      353        122  (35%)
--     experience_years         248      363        115  (32%)
--     credential                12       19          7  (37%)
--
-- /audit is the product's single credibility artifact — "no competitor
-- publishes this" — and every figure on it was roughly a third low. That is
-- worse than publishing nothing, because it is checkable and wrong.
--
-- range() pagination does NOT solve this. It works, but it pulls the whole
-- table across the wire into a serverless function on every run, which is the
-- same O(index) memory blowup at a different layer. The aggregation belongs in
-- the database, where count(distinct) is one index scan.
--
-- The join to roles is deliberate and is not a no-op waiting to happen:
-- audit_daily.roles_indexed counts `roles where in_india`, so by_reason must
-- share that denominator or the two published numbers describe different
-- populations. Today every role is in_india, so the join changes nothing; the
-- day the index goes global it is the difference between a correct figure and
-- a quietly wrong one.

create or replace function audit_requirement_kinds()
returns table (kind text, roles bigint)
language sql
stable
as $$
  select r.kind, count(distinct r.role_id) as roles
  from role_requirements r
  join roles ro on ro.id = r.role_id
  where ro.in_india
  group by r.kind
$$;

comment on function audit_requirement_kinds is
  'Roles stating each requirement kind, counted in SQL. Replaces a JavaScript
   aggregation over a PostgREST select that was silently truncated at 1,000
   rows, understating every published figure on /audit by roughly a third.
   Counts DISTINCT role_id, not requirement rows — a posting repeating
   "5+ years" three times states one experience floor, not three.';

-- Only the ingest job needs this. The public /audit page reads the stored
-- audit_daily row, never this function.
revoke execute on function audit_requirement_kinds() from public;
grant execute on function audit_requirement_kinds() to service_role;
