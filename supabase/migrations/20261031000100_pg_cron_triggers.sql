-- pg_cron scheduler for the Vercel deployment.
--
-- Vercel Hobby only allows once-a-day cron, so Supabase pg_cron (free, minute-level) calls the
-- authenticated trigger endpoints instead:
--     POST {app_url}/api/internal/cron/:job      (jobs: CRON_JOBS in server/cronScheduler.ts)
--     POST {app_url}/api/internal/queue/drain    (pipeline queue drain)
--
-- NOT applied by `drizzle-kit`/migrate.ts (it needs extensions + Vault secrets). Apply it with the
-- Supabase SQL editor or `supabase db push`, AFTER creating the two Vault secrets (once, by hand):
--
--     select vault.create_secret('https://www.talk-to-my-lawyer.com', 'ttml_app_url');
--     select vault.create_secret('<same value as the CRON_SECRET env var on Vercel>', 'ttml_cron_secret');
--
-- Rotate with:  select vault.update_secret(id, '<new>') from vault.secrets where name = 'ttml_cron_secret';
-- Inspect runs: select * from cron.job_run_details order by start_time desc limit 20;
--               select id, status_code, error_msg from net._http_response order by created desc limit 20;
--
-- Idempotent: cron.schedule() upserts by job name, so re-running this file is safe.
-- Keep the schedules in sync with CRON_JOBS (server/vercel-deploy.test.ts enforces this).
-- Times are UTC.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- A private schema: PostgREST only exposes `public`, so nothing here is reachable via the API.
create schema if not exists ttml_cron;
revoke all on schema ttml_cron from public, anon, authenticated;

-- Fire-and-forget HTTP trigger. Reads the app URL + secret from Vault at call time so no secret
-- lives in cron.job. The long timeout matches the Vercel function's 300s maxDuration; pg_net runs
-- requests asynchronously, so this never blocks the cron worker.
create or replace function ttml_cron.trigger(p_path text, p_timeout_ms integer default 300000)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'ttml_app_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'ttml_cron_secret';

  if v_url is null or v_secret is null then
    raise warning 'ttml_cron.trigger: Vault secrets ttml_app_url / ttml_cron_secret are not set; skipping %', p_path;
    return null;
  end if;

  return net.http_post(
    url := rtrim(v_url, '/') || p_path,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := p_timeout_ms
  );
end;
$$;

revoke all on function ttml_cron.trigger(text, integer) from public, anon, authenticated;

-- ─── Schedules (mirror CRON_JOBS in server/cronScheduler.ts) ─────────────────

-- Every 5 minutes
select cron.schedule('ttml-free-preview-emails',  '*/5 * * * *',  $$select ttml_cron.trigger('/api/internal/cron/free-preview-emails')$$);
select cron.schedule('ttml-queue-backlog-alert',  '*/5 * * * *',  $$select ttml_cron.trigger('/api/internal/cron/queue-backlog-alert')$$);
select cron.schedule('ttml-queue-drain',          '*/5 * * * *',  $$select ttml_cron.trigger('/api/internal/queue/drain')$$);

-- Every 15 minutes
select cron.schedule('ttml-paywall-emails',               '*/15 * * * *', $$select ttml_cron.trigger('/api/internal/cron/paywall-emails')$$);
select cron.schedule('ttml-stale-pipeline-lock-recovery', '*/15 * * * *', $$select ttml_cron.trigger('/api/internal/cron/stale-pipeline-lock-recovery')$$);

-- Hourly
select cron.schedule('ttml-draft-reminders',        '0 * * * *',  $$select ttml_cron.trigger('/api/internal/cron/draft-reminders')$$);
select cron.schedule('ttml-stale-review-detection', '30 * * * *', $$select ttml_cron.trigger('/api/internal/cron/stale-review-detection')$$);

-- Every 6 hours
select cron.schedule('ttml-subscription-sync', '0 */6 * * *', $$select ttml_cron.trigger('/api/internal/cron/subscription-sync')$$);

-- Daily
select cron.schedule('ttml-stripe-event-pruning',      '0 3 * * *', $$select ttml_cron.trigger('/api/internal/cron/stripe-event-pruning')$$);
select cron.schedule('ttml-stale-pipeline-job-cleanup', '0 4 * * *', $$select ttml_cron.trigger('/api/internal/cron/stale-pipeline-job-cleanup')$$);

-- Weekly (Sundays)
select cron.schedule('ttml-lesson-consolidation', '0 2 * * 0',  $$select ttml_cron.trigger('/api/internal/cron/lesson-consolidation')$$);
select cron.schedule('ttml-lesson-archival',      '30 2 * * 0', $$select ttml_cron.trigger('/api/internal/cron/lesson-archival')$$);

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- select cron.unschedule(jobid) from cron.job where jobname like 'ttml-%';
-- drop function if exists ttml_cron.trigger(text, integer);
-- drop schema if exists ttml_cron;
