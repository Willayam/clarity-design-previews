UPDATE access_grants SET kind='trial',ends_at='2026-11-09T12:00:00.000Z' WHERE id='grant:e2e-accounts:acct_workos_user_01M3PV8N4H36ZZPHGXFXWCQPM3';
INSERT INTO subscriptions (id,billing_subject_type,user_id,stripe_subscription_id,status,current_period_ends_at) VALUES ('proof-1634-sub','user','acct_workos_user_01M3PV8N4H36ZZPHGXFXWCQPM3','sub_proof_1634_mock','past_due','2026-11-09T12:00:00.000Z');
DELETE FROM subscriptions WHERE id='proof-1634-sub';
UPDATE access_grants SET kind='complimentary',ends_at='2030-01-01T00:00:00.000Z' WHERE id='grant:e2e-accounts:acct_workos_user_01M3PV8N4H36ZZPHGXFXWCQPM3';
