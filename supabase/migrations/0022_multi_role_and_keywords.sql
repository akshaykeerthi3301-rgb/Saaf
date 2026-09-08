-- Multiple preferred roles, and the candidate's own keywords.
--
-- WHY BOTH IN ONE MIGRATION. They are the same product change: a candidate
-- saying "I am open to Product Manager or Program Manager, and I care about
-- payments and fintech". Splitting them would leave the UI half-built between
-- two founder-applied migrations.
--
-- ⚠️ preferred_role (SINGULAR) IS KEPT AND STILL WRITTEN. Every read path falls
-- back to it, so the app works whether or not this migration has been applied —
-- see src/lib/score-candidate.ts. Dropping it would make the deployed build
-- fail the moment it ran against a database that had not been migrated yet,
-- which is exactly the window this project's hand-applied migrations create.
-- It becomes droppable once preferred_roles is populated everywhere and the
-- fallback is removed, deliberately, in a later migration.

alter table profiles add column if not exists preferred_roles text[];
alter table profiles add column if not exists keywords text[];

comment on column profiles.preferred_roles is
  'Roles the candidate will consider, most wanted first. The shortlist is the
   union of all of them, scored and ranked together — see roles_for_candidates().
   preferred_role (singular) remains the fallback while this backfills.';

comment on column profiles.keywords is
  'The candidate''s own words for what they care about — "payments", "B2B SaaS",
   "Kubernetes". They BOOST ranking and hide nothing: a role matching none still
   appears. That is the Stage A lock ("never gate users out") applied to a
   feature that would otherwise be a filter.';

-- Backfill, so an existing candidate keeps their shortlist with no action.
update profiles
   set preferred_roles = array[preferred_role]
 where preferred_role is not null
   and (preferred_roles is null or cardinality(preferred_roles) = 0);

-- ---------------------------------------------------------------------------
-- The multi-role search.
--
-- ⚠️ A NEW NAME, NOT AN OVERLOAD. `create or replace function` cannot change an
-- argument list, so replacing roles_for_candidate(text, boolean, integer) in
-- place would create a SECOND function and PostgREST would see an ambiguous
-- overload — it resolves by argument names and would fail or pick wrongly.
-- The old function is left exactly as it is: src/lib/score-candidate.ts still
-- calls it as the fallback when this one is missing, which is what lets a
-- deployed build survive an unapplied migration.
--
-- SECURITY INVOKER, same as its predecessor and for the same reason: `roles`
-- has RLS, and the dev bench calls this with the request client precisely so
-- its reads stay under that policy.
create or replace function public.roles_for_candidates(
  searches  text[],
  adjacent  boolean default false,
  max_rows  integer default 500
)
returns setof public.roles
language sql
stable
as $$
  with per_role as (
    -- One tsquery per role. Postgres has the || operator for tsquery but NO
    -- aggregate over it, so each is rendered to its normalised text form and
    -- the pieces are joined below. Parenthesising each piece is what keeps a
    -- role's internal AND from binding loosely against the OR between roles.
    select
      case
        -- Strict: websearch_to_tsquery ANDs the words, so "product manager"
        -- still requires both. Adjacent: the words are OR'd within the role
        -- too — the wider net the candidate opted into. See migration 0012.
        when adjacent then to_tsquery('english', regexp_replace(btrim(s), '\s+', ' | ', 'g'))
        else websearch_to_tsquery('english', s)
      end as tsq
    from unnest(searches) s
    where btrim(s) <> ''
  ),
  built as (
    select string_agg('(' || tsq::text || ')', ' | ')::tsquery as tsq
    from per_role
    -- A role of nothing but stopwords normalises to an empty tsquery, which
    -- would poison the whole disjunction with a stray '()'.
    where tsq is not null and tsq::text <> ''
  )
  select r.*
  from public.roles r, built b
  where b.tsq is not null
    and r.in_india = true
    and r.title_tsv @@ b.tsq
  order by
    ts_rank_cd(r.title_tsv, b.tsq) desc,
    r.last_seen_at desc
  limit max_rows;
$$;

comment on function public.roles_for_candidates(text[], boolean, integer) is
  'The union of every preferred role, ranked together by title relevance. One
   merged list rather than a section per role: a candidate wants the best
   opportunity, not one per job title. Supersedes roles_for_candidate(text,...),
   which is kept as the fallback for an unapplied migration.';

grant execute on function public.roles_for_candidates(text[], boolean, integer)
  to anon, authenticated, service_role;
