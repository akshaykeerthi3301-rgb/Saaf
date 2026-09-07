-- Relevance-ordered role selection for the shortlist.
--
-- THE DEFECT THIS FIXES. src/lib/score-candidate.ts selected the candidate's
-- roles with `.order('last_seen_at', desc).limit(500)`. At 742 roles that cap
-- was never reached and the ordering did not matter. Past about ten thousand it
-- decides the product: a broad preferred role like "manager" matches thousands,
-- and the 500 the candidate is scored against become the 500 most recently
-- crawled — so their genuine best match is invisible because it is the 501st
-- newest. Silently. No error, no empty state, just a worse shortlist that looks
-- exactly like a good one. docs/CONFLICTS.md F3.
--
-- The fix is to rank before capping, and PostgREST cannot order by a computed
-- expression, so the query moves into the database.
--
-- ts_rank_cd rather than ts_rank: cover density counts how close the matched
-- lexemes are to each other, so "Product Manager" outranks "Manager, Product
-- Marketing Operations" for the query "product manager". That is the ordering a
-- candidate would call correct.
--
-- SECURITY INVOKER, DELIBERATELY. The default for a SQL function, and it is
-- load-bearing here: `roles` has RLS ("authenticated read roles" in 0002), and
-- src/app/dev/bench calls this with the request client precisely so its reads
-- stay under that policy. A SECURITY DEFINER function would quietly hand every
-- caller service-role visibility.

create or replace function public.roles_for_candidate(
  search    text,
  adjacent  boolean default false,
  max_rows  integer default 500
)
returns setof public.roles
language sql
stable
as $$
  with q as (
    select case
      -- The two tsquery shapes the TypeScript used to pick between. Strict is
      -- websearch_to_tsquery, which ANDs the terms, so every word must appear
      -- in the title. `open_to_adjacent` passes a pre-built 'a | b | c' string
      -- and gets to_tsquery, which ORs them — wider net, less precision, and
      -- the candidate opted into that trade knowingly. See migration 0012.
      when adjacent then to_tsquery('english', search)
      else websearch_to_tsquery('english', search)
    end as tsq
  )
  select r.*
  from public.roles r, q
  where r.in_india = true
    and r.title_tsv @@ q.tsq
  order by
    ts_rank_cd(r.title_tsv, q.tsq) desc,
    -- Freshness still breaks ties, so among equally relevant roles the newest
    -- wins. It is a tiebreak now, not the ordering.
    r.last_seen_at desc
  limit max_rows;
$$;

comment on function public.roles_for_candidate(text, boolean, integer) is
  'Roles matching a candidate''s preferred role, ordered by title relevance
   (ts_rank_cd over idx_roles_title_tsv) before the row cap is applied. Replaces
   an ordering by last_seen_at, which made the best match invisible once the
   index grew past the cap. Returns SETOF roles so PostgREST can still embed
   role_requirements(*).';

grant execute on function public.roles_for_candidate(text, boolean, integer)
  to anon, authenticated, service_role;
