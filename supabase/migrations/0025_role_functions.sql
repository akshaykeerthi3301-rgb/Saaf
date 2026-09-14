-- Saaf — four more functions on roles: sales, operations, support, design.
--
-- ⚠️ THIS MIGRATION MUST BE APPLIED BEFORE THE CODE THAT NEEDS IT DEPLOYS.
-- `roles.function` carries a CHECK constraint naming the six values 0001
-- allowed. `ingest/classify.ts` now returns four more, so an ingest run against
-- the old constraint does not mislabel a role — it FAILS THE INSERT, and the
-- daily run drops every sales, operations, support and design posting it found.
-- Same ordering rule as Stage C's deploy: the schema goes first, then the
-- behaviour that depends on it.
--
-- WHY. A teardown on 2026-09-14 measured 44.2% of the India index sitting in
-- `other`. That bucket is invisible to `coverageByFunction()`, which feeds the
-- one message a candidate sees when their shortlist comes back thin — and that
-- message names the functions we cover. A sales candidate was therefore shown
-- "Engineering 9,096 · Consulting 1,916 · Finance 1,107 · Marketing 412 · HR
-- 375", five functions with no sales among them, while 1,390 live sales roles
-- sat in the index unnamed. The panel exists to attribute a thin list to OUR
-- coverage rather than to the candidate; omitting a function inverts it into a
-- false statement about our coverage.
--
-- WHAT IT DOES NOT DO. `roles.function` feeds the coverage panel and nothing
-- else — migration 0010 replaced function-bucket equality with free-text
-- matching against `title_tsv`, so retrieval and scoring never read this column.
-- No score changes. No shortlist changes. This is a disclosure fix.
--
-- The classifier's new patterns are APPENDED, so they can only claim titles the
-- existing five already declined; no role changes function except out of
-- `other`. Measured over all 23,184 India roles: other 44.2% -> 32.8%.
--
-- `profiles.function` is deliberately untouched. Migration 0010 retired it in
-- favour of `profiles.preferred_role` free text and left the column in place
-- unused; widening a constraint on a dead column would imply it is read.

alter table roles drop constraint if exists roles_function_check;

alter table roles add constraint roles_function_check
  check (function in (
    'engineering','finance','marketing','consulting','hr',
    'sales','operations','support','design',
    'other'
  ));

comment on column roles.function is
  'Coarse function bucket from ingest/classify.ts, first-match-wins over the '
  'title. Feeds the thin-shortlist coverage panel ONLY — retrieval and scoring '
  'do not read it (see 0010). "other" is the honest remainder, ~33% of the '
  'index, and is never shown to a candidate as a coverage row.';

-- BACKFILL IS NOT DONE HERE, ON PURPOSE.
--
-- The obvious move is four `update roles set function = ...` statements with
-- the classifier's regexes transcribed into Postgres ARE syntax. That was
-- written and then deleted: it is the same rules in a second dialect, checked
-- by nobody, and the first time ingest/classify.ts changes the two disagree
-- silently — with SQL as the version no test covers.
--
-- `scripts/reclassify-roles.ts` calls `classifyFunction` itself, so there is
-- exactly one definition of what a sales role is. It follows the shape 0024's
-- backfill established:
--
--   npm run reclassify:roles            # dry run — prints the before/after table
--   npm run reclassify:roles -- --write # apply
--
-- Check the result afterwards. Expect roughly: engineering 9125 · other 7595 ·
-- consulting 1917 · sales 1390 · finance 1107 · operations 640 · marketing 412
-- · hr 375 · support 314 · design 309. Exact figures drift with the index.
--
--   select function, count(*) from roles where in_india group by 1 order by 2 desc;
