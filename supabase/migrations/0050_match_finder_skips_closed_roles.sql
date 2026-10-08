-- Saaf — the match-finder stops spending its slots on taken-down roles (2026-10-08, TASK-212 follow-up).
--
-- WHY
--   roles_for_candidates() ranks every India role whose title matches the candidate's roles and returns
--   the best `max_rows` (500 by default). Since 0035 the ingest stamps roles.closed_at on a role the
--   employer has taken down (24% of stored roles on 2026-10-08). The app already drops those rows after
--   the function returns (src/lib/score-candidate.ts, `.is('closed_at', null)`), but by then they have
--   taken slots in the 500 — on a search that matches more than 500 roles, open roles ranked just
--   below the cut are lost for nothing. This moves the filter inside the function, before the limit.
--
-- WHAT CHANGES
--   One added condition, `and r.closed_at is null`. Same name, same arguments, same return type, so
--   this REPLACES the function in place (no second overload for PostgREST to find ambiguous — the
--   trap 0022 documents) and the existing grants survive; they are restated at the end anyway.
--   SECURITY INVOKER, stable, SQL — all as 0022.
--
-- REQUIRES 0035 (roles.closed_at). Without it this file fails at creation ("column r.closed_at does
-- not exist") and leaves the old function in place — it cannot half-apply. 0035 is applied on production.
--
-- SAFE IN ANY ORDER WITH THE APP: the app filters closed roles itself, so the result is the same
-- before and after this runs; only the number of open roles that fit under the cap changes.
-- roles_for_candidate() (singular, 0020) is deliberately left alone: it is only the fallback for a
-- database that never got 0022, and the app filters its rows too.

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
    and r.closed_at is null
    and r.title_tsv @@ b.tsq
  order by
    ts_rank_cd(r.title_tsv, b.tsq) desc,
    r.last_seen_at desc
  limit max_rows;
$$;

comment on function public.roles_for_candidates(text[], boolean, integer) is
  'The union of every preferred role, ranked together by title relevance, open roles only (closed_at is
   null, 0050). One merged list rather than a section per role: a candidate wants the best
   opportunity, not one per job title. Supersedes roles_for_candidate(text,...),
   which is kept as the fallback for an unapplied migration.';

grant execute on function public.roles_for_candidates(text[], boolean, integer)
  to anon, authenticated, service_role;
