-- Which of Saaf's database updates (0029 onward) are applied? Read-only: run it in the Supabase SQL editor.
-- Each line tests for one thing the update creates. 2026-10-08, against production, BEFORE applying: applied = 0029, 0030,
-- 0032, 0033; not applied = 0031 and 0034–0049 (0034 failed in the dashboard editor, which sent it truncated).
-- AFTER applying (same day): all 21 are applied.
select v.n as migration, v.applied from (values
 ('0029_rejected_stage', exists(select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='application_status' and e.enumlabel='rejected')),
 ('0030_feed_preferences', exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='hidden_role_ids')),
 ('0031_network_questions_coaching', exists(select 1 from information_schema.tables where table_schema='public' and table_name='coaches')),
 ('0032_role_reposts', exists(select 1 from information_schema.columns where table_schema='public' and table_name='roles' and column_name='repost_count')),
 ('0033_role_interest', exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='role_interest')),
 ('0034_resume_primary', exists(select 1 from information_schema.columns where table_schema='public' and table_name='resume_documents' and column_name='is_primary')),
 ('0035_tracker_signals', exists(select 1 from information_schema.columns where table_schema='public' and table_name='applications' and column_name='applied_via')),
 ('0036_job_reports', exists(select 1 from information_schema.tables where table_schema='public' and table_name='job_reports')),
 ('0037_saved_searches', exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='saved_searches')),
 ('0038_self_id', exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='self_id')),
 ('0039_service_flags', exists(select 1 from information_schema.tables where table_schema='public' and table_name='service_flags')),
 ('0040_search_history', exists(select 1 from information_schema.tables where table_schema='public' and table_name='search_history')),
 ('0041_role_provider_fields', exists(select 1 from information_schema.columns where table_schema='public' and table_name='roles' and column_name='pay_min')),
 ('0042_alert_settings', exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='alert_settings')),
 ('0043_connection_sources', exists(select 1 from information_schema.columns where table_schema='public' and table_name='connections' and column_name='source')),
 ('0044_feedback_inbox_surveys', exists(select 1 from information_schema.tables where table_schema='public' and table_name='feedback')),
 ('0045_credits_referrals', exists(select 1 from information_schema.tables where table_schema='public' and table_name='credit_ledger')),
 ('0046_answer_bank', exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='answer_bank')),
 ('0047_site_requests', exists(select 1 from information_schema.tables where table_schema='public' and table_name='site_requests')),
 ('0048_agent_settings', exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='agent_settings')),
 ('0049_office_hours', exists(select 1 from information_schema.tables where table_schema='public' and table_name='office_hours'))
) as v(n, applied) order by v.n;
