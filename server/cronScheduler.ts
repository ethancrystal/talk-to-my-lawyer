/**
 * Cron Scheduler
 *
 * Single registry of every scheduled job (CRON_JOBS) plus two ways to trigger it:
 *
 *   - Long-running process (local dev / `pnpm start`): startCronScheduler()
 *     registers each job with node-cron in-process.
 *   - Vercel (serverless, no persistent process): jobs are invoked over HTTP via
 *     server/cronRoutes.ts — GET/POST /api/internal/cron/:job — by Vercel Cron
 *     (daily backstop) and the GitHub Actions scheduler (.github/workflows/cron.yml).
 *
 * Keep vercel.json crons and .github/workflows/cron.yml in sync with the
 * `schedule` fields below (server/cronRoutes.test.ts enforces this).
 *
 * Jobs registered:
 *   - Draft Reminder: every hour at :00 — calls processDraftReminders()
 *   - Subscription Sync: every 6 hours — reconciles local subscription status with Stripe
 *   - Stripe Event Pruning: daily at 03:00 — removes processed webhook events older than 7 days
 *   - Draft-Ready Email Notification: every 15 minutes — sends "Your draft is ready" email to subscribers
 *     whose letter reached generated_locked status ≥24 hours ago (idempotent via draft_ready_email_sent flag)
 *   - Lesson Consolidation: weekly on Sundays at 02:00 — merges similar lessons in scopes with 5+ active lessons
 *   - Lesson Auto-Archival: weekly on Sundays at 02:30 — deactivates stale/ineffective lessons
 *
 * The scheduler is only started in production (NODE_ENV !== 'test').
 * In test environments, jobs are not registered to avoid side effects.
 *
 * Usage:
 *   import { startCronScheduler } from "./cronScheduler";
 *   startCronScheduler(); // call once on server startup
 */

import cron from "node-cron";
import { processDraftReminders } from "./draftReminders";
import {
  syncSubscriptionsWithStripe,
  pruneProcessedStripeEvents,
} from "./subscriptionSync";
import { captureServerException } from "./sentry";
import { releaseStaleReviews } from "./staleReviewReleaser";
import { recoverStalePipelineLocks } from "./stalePipelineLockRecovery";
import { processPaywallEmails } from "./paywallEmailCron";
import { processFreePreviewEmails } from "./freePreviewEmailCron";
import {
  runAutomatedConsolidation,
  archiveIneffectiveLessons,
} from "./learning";
import { logger } from "./logger";
import { getBoss, QUEUE_NAME, isQueueConnectionConfigured } from "./queue";
import type { PipelineJobData } from "./queue";
import { getLetterRequestById, getAllUsers, createNotification } from "./db";
import { sendJobFailedAlertEmail } from "./email";

/** Whether the scheduler has been started (prevents double-registration) */
let started = false;

/**
 * Pipeline statuses that legitimately have a queued/deferred job.
 * Jobs for letters in any other status are stale and should be cancelled.
 */
const PIPELINE_ACTIVE_STATUSES = new Set([
  "submitted",
  "researching",
  "drafting",
  "ai_generation_completed_hidden",
]);

/**
 * Cancel any pg-boss pipeline jobs whose associated letter is no longer
 * in an "actively generating" status.  This handles the race where an admin
 * force-transitions a letter but the deferred job wasn't cancelled (or the
 * cancel call failed for a transient reason).
 *
 * Runs at startup and nightly at 04:00.
 */
export async function cleanupStalePipelineJobs(): Promise<{
  cancelled: number;
  errors: number;
}> {
  if (!isQueueConnectionConfigured()) {
    logger.info(
      "[Cron] cleanupStalePipelineJobs: skipped (queue DB URL not configured)"
    );
    return { cancelled: 0, errors: 0 };
  }

  let cancelled = 0;
  let errors = 0;
  try {
    const boss = await getBoss();
    const jobs = await boss.findJobs<PipelineJobData>(QUEUE_NAME);
    const pendingJobs = jobs.filter(
      j => j.state === "created" || j.state === "retry"
    );

    if (pendingJobs.length === 0) return { cancelled: 0, errors: 0 };

    const staleIds: string[] = [];
    for (const job of pendingJobs) {
      const letterId = (job.data as { letterId?: number })?.letterId;
      if (!letterId) continue;
      try {
        const letter = await getLetterRequestById(letterId);
        if (!letter || !PIPELINE_ACTIVE_STATUSES.has(letter.status)) {
          staleIds.push(job.id);
        }
      } catch (err) {
        logger.warn(
          { err, jobId: job.id, letterId },
          "[Cron] cleanupStalePipelineJobs: error checking letter status (skipping job)"
        );
        errors++;
      }
    }

    if (staleIds.length > 0) {
      await boss.cancel(QUEUE_NAME, staleIds);
      cancelled = staleIds.length;
      logger.info(
        { cancelled },
        "[Cron] cleanupStalePipelineJobs: cancelled stale deferred job(s)"
      );
    }
  } catch (err) {
    logger.error(
      { err },
      "[Cron] cleanupStalePipelineJobs: unexpected error"
    );
    errors++;
  }
  return { cancelled, errors };
}

// ─── Queue backlog alerting ──────────────────────────────────────────────────
// Alerts admins if pipeline queue depth exceeds threshold.
async function checkQueueBacklog(): Promise<Record<string, unknown>> {
  const QUEUE_BACKLOG_THRESHOLD = parseInt(
    process.env.QUEUE_BACKLOG_THRESHOLD ?? "10",
    10
  );
  if (!isQueueConnectionConfigured()) {
    logger.info("[Cron] Queue check skipped (not configured)");
    return { skipped: true };
  }
  const boss = await getBoss();
  const stats = await boss.getQueueStats(QUEUE_NAME);
  const queuedCount = (stats?.queuedCount ?? 0) + (stats?.deferredCount ?? 0);
  const activeCount = stats?.activeCount ?? 0;

  logger.info(`[Cron] Queue depth: ${queuedCount} queued, ${activeCount} active`);

  if (queuedCount >= QUEUE_BACKLOG_THRESHOLD) {
    logger.warn(
      `[Cron] Queue backlog alert: ${queuedCount} queued (threshold: ${QUEUE_BACKLOG_THRESHOLD})`
    );
    const admins = await getAllUsers("admin");
    for (const admin of admins) {
      if (admin.email) {
        try {
          await sendJobFailedAlertEmail({
            to: admin.email,
            name: admin.name ?? "Admin",
            letterId: 0,
            jobType: "queue_backlog_alert",
            errorMessage: `${queuedCount} pipeline jobs are backlogged (${activeCount} active). Threshold: ${QUEUE_BACKLOG_THRESHOLD}. Check that the queue drain cron (GitHub Actions) is running and consider raising QUEUE_DRAIN_CONCURRENCY.`,
            appUrl: process.env.APP_URL ?? "",
          });
        } catch (emailErr) {
          logger.error(
            { err: emailErr },
            "[Cron] Failed to send queue backlog alert email"
          );
        }
      }
      try {
        await createNotification({
          userId: admin.id,
          type: "job_failed",
          category: "system",
          title: `Queue backlog alert: ${queuedCount} jobs pending`,
          body: `Pipeline queue has ${queuedCount} queued jobs (${activeCount} active). Check that the queue drain cron is running.`,
          link: "/admin/letters",
        });
      } catch (notifErr) {
        logger.error(
          { err: notifErr },
          "[Cron] Failed to create queue backlog notification"
        );
      }
    }
  }
  return { queued: queuedCount, active: activeCount };
}

// ─── Job registry ────────────────────────────────────────────────────────────

export interface CronJobDef {
  /** URL-safe job name used by /api/internal/cron/:job */
  name: string;
  /** 5-field cron expression (UTC) */
  schedule: string;
  /** Human description for logs/docs */
  description: string;
  run: () => Promise<unknown>;
}

export const CRON_JOBS: readonly CronJobDef[] = [
  {
    name: "draft-reminders",
    schedule: "0 * * * *",
    description: "Hourly draft reminder emails",
    run: () => processDraftReminders(),
  },
  {
    name: "subscription-sync",
    schedule: "0 */6 * * *",
    description: "Reconcile local subscription status with Stripe",
    run: () => syncSubscriptionsWithStripe(),
  },
  {
    name: "stripe-event-pruning",
    schedule: "0 3 * * *",
    description: "Prune processed Stripe webhook events older than 7 days",
    run: async () => ({ deleted: await pruneProcessedStripeEvents() }),
  },
  {
    // Releases letters under_review for 48+ hours back to pending_review
    name: "stale-review-detection",
    schedule: "30 * * * *",
    description: "Release stale under_review letters",
    run: () => releaseStaleReviews(),
  },
  {
    // "Your draft is ready" email for letters at generated_locked >= 24h.
    // Idempotent via draft_ready_email_sent.
    name: "paywall-emails",
    schedule: "*/15 * * * *",
    description: "Draft-ready (paywall) email notifications",
    run: () => processPaywallEmails(),
  },
  {
    // First-letter free-preview "ready" email, 24h after submit.
    // Idempotent via free_preview_email_sent_at.
    name: "free-preview-emails",
    schedule: "*/5 * * * *",
    description: "Free-preview-ready email notifications",
    run: () => processFreePreviewEmails(),
  },
  {
    // Merges semantically similar lessons in scopes with 5+ active lessons
    name: "lesson-consolidation",
    schedule: "0 2 * * 0",
    description: "Weekly lesson consolidation",
    run: () => runAutomatedConsolidation(),
  },
  {
    // Deactivates stale / ineffective / harmful lessons
    name: "lesson-archival",
    schedule: "30 2 * * 0",
    description: "Weekly lesson auto-archival",
    run: () => archiveIneffectiveLessons(),
  },
  {
    // Resets letters stuck in researching/drafting with a stale pipeline lock
    // so a fresh run is queued. This is also the recovery path when a
    // serverless drain is killed at maxDuration mid-pipeline.
    name: "stale-pipeline-lock-recovery",
    schedule: "*/15 * * * *",
    description: "Recover letters with stale pipeline locks",
    run: () => recoverStalePipelineLocks(),
  },
  {
    // Cancels queued/deferred pg-boss jobs for letters no longer actively generating
    name: "stale-pipeline-job-cleanup",
    schedule: "0 4 * * *",
    description: "Nightly stale pipeline job cleanup",
    run: () => cleanupStalePipelineJobs(),
  },
  {
    name: "queue-backlog-alert",
    schedule: "*/5 * * * *",
    description: "Alert admins when the pipeline queue is backlogged",
    run: () => checkQueueBacklog(),
  },
];

export function getCronJob(name: string): CronJobDef | undefined {
  return CRON_JOBS.find(j => j.name === name);
}

export interface CronRunOutcome {
  job: string;
  ok: boolean;
  elapsedMs: number;
  result?: unknown;
  error?: string;
}

/**
 * Run one registered job with uniform timing, logging and Sentry capture.
 * Never throws — failures are reported in the returned outcome.
 */
export async function runCronJob(job: CronJobDef): Promise<CronRunOutcome> {
  const startTime = Date.now();
  logger.info(`[Cron] [${new Date().toISOString()}] Running ${job.name}...`);
  try {
    const result = await job.run();
    const elapsedMs = Date.now() - startTime;
    logger.info(
      { result },
      `[Cron] ${job.name} done in ${elapsedMs}ms`
    );
    return { job: job.name, ok: true, elapsedMs, result };
  } catch (err) {
    const elapsedMs = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[Cron] ${job.name} failed: ${msg}`);
    captureServerException(err, {
      tags: { component: "cron", job: job.name.replace(/-/g, "_") },
    });
    return { job: job.name, ok: false, elapsedMs, error: msg };
  }
}

/**
 * Start all scheduled cron jobs in-process (long-running server only).
 * Safe to call multiple times — subsequent calls are no-ops.
 * Not used on Vercel — see server/cronRoutes.ts.
 */
export function startCronScheduler(): void {
  if (process.env.NODE_ENV === "test") {
    logger.info("[Cron] Skipping scheduler in test environment");
    return;
  }

  if (started) {
    logger.info("[Cron] Scheduler already running — skipping duplicate start");
    return;
  }

  started = true;
  logger.info("[Cron] Starting scheduler...");

  // Run stale job cleanup once at startup (non-blocking)
  setImmediate(async () => {
    try {
      const result = await cleanupStalePipelineJobs();
      logger.info(
        `[Cron] Startup stale-job cleanup done — cancelled: ${result.cancelled}, errors: ${result.errors}`
      );
    } catch (err) {
      logger.warn({ err }, "[Cron] Startup stale-job cleanup failed (non-fatal)");
    }
  });

  for (const job of CRON_JOBS) {
    cron.schedule(job.schedule, () => {
      void runCronJob(job);
    });
  }

  logger.info(
    `[Cron] Registered: ${CRON_JOBS.map(j => `${j.name} (${j.schedule})`).join(", ")}`
  );
}

/**
 * Stop the scheduler (for graceful shutdown).
 * Destroys all registered tasks.
 */
export function stopCronScheduler(): void {
  if (!started) return;
  // node-cron v4 does not expose a global destroy — individual tasks are GC'd
  // when the process exits. This function exists for future extension.
  started = false;
  logger.info("[Cron] Scheduler stopped");
}

/** Exposed for testing */
export { started as _schedulerStarted };
