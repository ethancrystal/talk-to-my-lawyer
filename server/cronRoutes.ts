/**
 * Internal HTTP triggers for scheduled work — the serverless replacement for
 * the in-process node-cron scheduler and the always-on pg-boss worker.
 *
 *   GET|POST /api/internal/cron/:job     run one job from CRON_JOBS
 *   GET|POST /api/internal/queue/drain   pull + process due pipeline jobs
 *
 * Callers: Vercel Cron (sends GET; daily on the Hobby plan) and any external
 * scheduler (e.g. Supabase pg_cron + pg_net) for higher frequency.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` — the header Vercel Cron sends
 * automatically when CRON_SECRET is set on the project. Fail-closed in
 * production via authorizeCronRequest.
 */

import type { Express, Request, Response } from "express";
import { authorizeCronRequest } from "./_core/cronAuth";
import { drainPipelineQueue } from "./queueDrain";
import { processDraftReminders } from "./draftReminders";
import { processPaywallEmails } from "./paywallEmailCron";
import { processFreePreviewEmails } from "./freePreviewEmailCron";
import { recoverStalePipelineLocks } from "./stalePipelineLockRecovery";
import { releaseStaleReviews } from "./staleReviewReleaser";
import { syncSubscriptionsWithStripe } from "./subscriptionSync";
import { captureServerException } from "./sentry";
import { logger } from "./logger";

export interface CronJob {
  name: string;
  run: () => Promise<unknown>;
}

export const CRON_JOBS: CronJob[] = [
  { name: "draft-reminders", run: processDraftReminders },
  { name: "paywall-emails", run: processPaywallEmails },
  { name: "free-preview-emails", run: processFreePreviewEmails },
  { name: "stale-pipeline-locks", run: recoverStalePipelineLocks },
  { name: "stale-reviews", run: releaseStaleReviews },
  { name: "subscription-sync", run: syncSubscriptionsWithStripe },
];

async function runJob(job: CronJob, res: Response): Promise<void> {
  const startedAt = Date.now();
  try {
    const result = await job.run();
    res.json({ ok: true, job: job.name, elapsedMs: Date.now() - startedAt, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message, job: job.name }, "[CronRoutes] job failed");
    captureServerException(err, { tags: { component: "cron", job: job.name } });
    res.status(500).json({ ok: false, job: job.name, error: message });
  }
}

export function registerCronRoutes(app: Express): void {
  const methods = ["get", "post"] as const;

  for (const method of methods) {
    app[method]("/api/internal/cron/:job", async (req: Request, res: Response) => {
      if (!authorizeCronRequest(req, res)) return;
      const job = CRON_JOBS.find(j => j.name === req.params.job);
      if (!job) {
        res.status(404).json({ error: "Unknown job", jobs: CRON_JOBS.map(j => j.name) });
        return;
      }
      await runJob(job, res);
    });

    app[method]("/api/internal/queue/drain", async (req: Request, res: Response) => {
      if (!authorizeCronRequest(req, res)) return;
      await runJob({ name: "queue-drain", run: () => drainPipelineQueue() }, res);
    });
  }
}
