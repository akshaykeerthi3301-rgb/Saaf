-- Saaf — free-text preferred-role matching, replacing the function bucket.
--
-- The candidate's function was previously guessed from their résumé (a
-- whole-document, first-match-wins keyword scan) and used as an exact-bucket
-- filter against roles.function. A Product Management / Founder's Office /
-- Consulting résumé reliably tripped an unrelated keyword ("financial",
-- "architect") before ever reaching a consulting keyword, misrouting the
-- candidate to the wrong bucket entirely. The founder's fix: stop guessing —
-- ask the candidate directly what role they want, and match on that text.
--
-- Additive only. profiles.function and its three unused sibling columns
-- (channel_budget, institute_tier, hr_track — declared in role_requirements'
-- kind check and RequirementKind, never actually produced by src/gates/ or
-- ingest/) are dropped in a LATER, separate migration (0011) once this one's
-- dependent code has deployed and been confirmed live. roles.function is not
-- touched here — it stays as ingest's own internal classification.

alter table profiles add column preferred_role text;

comment on column profiles.preferred_role is
  'Free text: "what job role are you looking for?" Replaces profiles.function
  as the candidate-facing matching key. src/lib/evaluate-user.ts matches this
  against roles.title_tsv instead of an exact function-bucket equality.';

-- Title-only, mirroring ingest/classify.ts's own title-only precedent for
-- roles.function — role descriptions are untrusted third-party text and
-- noisy; a free-text candidate query is more exposed to incidental
-- description-word collisions than a fixed taxonomy ever was.
alter table roles add column title_tsv tsvector
  generated always as (to_tsvector('english', coalesce(title, ''))) stored;

create index idx_roles_title_tsv on roles using gin (title_tsv);

comment on index idx_roles_title_tsv is
  'Candidate preferred_role matched via websearch_to_tsquery in
  src/lib/evaluate-user.ts. Replaces the in_india + function-bucket-equality
  filter that used to drive this query.';
