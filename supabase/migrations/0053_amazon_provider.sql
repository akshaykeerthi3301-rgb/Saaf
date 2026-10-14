-- Jobinko — allow company career-site providers: Amazon and Oracle Recruiting Cloud (2026-10-15).
--
-- Not an ATS: amazon.jobs/en/search.json is the feed the careers site's search
-- page calls. Same posture as Workday (0019) — robots.txt allows it (only
-- /internal* is disallowed), nothing is bypassed — EXCEPT that Amazon's site
-- terms could not be located, so whether they forbid automated collection is
-- UNREAD. The founder chose to build it on 2026-10-15; every career-site provider is
-- off unless the environment variable CAREER_SITES lists it (ingest/providers/career-switch.ts).
--
-- amazon:    token is the country filter, e.g. IND.
-- oraclehcm: Oracle Recruiting Cloud (/hcmRestApi/.../recruitingCEJobRequisitions),
--            token is host/siteNumber, e.g. jpmc.fa.oraclecloud.com/CX_1001.

alter table boards drop constraint if exists boards_provider_check;

alter table boards add constraint boards_provider_check
  check (provider in
    ('greenhouse','lever','ashby','workable','recruitee','smartrecruiters','workday','amazon','oraclehcm'));
