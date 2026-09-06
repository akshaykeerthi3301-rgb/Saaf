-- Saaf — make "Track this" actually save.
--
-- Every click of it has failed silently since the tracker shipped. The button
-- said "Tracked", and nothing was written.
--
-- Migration 0015 created the idempotency index as a PARTIAL one:
--
--     create unique index idx_applications_user_role
--       on applications (user_id, role_id) where role_id is not null;
--
-- PostgreSQL cannot infer a conflict target from a partial index unless the
-- statement repeats the index's WHERE predicate, and PostgREST's `onConflict`
-- parameter has no way to express a predicate. So the upsert in
-- src/app/actions/applications.ts failed on every call with
--
--     42P10 — there is no unique or exclusion constraint matching the
--             ON CONFLICT specification
--
-- The partial predicate was never needed. In a unique index NULLs are distinct
-- from one another, so a plain unique index on (user_id, role_id) already
-- permits any number of hand-added rows — which all carry role_id NULL — while
-- still allowing exactly one row per candidate per indexed role. Same guarantee,
-- and one that ON CONFLICT can actually see.

drop index if exists idx_applications_user_role;

create unique index idx_applications_user_role
  on applications (user_id, role_id);

comment on index idx_applications_user_role is
  'Idempotency for "Track this": one row per candidate per indexed role. NOT
   partial — a partial index cannot be used as an ON CONFLICT target through
   PostgREST, which is what made every track silently do nothing. Hand-added
   jobs carry a NULL role_id and are unconstrained, because NULLs are distinct
   in a unique index.';
