-- Real gate questions for marketing, consulting, and HR — asked, not gated on.
--
-- productos/design/3-Onboarding-Flow.md already specifies a real question per
-- function; only finance and engineering were ever built, and marketing,
-- consulting and HR got a placeholder "Understood" instead. docs/PRD.md §13
-- deliberately defers the GATING logic for these three (extraction +
-- evaluation) until engineering and finance prove out over two weeks — this
-- migration only adds storage for the answer, so it's ready when that
-- decision is revisited on its own terms. src/gates/evaluate.ts never reads
-- these columns.

alter table profiles add column channel_budget text;
alter table profiles add column institute_tier text;
alter table profiles add column hr_track text;

comment on column profiles.channel_budget is
  'Marketing''s onboarding answer to "largest paid budget you''ve owned" —
  collected, not yet gated on. See docs/PRD.md §13 (deferred gates).';
comment on column profiles.institute_tier is
  'Consulting''s onboarding answer to "where did you study?" — collected,
  not yet gated on. See docs/PRD.md §13 (deferred gates).';
comment on column profiles.hr_track is
  'HR''s onboarding answer to "recruitment or generalist?" — collected,
  not yet gated on. See docs/PRD.md §13 (deferred gates).';
