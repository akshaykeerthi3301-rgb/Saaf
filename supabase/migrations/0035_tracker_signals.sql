-- Saaf — two honest signals for the tracker (2026-10-08, TASK-162, F-713, F-804).
--
-- roles.closed_at / applications.role_closed_at
--   The ingest sees a board's COMPLETE posting list every run. A role it has
--   stored that the board no longer lists has been taken down by the employer.
--   That is evidence we hold and used to ignore until the 30-day prune deleted
--   the row — and the prune sets applications.role_id to NULL, so by then a
--   tracked card could no longer say its job was gone. The ingest therefore
--   stamps both columns on the same run, and applications keeps the date after
--   the role row is deleted. Only complete fetches stamp (a short read is not
--   evidence of removal), and a role that reappears is cleared.
--
-- applications.applied_via
--   'apply-for-me' when the extension submitted the application and saw the
--   employer's confirmation; 'manual' otherwise. Written only by the bridge
--   action (src/lib/services/extension-sync.ts) as the signed-in candidate.
--
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: the ingest probes the columns and skips
-- them, and the tracker reads them in a separate tolerant query.

alter table roles
  add column if not exists closed_at timestamptz;

alter table applications
  add column if not exists role_closed_at timestamptz,
  add column if not exists applied_via    text check (applied_via in ('apply-for-me', 'manual'));

comment on column roles.closed_at is
  'When the ingest first saw a COMPLETE board listing without this role. Null while listed; cleared if it reappears.';
comment on column applications.role_closed_at is
  'Copy of roles.closed_at kept on the application, because the prune deletes the role and nulls role_id.';
comment on column applications.applied_via is
  'apply-for-me = the extension submitted it and saw the employer confirmation; manual = anything else.';
