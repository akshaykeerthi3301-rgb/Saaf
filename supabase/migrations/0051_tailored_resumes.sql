-- Jobinko — the résumé tailored for ONE job, kept with that job (2026-10-09, TASK-230).
--
-- In the reference product a tailored résumé lives per job ("tailor history"), NOT in the résumé library: the library
-- still reads "2 of 5" after a person tailors for a dozen jobs. Here the same — resume_documents keeps the person's own
-- résumés (ten slots, the oldest evicted), and a tailored copy used to be saved into it by hand, where a busy week of
-- tailoring would have pushed the real résumés out.
--
-- One row per (person, job). Opening "Customize your résumé" on a job that already has one offers to continue from it
-- instead of paying for another model run; the edits in the result screen save here as they are made.
--
-- role_id has no foreign key on purpose: a posting that is taken down must not delete the résumé someone built for it.
-- The title and company are copied so the row still names what it was for.
--
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: every read and write of this table is wrapped; without it the tailor result
-- simply does not save per job and "Customize your résumé" always starts fresh.

create table tailored_resumes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  role_id        uuid not null,
  role_title     text not null check (char_length(role_title) <= 200),
  company        text not null default '' check (char_length(company) <= 200),
  -- The saved résumé it was tailored FROM. Null if that one was later deleted — the copy stands on its own.
  base_resume_id uuid references resume_documents(id) on delete set null,
  sections       jsonb not null,
  -- The export drawer's choices (src/lib/resume-style.ts), so the page reopens looking the way it was left.
  style          jsonb,
  -- The ATS score when last saved, recomputed server-side against the posting.
  score          integer check (score between 0 and 100),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, role_id)
);

create index tailored_resumes_user_idx on tailored_resumes (user_id, updated_at desc);

alter table tailored_resumes enable row level security;

-- Four policies, not one "for all": the candidate is the only author and reader; there is no admin path and no
-- employer side.
create policy "own tailored resumes are readable" on tailored_resumes
  for select using (auth.uid() = user_id);
create policy "own tailored resumes are insertable" on tailored_resumes
  for insert with check (auth.uid() = user_id);
create policy "own tailored resumes are updatable" on tailored_resumes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own tailored resumes are deletable" on tailored_resumes
  for delete using (auth.uid() = user_id);

-- A cap in the database, as on resume_documents: a free product must not have an unbounded write surface. Two hundred
-- jobs is more than anyone tailors for; the oldest go first and the newest are never refused.
create or replace function enforce_tailored_resume_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from tailored_resumes
  where id in (
    select id from tailored_resumes
    where user_id = new.user_id
    order by updated_at desc
    offset 200
  );
  return new;
end;
$$;

create trigger tailored_resumes_cap
  after insert on tailored_resumes
  for each row execute function enforce_tailored_resume_cap();

comment on table tailored_resumes is
  'The résumé tailored for one job, per candidate. Not part of the ten-slot library. RLS: own rows only. Cap 200.';
