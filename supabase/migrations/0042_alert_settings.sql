-- Saaf — per-candidate email alert settings (2026-10-08, TASK-180, F-122).
--
-- How often the digest comes (daily, weekly on a chosen weekday, or never), the
-- lowest match score worth an email, and how many roles it lists. The digest
-- (ingest/digest.ts) reads this per candidate; a candidate with no row keeps the
-- old behaviour: daily, 75 and above, five roles.
--
-- jsonb on `profiles`, owner-only by the existing policy. The shape is rebuilt
-- through a whitelist on every read (src/lib/alert-settings.ts).
--
-- NOTE: setting these does not make email arrive. Saaf's sending address is not a
-- verified domain yet (HANDOFF), so Resend delivers only to the account owner. The
-- screen says so in words; flip ALERT_EMAIL_LIVE in src/lib/alert-settings.ts once
-- a domain is verified.
--
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: the digest reads it in its own query and
-- falls back to the defaults; the settings screen says the update is missing.

alter table profiles
  add column if not exists alert_settings jsonb;

comment on column profiles.alert_settings is
  '{frequency: daily|weekly|off, weekday: 0-6 (IST, weekly only), minScore, maxJobs}. Whitelisted shape — see src/lib/alert-settings.ts.';
