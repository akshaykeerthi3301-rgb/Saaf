-- Saaf — ranking replaces gating.
--
-- The product pivots to a Jobright-equivalent: every role scoped to the
-- candidate's preferred role is SCORED and RANKED, and nothing is ever
-- withheld. The deterministic gate is not deleted — requirement extraction in
-- src/gates/ is now the input to the score rather than to a refusal.
--
-- Three schema consequences:
--
-- 1. 'ranked' joins the outcome vocabulary. Existing rows keep their old
--    values until the next recompute overwrites them; nothing is migrated in
--    place, because the sweep in evaluate-user.ts rewrites every row anyway.
--
-- 2. gap_years was capped at 2.0 by a CHECK, because the Stretch tier was
--    capped there and anything beyond it was withheld outright. Under ranking
--    a role six years above the candidate is still shown and still needs its
--    real gap recorded, so the cap goes.
--
-- 3. score_breakdown carries the per-component working behind the number.
--    Jobright shows a Match Score with its reasoning; a bare number would
--    repeat the failure this codebase already has, where the displayed score
--    was 70 + posting-verbosity and never read the candidate at all.

alter table gate_results drop constraint if exists gate_results_outcome_check;
alter table gate_results add constraint gate_results_outcome_check
  check (outcome in ('cleared', 'withheld', 'stretch', 'ranked'));

alter table gate_results drop constraint if exists gate_results_gap_years_check;

alter table gate_results add column score_breakdown jsonb;

comment on column gate_results.score_breakdown is
  'Per-component working behind score: title affinity, seniority fit, location,
  work mode, credential. Written by scoreRole() in src/match/score.ts and
  rendered on the role card so every number can show its reasoning.';

comment on column gate_results.outcome is
  'Post-pivot this is always ''ranked'' — nothing is withheld. The older
  cleared/withheld/stretch values remain valid only for rows written before
  the ranking recompute.';
