-- Location, work-mode, and salary preference — collected, and used honestly.
--
-- profiles.city already IS the location preference (it's the location gate's
-- own input, src/gates/evaluate.ts) — no new column for that. Work mode is
-- new: a stated preference used only to reorder a candidate's own
-- already-gated shortlist, never a new hard gate — a role never gets
-- withheld over it. Salary expectation is collected and displayed back
-- honestly as not-yet-matchable: no job posting in this system carries
-- structured salary data, so there is nothing to compare it against yet.

alter table profiles add column work_mode_preference text
  check (work_mode_preference in ('remote', 'hybrid', 'onsite', 'no_preference'));

alter table profiles add column salary_expectation text;

comment on column profiles.work_mode_preference is
  'Candidate-stated preference, used only to reorder their own already-gated
  shortlist (see src/app/(app)/today/page.tsx). Never a hard gate — never
  withholds a role. src/gates/evaluate.ts does not read this column.';
comment on column profiles.salary_expectation is
  'Free text. Never gated or filtered on — no role in this system carries
  salary data to compare it against. Collected and shown back to the
  candidate with that limitation stated plainly.';
