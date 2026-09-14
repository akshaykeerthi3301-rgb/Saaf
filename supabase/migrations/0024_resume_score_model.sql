-- Saaf — record WHICH SCORING MODEL produced a saved résumé's score.
--
-- ⚠️ WITHOUT THIS, MIGRATION 0023's STATED PURPOSE SILENTLY BREAKS. That file
-- keeps `score` for "a 'was 57, now 84' line later". On 2026-09-12 the scoring
-- model changed shape — from a flat `100 − Σ severity costs` to two parts, a
-- parse-coverage rate plus a weighted content score — so a number stored before
-- that date and a number computed after it are not the same kind of thing. A
-- "was 57, now 84" built across the change would compare two different rulers
-- and present the difference as progress the candidate made.
--
-- The old numbers are not merely stale, they are WRONG in a specific way: they
-- were produced by a parser that returned one line per page for every PDF, so
-- thirteen of the checker's rules never ran and every PDF carried two automatic
-- high-severity findings the document had not earned. Preserving those figures
-- preserves a measurement error. They are recomputed rather than kept, which is
-- possible only because 0023 stores `body` alongside `sections` — the
-- denormalisation it called "derived, small" turns out to be what makes the
-- model migratable at all.
--
-- Applied by hand in the Supabase SQL editor, per CLAUDE.md. Run
-- `npm run rescore:saved` afterwards to backfill, then `npm run verify:rls` to
-- confirm the eight resume_documents policies still hold.

alter table resume_documents
  add column if not exists score_model text not null default 'v1'
    check (score_model in ('v1', 'v2'));

comment on column resume_documents.score_model is
  'Which scoring model produced `score`. v1 = flat subtractive, pre-2026-09-12, '
  'computed over a PDF parser that could not read line structure. v2 = parse '
  'coverage + weighted content. Never compare a v1 score to a v2 score.';

-- Existing rows keep 'v1' until the backfill rescores them. New rows are
-- written as 'v2' by the application, so the default is deliberately the OLD
-- value: a row that arrives without one predates this change by definition.
