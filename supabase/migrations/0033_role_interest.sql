-- Saaf — how many candidates are tracking a role (2026-10-08, TASK-177, F-107).
--
-- The compared product shows applicant counts. Saaf has no source for how many
-- people applied on an employer's site and will not invent one. What it does hold,
-- first-party, is how many of ITS candidates have the role in their own tracker —
-- so that is the number, and it is labelled as that.
--
-- WHY A SECURITY DEFINER FUNCTION. `applications` is owner-only by RLS (0015), so
-- no candidate can read another's rows — which is right. A count across users
-- needs a privileged read, and the safe way to give one is a function that can
-- return NOTHING BUT the count: no user id, no row, no status. Three guards:
--   * k-anonymity: a role with fewer than 3 trackers returns no row at all, so a
--     small number can never identify who is tracking it (3 is also the line the
--     card applies — src/lib/interest.ts);
--   * `set search_path = ''` and schema-qualified names, as every definer
--     function must, so a caller cannot shadow a table;
--   * at most 200 role ids per call, so it cannot be used to sweep the index.
-- Only open pipeline stages count: closed and rejected are not "tracking".
--
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: /today treats a missing function as
-- "no counts" and shows no chip.

create or replace function public.role_interest(role_ids uuid[])
returns table (role_id uuid, trackers integer)
language sql
stable
security definer
set search_path = ''
as $$
  select a.role_id, count(distinct a.user_id)::integer
  from public.applications a
  where a.role_id = any (role_ids[1:200])
    and a.status in ('saved', 'applying', 'applied', 'interviewing', 'offer')
  group by a.role_id
  having count(distinct a.user_id) >= 3
$$;

revoke all on function public.role_interest(uuid[]) from public, anon;
grant execute on function public.role_interest(uuid[]) to authenticated;

comment on function public.role_interest(uuid[]) is
  'Candidates tracking each role, only where 3 or more. Counts only; never returns who. See migration 0033.';
