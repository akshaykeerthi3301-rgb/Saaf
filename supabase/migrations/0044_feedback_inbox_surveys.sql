-- Saaf — feedback, an inbox and one-question surveys (2026-10-08, TASK-199;
-- F-1112, F-1110, F-1107).
--
-- feedback        what a candidate typed into "Send feedback", with the page they
--                 were on. Owner insert / read / delete. The founder reads them in
--                 the Supabase table editor (service role).
-- inbox_messages  messages FROM Saaf TO a candidate (user_id set) or to everyone
--                 (user_id null). NO insert policy: only the founder writes these,
--                 in the table editor. A candidate reads their own and the broadcasts.
-- inbox_reads     which messages a candidate has opened, so the bell can count unread.
-- survey_answers  one answer per candidate per survey (the survey itself lives in
--                 code: src/lib/surveys.ts), so asking again is impossible by design.
--
-- Everything here is owner-only or founder-written; nothing is visible to another
-- candidate. All of it goes with the account (cascade) and is in "Download my data".
--
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: each control says its update is missing.

create table if not exists feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('idea', 'problem', 'praise', 'other')),
  message    text not null check (char_length(message) between 3 and 2000),
  page       text check (char_length(page) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists feedback_recent on feedback (created_at desc);
alter table feedback enable row level security;
create policy "own feedback is readable"   on feedback for select to authenticated using (auth.uid() = user_id);
create policy "own feedback is insertable" on feedback for insert to authenticated with check (auth.uid() = user_id);
create policy "own feedback is deletable"  on feedback for delete to authenticated using (auth.uid() = user_id);

create table if not exists inbox_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 120),
  body       text not null check (char_length(body) between 1 and 2000),
  href       text check (href is null or href ~ '^/[A-Za-z0-9/_?=&.#%-]*$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists inbox_recent on inbox_messages (created_at desc);
alter table inbox_messages enable row level security;
create policy "read my messages and broadcasts" on inbox_messages
  for select to authenticated using ((user_id is null or user_id = auth.uid()) and (expires_at is null or expires_at > now()));

create table if not exists inbox_reads (
  user_id    uuid not null references auth.users (id) on delete cascade,
  message_id uuid not null references inbox_messages (id) on delete cascade,
  read_at    timestamptz not null default now(),
  primary key (user_id, message_id)
);
alter table inbox_reads enable row level security;
create policy "own reads" on inbox_reads for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists survey_answers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  survey_id  text not null check (char_length(survey_id) between 1 and 60),
  answer     text not null check (char_length(answer) between 1 and 40),
  note       text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, survey_id)
);
alter table survey_answers enable row level security;
create policy "own answers are readable"   on survey_answers for select to authenticated using (auth.uid() = user_id);
create policy "own answers are insertable" on survey_answers for insert to authenticated with check (auth.uid() = user_id);
create policy "own answers are deletable"  on survey_answers for delete to authenticated using (auth.uid() = user_id);
