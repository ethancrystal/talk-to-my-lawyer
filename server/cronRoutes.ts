/**
 * Internal HTTP triggers for scheduled work (serverless replacement for the
 * in-process node-cron scheduler and the always-on pg-boss worker).
 *
 *   GET|POST /api/internal/cron/:job     run one job from CRON_JOBS
 *   GET|POST /api/internal/queue/drain   pull + process pipeline jobs
 *
 * Callers: Vercel Cron (daily backstop, sends GET) and the GitHub Actions
 * scheduler (.github/workflows/cron.yml, sends POST).
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` — the same header Vercel Cron
 * sends automatically when CRON_SECRET is set on the project. Unlike the older
 * /api/cron/* routes, these FAIL CLOSED: with no CRON_SECRET configured they
 * return 503 rather than running unauthenticated.
 */

import crypto from "crypto";
import type { Express, Request, Response, NextFunction } from "express";
import { CRON_JOBS, getCronJob, runCronJob } from "./cronScheduler";
import { drainPipelineQueue } from "./queueDrain";
import { logger } from "./logger";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function cronAuth(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    logger.error("[CronRoutes] CRON_SECRET is not set — refusing to run scheduled work");
    res.status(503).json({ error: "CRON_SECRET not configured" });
    return;
  }
  const header = req.headers["authorization"] ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !safeEqual(token, secret)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function registerCronRoutes(app: Express): void {
  app.all("/api/internal/cron/:job", cronAuth, async (req: Request, res: Response) => {
    if (req.method !== "GET" && req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    const job = getCronJob(String(req.params.job));
    if (!job) {
      res.status(404).json({
        error: "Unknown job",
        jobs: CRON_JOBS.map(j => j.name),
      });
      return;
    }
    const outcome = await runCronJob(job);
    res.status(outcome.ok ? 200 : 500).json(outcome);
  });

  app.all("/api/internal/queue/drain", cronAuth, async (req: Request, res: Response) => {
    if (req.method !== "GET" && req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    try {
      res.json({ ok: true, ...(await drainPipelineQueue()) });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err: message }, "[CronRoutes] queue drain failed");
      res.status(500).json({ ok: false, error: message });
    }
  });
}
