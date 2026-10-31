/**
 * Pipeline queue drain — the serverless replacement for the always-on
 * `boss.work()` loop in server/worker.ts.
 *
 * Vercel has no persistent worker process, so jobs are pulled on demand:
 *   1. kickQueueDrain() — fired (via waitUntil) right after a job is enqueued,
 *      so a letter starts generating immediately.
 *   2. GET/POST /api/internal/queue/drain — called every 5 minutes by the
 *      GitHub Actions scheduler (and daily by Vercel Cron as a backstop) to pick
 *      up deferred jobs (e.g. the 24h draft-preview release) and anything a
 *      killed invocation left behind.
 *
 * pg-boss fetch() uses SKIP LOCKED, so concurrent drains never double-process a
 * job; the pipeline additionally takes acquirePipelineLock() per letter.
 *
 * LIMIT: a single pipeline job cannot be resumed mid-run. If one exceeds the
 * function's maxDuration (300s on Vercel Hobby) the invocation is killed; the
 * stale-lock recovery cron then resets the letter and queues a fresh run.
 */

import { getBoss, isQueueConnectionConfigured, QUEUE_NAME, type PipelineJobData } from "./queue";
import { processJob } from "./worker";
import { logger } from "./logger";
import { captureServerException } from "./sentry";
import { runInBackground } from "./vercelRuntime";

export interface DrainResult {
  skipped?: "queue_not_configured";
  processed: number;
  failed: number;
  elapsedMs: number;
}

export interface DrainOptions {
  /**
   * Stop *starting* new jobs once this much time has elapsed. The first job is
   * always run. Default 60s: pipeline jobs are long, so in practice one
   * invocation handles one pipeline job, or several quick jobs (preview release).
   */
  budgetMs?: number;
  /** Hard cap on jobs per invocation. */
  maxJobs?: number;
}

export async function drainPipelineQueue(
  options: DrainOptions = {}
): Promise<DrainResult> {
  const startedAt = Date.now();
  const budgetMs = options.budgetMs ?? 60_000;
  const maxJobs = options.maxJobs ?? 5;
  const result: DrainResult = { processed: 0, failed: 0, elapsedMs: 0 };

  if (!isQueueConnectionConfigured()) {
    return { ...result, skipped: "queue_not_configured" };
  }

  const boss = await getBoss();
  // With supervise:false on serverless, run maintenance (expire stuck active
  // jobs, archive/delete old ones) on demand instead of on a timer.
  await boss.supervise(QUEUE_NAME).catch(err =>
    logger.warn({ err }, "[Drain] boss.supervise failed (non-fatal)")
  );

  while (result.processed + result.failed < maxJobs) {
    if (result.processed + result.failed > 0 && Date.now() - startedAt >= budgetMs) {
      break;
    }
    const jobs = await boss.fetch<PipelineJobData>(QUEUE_NAME, { batchSize: 1 });
    const job = jobs[0];
    if (!job) break;

    try {
      // processJob only reads `.id` and `.data`; fetch() already yields those.
      await processJob(job as Parameters<typeof processJob>[0]);
      await boss.complete(QUEUE_NAME, job.id);
      result.processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        { err: message, jobId: job.id, letterId: job.data.letterId, jobType: job.data.type },
        `[Drain] job ${job.id} failed`
      );
      captureServerException(err instanceof Error ? err : new Error(message), {
        tags: { component: "queue-drain", error_type: "processJob_failed" },
        extra: { jobId: job.id, letterId: job.data.letterId, jobType: job.data.type },
      });
      await boss.fail(QUEUE_NAME, job.id, { message }).catch(failErr =>
        logger.error({ err: failErr, jobId: job.id }, "[Drain] boss.fail failed")
      );
      result.failed++;
    }
  }

  result.elapsedMs = Date.now() - startedAt;
  return result;
}

/**
 * Start draining in the background after an enqueue. No-op outside Vercel,
 * where the long-running worker process (server/worker.ts) consumes the queue.
 */
export function kickQueueDrain(): void {
  if (!process.env.VERCEL) return;
  runInBackground("queue-drain-kick", drainPipelineQueue());
}
