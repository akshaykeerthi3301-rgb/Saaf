-- Saaf — repost evidence on roles (2026-10-08, TASK-174, F-117).
--
-- The ingest collapses an employer's repeated listings of one title+location to a
-- single row (ingest/dedupe.ts) and used to throw the others away, with the only
-- evidence that the job had been listed before. These two columns keep it:
--   first_posted_at  the earliest posting date any copy of this job carried
--   repost_count     how many EARLIER copies the ingest has seen
-- The card says "Reposted" only when the gap to this copy's own date is a week or
-- more (src/lib/repost.ts); a bare second copy can be a second vacancy.
--
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: the ingest probes for the columns and
-- skips them when absent, and /today reads them in a separate tolerant query.

alter table roles
  add column if not exists first_posted_at timestamptz,
  add column if not exists repost_count    smallint not null default 0;

comment on column roles.first_posted_at is
  'Earliest posting date among the copies of this title+location the ingest has seen. Evidence, not a verdict — see src/lib/repost.ts.';
comment on column roles.repost_count is
  'How many earlier copies of this title+location the ingest has seen on this board.';
