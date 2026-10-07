-- Saaf — what the ATS providers themselves say about pay, work mode and contract
-- type (2026-10-08, TASK-176, TASK-210; F-108, F-111, F-112, F-115).
--
-- Until now these were guessed: pay from a figure in the description text (2.6% of
-- Indian postings), "hybrid" or "contract" from the title. Several providers state
-- them in structured fields — measured 2026-10-08 (scripts/probe-provider-fields.ts):
-- Lever and Ashby state a work mode on ~100% of postings and a contract type on
-- 94–100%, Workable a contract type on 87%. The ingest now stores what they say.
--
--   pay_min, pay_max, pay_currency, pay_period   a range the provider PUBLISHES
--   work_mode        remote | hybrid | onsite     only when stated (never inferred)
--   employment_type  fulltime | parttime | contract | intern | temporary
--
-- NULL means "not stated", never a default: a false "remote" flag is not "on-site".
-- Pay is never estimated — structured pay on Indian postings is ~1% (see PROJECT-STATE
-- Stage AM-3), and these columns exist for the postings that do state it, which
-- includes the US roles of the Abroad mode (TASK-209).
--
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: the ingest probes the columns and skips
-- them; every read is its own tolerant query.

alter table roles
  add column if not exists pay_min         numeric,
  add column if not exists pay_max         numeric,
  add column if not exists pay_currency    text check (pay_currency is null or char_length(pay_currency) = 3),
  add column if not exists pay_period      text check (pay_period in ('year', 'month', 'hour')),
  add column if not exists work_mode       text check (work_mode in ('remote', 'hybrid', 'onsite')),
  add column if not exists employment_type text check (employment_type in ('fulltime', 'parttime', 'contract', 'intern', 'temporary'));

comment on column roles.work_mode is 'As stated by the ATS provider. NULL = not stated. Never inferred from the title or description.';
comment on column roles.employment_type is 'As stated by the ATS provider. NULL = not stated.';
comment on column roles.pay_min is 'A pay range the provider publishes (structured field). Never an estimate. See ingest/providers/fields.ts.';
