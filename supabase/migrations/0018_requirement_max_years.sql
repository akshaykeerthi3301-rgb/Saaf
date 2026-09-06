-- Saaf — the upper bound of a stated experience range.
--
-- Postings state experience two ways, and until now we stored them
-- identically. "5+ years" has a floor and no ceiling. "1 - 5 years" has both.
-- extractExperienceYears() has always matched the second number — it is right
-- there in the regex as group 2 — and then dropped it on the floor, so both
-- arrived as min_years = 1 with nothing to say where the band ended.
--
-- The consequence was that over-qualification could not be read at all. A
-- candidate with twelve years against a "1 - 5 years" posting looked exactly
-- like the same candidate against "1+ years", and the scorer fell back to a
-- guess — held > required + 8 — which invented a ceiling the posting had never
-- stated. That guess is deleted with this column: where a posting states no
-- upper bound, we now assert none.
--
-- NULL is meaningful and is the common case. It means "this posting stated no
-- ceiling", not "we did not look" — a bare "5+ years" is an open-ended
-- requirement and scoring it as one is the honest reading.
--
-- Additive and nullable, so every existing row stays valid. The 1,496 rows
-- already stored keep max_years NULL until the next ingest re-extracts them,
-- which happens daily and rewrites requirements wholesale.

alter table role_requirements add column max_years numeric;

comment on column role_requirements.max_years is
  'Upper bound of a stated experience range: 5 for "1 - 5 years". NULL when the
  posting states a floor with no ceiling ("5+ years", "6-8+ years") — that is an
  open-ended requirement, and over-qualification is not scored against it.
  Written by ingest/run.ts from src/gates/extract.ts, never inferred at scoring
  time.';
