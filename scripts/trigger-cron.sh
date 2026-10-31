#!/usr/bin/env bash
# Trigger scheduled jobs on the Vercel deployment.
#
# Usage:
#   scripts/trigger-cron.sh "<cron expression>"   # jobs for that schedule
#   scripts/trigger-cron.sh job:<name>            # one job (see server/cronScheduler.ts)
#   scripts/trigger-cron.sh drain                 # pipeline queue drain only
#
# Env: APP_URL (e.g. https://www.talk-to-my-lawyer.com), CRON_SECRET.
#
# Primary scheduling is Supabase pg_cron (supabase/migrations/20261031000100_pg_cron_triggers.sql);
# this script backs the manual/fallback GitHub workflow. The schedule -> jobs table below MUST
# mirror CRON_JOBS in server/cronScheduler.ts (enforced by server/vercel-deploy.test.ts).
# "drain" is the queue drain endpoint.
set -uo pipefail

: "${APP_URL:?APP_URL is required}"
: "${CRON_SECRET:?CRON_SECRET is required}"

case "$1" in
  "*/5 * * * *")  JOBS="free-preview-emails queue-backlog-alert drain" ;;
  "*/15 * * * *") JOBS="paywall-emails stale-pipeline-lock-recovery" ;;
  "0 * * * *")    JOBS="draft-reminders" ;;
  "30 * * * *")   JOBS="stale-review-detection" ;;
  "0 */6 * * *")  JOBS="subscription-sync" ;;
  "0 3 * * *")    JOBS="stripe-event-pruning" ;;
  "0 4 * * *")    JOBS="stale-pipeline-job-cleanup" ;;
  "0 2 * * 0")    JOBS="lesson-consolidation" ;;
  "30 2 * * 0")   JOBS="lesson-archival" ;;
  job:*)          JOBS="${1#job:}" ;;
  drain)          JOBS="drain" ;;
  *) echo "Unknown schedule/job: $1" >&2; exit 2 ;;
esac

status=0
for job in $JOBS; do
  if [ "$job" = "drain" ]; then path="api/internal/queue/drain"; else path="api/internal/cron/$job"; fi
  echo "::group::$job"
  # --max-time slightly above the function's 300s maxDuration
  if ! curl -fsS --retry 2 --retry-delay 5 --max-time 310 -X POST \
      -H "Authorization: Bearer ${CRON_SECRET}" "${APP_URL%/}/${path}"; then
    echo "::error::$job failed"
    status=1
  fi
  echo
  echo "::endgroup::"
done
exit $status
