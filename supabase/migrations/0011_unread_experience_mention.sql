-- Saaf — fail-visible instead of fail-open on the experience gate.
--
-- The gate had exactly two responses to a requirement: gate on it (confidence
-- >= 0.7) or ignore it entirely. There was no third state, so every extraction
-- failure silently became a false CLEARANCE — the exact harm this product
-- exists to prevent. A 2026-09-05 audit found 5 of 26 cleared roles (19%)
-- stated more experience than the candidate held, including one requiring
-- 7-10 years and one whose own title read "Exp- 6-8 Years".
--
-- Three extraction bugs behind that are fixed in src/gates/. This column is
-- the permanent backstop for the ones not yet discovered: when a description
-- talks about years of experience but no confident requirement could be read
-- from it, the role is flagged here and never presented as plainly cleared.
-- An unreadable posting then costs the candidate a stated caveat rather than
-- forty wasted minutes.
--
-- A property of the DESCRIPTION, not of any candidate — which is why it lives
-- on roles rather than gate_results, and needs no per-user recomputation.

alter table roles
  add column unread_experience_mention boolean not null default false;

comment on column roles.unread_experience_mention is
  'True when the description mentions years of experience but extraction
  produced no requirement confident enough to gate on. Set at ingest by
  mentionsUnreadExperience() in src/gates/extract.ts. Roles carrying this are
  shown with the limit stated and are excluded from the cleared count.';
