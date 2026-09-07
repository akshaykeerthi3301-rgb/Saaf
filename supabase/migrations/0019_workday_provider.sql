-- Saaf — allow Workday as a board provider.
--
-- The six providers in 0001 are all published job-board APIs. Workday is the
-- ATS behind most large enterprises hiring into India, and it is the segment
-- the registry has no coverage of at all: the index is startups and scale-ups
-- because that is who uses Greenhouse, Lever and Ashby.
--
-- Measured before writing this: a single Workday tenant (NVIDIA) returns 280
-- India-matching postings, against 742 in the entire index.
--
-- ON THE SOURCING RULE. `/wday/cxs/{tenant}/{site}/jobs` is the endpoint the
-- career site's own search box calls. It is not a documented public API, which
-- is a real difference from Greenhouse's board API — and this repo killed
-- LinkedIn and Naukri over exactly that kind of difference. What separates it:
-- Workday's robots.txt explicitly ALLOWS the career-site path and publishes a
-- sitemap for it, disallowing only /talentcommunity/ and /refreshFacet/; the
-- JSON carries the same postings the permitted HTML pages render; and no login,
-- token or paywall is bypassed to read it. LinkedIn's terms forbid automated
-- access outright and were litigated. Those are not the same posture.
--
-- Decided by the founder on 2026-09-07, recorded here so the reasoning travels
-- with the schema rather than living in a chat log.
--
-- The token for a Workday board is "host/site", e.g.
-- nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite — both halves are
-- needed to address the endpoint, and neither is derivable from the other.

alter table boards drop constraint if exists boards_provider_check;

alter table boards add constraint boards_provider_check
  check (provider in
    ('greenhouse','lever','ashby','workable','recruitee','smartrecruiters','workday'));
