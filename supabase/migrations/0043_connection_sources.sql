-- Saaf — where a contact came from, and the email of contacts the candidate
-- themselves supplied (2026-10-08, TASK-183 + TASK-184; F-307, F-308).
--
-- `connections` held one thing: the LinkedIn export, replaced whole on every
-- upload. Two more lawful sources join it, so each row now says where it came from
-- and an upload replaces only ITS OWN source:
--   linkedin  the candidate's LinkedIn export (email never kept — unchanged promise)
--   google    a Google Contacts / Outlook export the candidate uploaded
--   manual    a person the candidate typed in
--
-- `email` is kept ONLY for google and manual rows: it is the candidate's own address
-- book, shown back to them next to the company so they can write to someone they
-- already know. The check below makes a LinkedIn row with an email impossible, so the
-- "we never keep their email" sentence on the LinkedIn upload stays literally true.
-- Still owner-only and deleted with the account; never shared, never used to find
-- anyone else's address, and never guessed.
--
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: uploads fall back to the LinkedIn-only
-- behaviour and the screen says the update is missing.

alter table connections
  add column if not exists source text not null default 'linkedin' check (source in ('linkedin', 'google', 'manual')),
  add column if not exists email  text check (email is null or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'));

alter table connections
  add constraint connections_email_only_when_supplied check (email is null or source in ('google', 'manual'));

create index if not exists idx_connections_user_source on connections (user_id, source);

comment on column connections.source is 'linkedin | google | manual — an upload replaces only its own source.';
comment on column connections.email is 'The candidate''s OWN contact''s address, kept only for google and manual rows. Never for LinkedIn, never guessed.';
