-- Saaf — row level security and indexes
-- Per docs/PRD.md § 9. Role-Based Access and § 3. Indexes.
-- A table without RLS is public. Every table below gets it in this migration.

alter table boards            enable row level security;
alter table roles             enable row level security;
alter table role_requirements enable row level security;
alter table profiles          enable row level security;
alter table gate_results      enable row level security;
alter table refusal_reports   enable row level security;
alter table audit_daily       enable row level security;

-- boards: NO user-facing policy. The registry is the moat; service role only.
-- RLS is enabled with zero policies, which denies all access to anon and authenticated.

create policy "authenticated read roles" on roles
  for select to authenticated using (true);

create policy "authenticated read requirements" on role_requirements
  for select to authenticated using (true);

create policy "own profile" on profiles
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- gate_results are written by the ingest job under the service role.
-- Users read their own; there is deliberately no user-facing insert or update policy.
create policy "own results" on gate_results
  for select to authenticated using (auth.uid() = user_id);

create policy "own reports" on refusal_reports
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The landing page reads this signed out.
create policy "public read audit" on audit_daily
  for select to anon, authenticated using (true);

-- Indexes. Each exists for a named query; see docs/PRD.md § 3. Indexes.
create index idx_roles_ingest      on roles (in_india, function, last_seen_at desc);
create index idx_roles_board       on roles (board_id);
create index idx_role_req_role     on role_requirements (role_id, kind);
create index idx_gate_user_outcome on gate_results (user_id, outcome, computed_at desc);
create index idx_gate_role         on gate_results (role_id);
create index idx_reports_open      on refusal_reports (resolved_at) where resolved_at is null;

comment on index idx_gate_user_outcome is
  'The shortlist query. Success criterion 1 (under 90 seconds) rests on this index.';
