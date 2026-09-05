-- Saaf — skills and domain on the candidate profile.
--
-- The deterministic parser reaches five fields from fixed patterns and cannot
-- reach skills across arbitrary résumé layouts. A language model now reads
-- them (src/lib/parse/llm.ts) and the candidate confirms every one before
-- anything lands here — parse-then-confirm is what contains a hallucinated
-- skill, and it is why a model reading a résumé does not compromise the rule
-- that a model never decides eligibility.
--
-- These two columns switch on the skills component in src/match/score.ts,
-- which has shipped weighted at zero since Stage A. Candidate skills are
-- matched against a role's description text rather than against skills
-- extracted per role: one model call per résumé upload fits the free tier,
-- and one per role across the index would not.
--
-- Additive and nullable — a profile with no skills simply scores without that
-- component, and the score is normalised over the components that apply.

alter table profiles add column skills text[];
alter table profiles add column domain text;

comment on column profiles.skills is
  'Tools, systems and competencies read from the résumé by a model and
  confirmed by the candidate. Matched against role descriptions by
  src/match/score.ts. Never inferred at scoring time.';

comment on column profiles.domain is
  'Industry the candidate has worked in — fintech, SaaS, consumer. Read from
  the résumé, confirmed by the candidate.';
