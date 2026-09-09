-- Saaf — saved résumés.
--
-- ⚠️ THIS REVERSES A PROMISE THE PRODUCT MADE ON THREE SCREENS, and it does so
-- on an explicit founder decision (2026-09-09) taken twice, in writing, after
-- the conflict was put to them. It is recorded here because a future session
-- reading "we never store documents" in docs/PROJECT-STATE.md needs to find
-- the reversal next to the thing that reverses it.
--
-- ⚠️ WHAT IS STORED IS NOT THE FILE THEY UPLOADED, and that distinction is the
-- whole reason this is defensible rather than a straight retreat. The PDF or
-- .docx is still parsed in memory and dropped inside the request — the upload
-- screen's promise and the privacy page's promise both stay literally true.
-- What lands here is the RÉSUMÉ THE CANDIDATE BUILT ON THIS SITE: the sections
-- they saw on screen, the fixes they accepted, the rewrite they approved. They
-- can read it, replace it and delete it, which is not true of a file sitting in
-- a bucket.
--
-- Why it exists: the category leader keeps a master résumé and scores it
-- against every role on their board. Without somewhere to keep a document, our
-- checker can only ever be a one-session tool — the candidate fixes their
-- résumé, closes the tab, and we know nothing about them tomorrow morning when
-- the ingest brings in 180 new boards' worth of roles.

create table resume_documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,

  -- What the candidate called it. Defaults to the role it was aimed at.
  label       text not null check (char_length(label) between 1 and 120),

  -- The role it was tailored for, so a saved résumé can be re-scored against
  -- the index without asking again.
  target_role text check (char_length(target_role) <= 120),

  -- ⚠️ THE DOCUMENT ITSELF, AS STRUCTURE RATHER THAN BYTES. jsonb because every
  -- surface that touches it — the preview, the .docx builder, the checker,
  -- scoreAgainstIndex — already works in ResumeSections. Storing text and
  -- re-parsing on every read would reintroduce the parser's ambiguity on a
  -- document the candidate has already corrected by hand.
  sections    jsonb not null,

  -- The plain text of the same document, so a re-score never has to rebuild it.
  -- Denormalised deliberately: it is derived, it is small, and the alternative
  -- is running sectionsToText() inside a query.
  body        text not null check (char_length(body) <= 40000),

  -- The score at the moment it was saved, for a "was 57, now 84" line later.
  score       integer check (score between 0 and 100),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index resume_documents_user_idx on resume_documents (user_id, updated_at desc);

alter table resume_documents enable row level security;

-- ⚠️ FOUR POLICIES, NOT ONE "for all". The candidate is the only author and the
-- only reader of their own documents; there is no admin path, no sharing, and
-- no employer side. Written out per operation so that adding one later is a
-- deliberate act rather than something that arrives free with `for all`.
create policy "own resumes are readable" on resume_documents
  for select using (auth.uid() = user_id);

create policy "own resumes are insertable" on resume_documents
  for insert with check (auth.uid() = user_id);

create policy "own resumes are updatable" on resume_documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own resumes are deletable" on resume_documents
  for delete using (auth.uid() = user_id);

-- ⚠️ A CAP, ENFORCED IN THE DATABASE. Without one, a saved-résumé feature is an
-- unbounded write surface on a free product: every "save" is a new row, and
-- nothing in the UI stops somebody holding a thousand. Ten is more versions
-- than anybody tailors in a week, and the action deletes the oldest rather than
-- refusing — a candidate should never lose work to a limit they did not know
-- about.
create or replace function enforce_resume_document_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from resume_documents
  where id in (
    select id from resume_documents
    where user_id = new.user_id
    order by updated_at desc
    offset 10
  );
  return new;
end;
$$;

create trigger resume_documents_cap
  after insert on resume_documents
  for each row execute function enforce_resume_document_cap();
