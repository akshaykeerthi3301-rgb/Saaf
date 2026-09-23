-- Saaf — the workspace parity pass (2026-09-23, founder direction).
--
-- Three things the rebuilt screens store, and nothing else:
--
--   1. A sixth tracker column. The board is now Saved → Applying → Applied →
--      Interviewing → Offer → Archived. "Archived" is the existing 'closed'
--      value relabelled in the UI, so no row moves; 'applying' is new — the
--      stage between deciding and submitting, where the tailored résumé and
--      cover letter are being prepared.
--   2. The application record: when it was applied, which résumé went, the pay
--      discussed, the interview date, and when it last changed stage (the
--      follow-up writer words its email by time-in-stage, and updated_at moves
--      on every note edit, so it cannot answer that).
--   3. Preferences the onboarding matrix collects: seniority, target cities,
--      a pay floor with its currency, and a job-search status for the sidebar.
--
-- ⚠️ NO NEW RLS POLICIES, AND THAT IS CORRECT. `applications` carries "own
-- applications" and `profiles` carries "own profile", both `for all` scoped to
-- auth.uid(). New columns inherit them.
--
-- ⚠️ THE APP DEGRADES WITHOUT THIS FILE RATHER THAN BREAKING. Reads of the new
-- columns go through src/lib/services/workspace.ts, which falls back to the
-- old column set on error; a move into 'applying' fails, rolls the card back
-- and says why. Apply it before deploying anyway — until then the new fields
-- simply do not save.
--
-- ⚠️ `alter type … add value` cannot run inside a transaction block that also
-- uses the new value. The SQL editor runs each statement on its own, so paste
-- the file whole; nothing below uses 'applying'.

alter type application_status add value if not exists 'applying' after 'saved';

alter table applications
  add column if not exists applied_on        date,
  add column if not exists resume_version    text,
  add column if not exists salary_note       text,
  add column if not exists interview_on      date,
  add column if not exists status_changed_at timestamptz not null default now();

comment on column applications.resume_version is
  'Label of the saved résumé (resume_documents.label) the candidate sent. Free '
  'text rather than a foreign key: deleting a saved résumé must not rewrite '
  'the history of which one went where.';
comment on column applications.status_changed_at is
  'When the row last moved column. Drives the follow-up email wording '
  '("it has been 9 days since I applied"). updated_at cannot: notes move it.';

alter table profiles
  add column if not exists seniority       text
    check (seniority in ('entry', 'mid', 'senior', 'lead', 'executive')),
  add column if not exists target_cities   text[],
  add column if not exists salary_min      integer check (salary_min is null or salary_min >= 0),
  add column if not exists salary_currency text check (salary_currency in ('INR', 'USD', 'EUR')),
  add column if not exists search_status   text
    check (search_status in ('active', 'open', 'closed'));

comment on column profiles.salary_min is
  'Annual pay floor in salary_currency. Collected and shown back; never a '
  'score component or a filter, because 2.2% of postings state pay and '
  'nothing extracts it (PROJECT-STATE Stage T).';
comment on column profiles.target_cities is
  'Cities beyond profiles.city the candidate would work in. Display and '
  'filtering only; the scorer still reads profiles.city.';
