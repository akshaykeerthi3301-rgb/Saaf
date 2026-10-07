-- Saaf — one primary résumé, and a slot rule that protects it (2026-10-08,
-- TASK-163, F-501).
--
-- A candidate who keeps several tailored versions still needs ONE that means
-- "my résumé": it is the default in the tailoring studio and the one the
-- extension fills applications from. Until now that was "whichever was saved
-- last", which changes every time they tweak a version for one job.
--
-- is_primary: at most one per candidate, enforced by a partial unique index so
-- no code path can write two. Setting one clears the other first
-- (src/lib/services/resume-documents.ts).
--
-- THE SLOT RULE. The table holds ten résumés per candidate (0023). The cap
-- trigger deleted the oldest beyond ten — which could be the primary, silently.
-- It now never deletes the primary, and counts it as one of the ten: with a
-- primary, nine others are kept. The screen says so (src/lib/resume-slots.ts).
--
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: the list read falls back to the old
-- column set, and the screen says "Make primary" needs this update.

alter table resume_documents
  add column if not exists is_primary boolean not null default false;

create unique index if not exists resume_documents_one_primary
  on resume_documents (user_id) where is_primary;

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
    where user_id = new.user_id and not is_primary
    order by updated_at desc
    offset greatest(
      10 - (select count(*) from resume_documents where user_id = new.user_id and is_primary),
      0
    )
  );
  return new;
end;
$$;

comment on column resume_documents.is_primary is
  'The candidate''s main résumé. At most one per user (partial unique index); never evicted by the ten-document cap.';
