-- Saaf — a credits ledger, promo codes and a referral programme (2026-10-08,
-- TASK-197 + TASK-198; F-1102, F-1103, F-1104, F-1105, F-1210).
--
-- ⚠️ NOTHING IS FOR SALE YET (TASK-170). Credits exist so the mechanics are proven and
-- the first paid feature has somewhere to charge; today no action costs one, and the
-- screens say so. The money rules are the ones that matter and are enforced HERE:
--
--   credit_ledger   append-only. A candidate can READ their own rows and can do nothing
--                   else — no insert, update or delete policy exists. Rows are written
--                   only by the SECURITY DEFINER functions below (or the service role).
--                   (user_id, ref) is unique, so a retry, a double click or a replayed
--                   request cannot pay out twice.
--   credit_balance()    the sum of the caller's own rows.
--   spend_credits()     takes a per-candidate lock, refuses to go below zero, idempotent on ref.
--   promo_codes     founder-written, RLS on with NO policy (service role only).
--   redeem_promo()      validates active / unexpired / not used up / not used by this candidate
--                       before and inside one transaction.
--   referrals       who invited whom. my_referral_code() makes a candidate's code on first
--                   ask; claim_referral() accepts only a NEW account (made in the last two
--                   days), never your own code, and only once per account, and credits both
--                   sides through the ledger. A referrer is paid for at most 20 people:
--                   instant sign-in lets anyone make accounts with any typed address, so an
--                   uncapped reward would be farmable the day credits become spendable.
--
-- Every definer function pins search_path to '' and schema-qualifies what it touches.
-- SAFE TO DEPLOY BEFORE THIS IS APPLIED: the wallet panel says its update is missing.

create table if not exists credit_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  delta      integer not null check (delta <> 0),
  reason     text not null check (reason in ('promo', 'referral', 'referral-welcome', 'grant', 'spend', 'refund')),
  ref        text check (char_length(ref) <= 120),
  note       text check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);
create unique index if not exists credit_ledger_once on credit_ledger (user_id, ref) where ref is not null;
create index if not exists credit_ledger_recent on credit_ledger (user_id, created_at desc);
alter table credit_ledger enable row level security;
create policy "own ledger is readable" on credit_ledger for select to authenticated using (auth.uid() = user_id);

create table if not exists promo_codes (
  code       text primary key check (code = upper(code) and char_length(code) between 4 and 40),
  credits    integer not null check (credits > 0 and credits <= 100000),
  max_uses   integer check (max_uses is null or max_uses > 0),
  uses       integer not null default 0,
  expires_at timestamptz,
  active     boolean not null default true,
  note       text check (char_length(note) <= 200)
);
alter table promo_codes enable row level security;  -- no policy: service role only

create or replace function public.credit_balance()
returns integer
language sql
stable
set search_path = ''
as $$ select coalesce(sum(delta), 0)::integer from public.credit_ledger where user_id = auth.uid() $$;

create or replace function public.spend_credits(p_amount integer, p_ref text, p_note text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null or p_amount is null or p_amount <= 0 or p_ref is null or p_ref = '' then return false; end if;
  perform pg_advisory_xact_lock(hashtext(v_user::text));
  if exists (select 1 from public.credit_ledger where user_id = v_user and ref = p_ref) then return true; end if;  -- already charged
  if (select coalesce(sum(delta), 0) from public.credit_ledger where user_id = v_user) < p_amount then return false; end if;
  insert into public.credit_ledger (user_id, delta, reason, ref, note) values (v_user, -p_amount, 'spend', p_ref, left(p_note, 200));
  return true;
end $$;

create or replace function public.redeem_promo(p_code text)
returns table (ok boolean, credits integer, message text)
language plpgsql
security definer
set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_code text := upper(btrim(coalesce(p_code, ''))); v_row public.promo_codes%rowtype;
begin
  if v_user is null then return query select false, 0, 'Sign in first.'; return; end if;
  perform pg_advisory_xact_lock(hashtext(v_user::text));
  select * into v_row from public.promo_codes where code = v_code for update;
  if not found or not v_row.active or (v_row.expires_at is not null and v_row.expires_at < now()) then
    return query select false, 0, 'That code is not valid.'; return;
  end if;
  if v_row.max_uses is not null and v_row.uses >= v_row.max_uses then
    return query select false, 0, 'That code has been used up.'; return;
  end if;
  if exists (select 1 from public.credit_ledger where user_id = v_user and ref = 'promo:' || v_code) then
    return query select false, 0, 'You have already used that code.'; return;
  end if;
  insert into public.credit_ledger (user_id, delta, reason, ref, note) values (v_user, v_row.credits, 'promo', 'promo:' || v_code, v_row.note);
  update public.promo_codes set uses = uses + 1 where code = v_code;
  return query select true, v_row.credits, 'Added ' || v_row.credits || ' credits.';
end $$;

alter table profiles add column if not exists referral_code text unique;

create table if not exists referrals (
  referred_id uuid primary key references auth.users (id) on delete cascade,
  referrer_id uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  check (referred_id <> referrer_id)
);
create index if not exists referrals_by_referrer on referrals (referrer_id);
alter table referrals enable row level security;
create policy "see referrals you are part of" on referrals for select to authenticated using (auth.uid() in (referrer_id, referred_id));

create or replace function public.my_referral_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_code text; v_try integer := 0;
begin
  if v_user is null then return null; end if;
  select referral_code into v_code from public.profiles where id = v_user;
  if v_code is not null then return v_code; end if;
  if not exists (select 1 from public.profiles where id = v_user) then return null; end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      update public.profiles set referral_code = v_code where id = v_user and referral_code is null;
      return coalesce((select referral_code from public.profiles where id = v_user), v_code);
    exception when unique_violation then
      v_try := v_try + 1; if v_try > 5 then return null; end if;
    end;
  end loop;
end $$;

create or replace function public.claim_referral(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_ref uuid; v_made timestamptz; v_reward constant integer := 10; v_cap constant integer := 20;
begin
  if v_user is null then return 'signed-out'; end if;
  select id into v_ref from public.profiles where referral_code = upper(btrim(coalesce(p_code, '')));
  if v_ref is null then return 'unknown'; end if;
  if v_ref = v_user then return 'self'; end if;
  if exists (select 1 from public.referrals where referred_id = v_user) then return 'already'; end if;
  if (select count(*) from public.referrals where referrer_id = v_ref) >= v_cap then return 'capped'; end if;
  select created_at into v_made from auth.users where id = v_user;
  if v_made is null or v_made < now() - interval '2 days' then return 'too-late'; end if;
  insert into public.referrals (referred_id, referrer_id) values (v_user, v_ref);
  insert into public.credit_ledger (user_id, delta, reason, ref) values (v_ref, v_reward, 'referral', 'referral:' || v_user) on conflict do nothing;
  insert into public.credit_ledger (user_id, delta, reason, ref) values (v_user, v_reward, 'referral-welcome', 'referral-welcome:' || v_user) on conflict do nothing;
  return 'ok';
end $$;

revoke all on function public.credit_balance(), public.spend_credits(integer, text, text), public.redeem_promo(text), public.my_referral_code(), public.claim_referral(text) from public, anon;
grant execute on function public.credit_balance(), public.spend_credits(integer, text, text), public.redeem_promo(text), public.my_referral_code(), public.claim_referral(text) to authenticated;
