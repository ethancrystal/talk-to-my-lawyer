-- Every-minute queue drain for Vercel Hobby (crons there are daily-only).
--
-- Run once in the Supabase SQL editor for the production project.
-- Before running, replace <CRON_SECRET> below with the same value as the
-- CRON_SECRET env var in Vercel. Do not commit the real value.
--
-- How it works: pg_cron fires every minute and uses pg_net to POST
-- /api/internal/queue/drain. The endpoint pulls due pg-boss jobs (new
-- submissions, retries after a failed background run) and processes them.
-- Submissions are still kicked immediately via waitUntil; this is the safety
-- net so a failed run is retried within a minute instead of the next day.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Keep the secret in Vault so it never appears in cron.job.command.
select vault.create_secret('<CRON_SECRET>', 'ttml_cron_secret', 'Bearer token for /api/internal/*');
-- After rotating CRON_SECRET later, update it with:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'ttml_cron_secret'),
--     '<NEW_CRON_SECRET>');

create or replace function public.ttml_drain_queue()
returns bigint
language sql
security definer
set search_path = ''
as $$
  select net.http_post(
    url := 'https://ttml-demo.vercel.app/api/internal/queue/drain',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name in ('ttml_cron_secret', 'supabase_vault')
        order by (name = 'ttml_cron_secret') desc
        limit 1
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 90000
  );
$$;

revoke all on function public.ttml_drain_queue() from public, anon, authenticated;

select cron.schedule('ttml-queue-drain', '* * * * *', 'select public.ttml_drain_queue();');

-- Verify (run a minute later):
--   select status_code, left(content::text, 120) from net._http_response order by id desc limit 5;
--   select status, return_message from cron.job_run_details order by start_time desc limit 5;
-- Stop:
--   select cron.unschedule('ttml-queue-drain');
