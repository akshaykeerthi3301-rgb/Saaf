-- Index for the two queries that scan on last_seen_at alone.
--
-- idx_roles_ingest is (in_india, function, last_seen_at desc). Postgres can use
-- a composite index only from its leading columns, so a predicate on
-- last_seen_at with no equality on `function` does not benefit from it. Two
-- hot paths are in exactly that position:
--
--   the prune          delete ... where board_id = any(...) and last_seen_at < cutoff
--   the shortlist      order by ts_rank_cd(...), last_seen_at desc
--
-- At 742 roles a sequential scan is free. At the tens of thousands this index
-- is being grown to, the daily prune is the longest statement in the run.
create index if not exists idx_roles_last_seen on public.roles (last_seen_at desc);

-- The prune filters by board first, then by date. A composite in that order
-- serves it directly instead of intersecting two indexes.
create index if not exists idx_roles_board_last_seen on public.roles (board_id, last_seen_at);

comment on index public.idx_roles_last_seen is
  'Serves the shortlist tiebreak and any bare last_seen_at range scan.
   idx_roles_ingest cannot: last_seen_at is its third column.';
comment on index public.idx_roles_board_last_seen is
  'Serves ingest/run.ts''s prune, which is scoped to the boards fully ingested
   in the current run and then filtered by last_seen_at.';
