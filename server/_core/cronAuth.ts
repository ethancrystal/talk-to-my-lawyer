import { timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { createLogger } from "../logger";

const log = createLogger({ module: "CronAuth" });

/**
 * Authorize an internal cron / scheduler request via the shared CRON_SECRET.
 *
 * Fail-CLOSED in production: if CRON_SECRET is unset, the endpoint refuses all
 * requests with 503 rather than running unauthenticated. The previous
 * per-route `if (cronSecret) { ...check... }` pattern silently SKIPPED the auth
 * check entirely when the var was missing — exposing the cron triggers
 * (paywall emails, free-preview release, draft reminders) to the public
 * internet on any deploy where the secret wasn't configured. In non-production
 * (tests / local dev) a missing secret is allowed so the suite and local runs
 * don't require the var.
 *
 * Uses constant-time comparison so the secret can't be recovered via
 * response-timing analysis (mirrors the n8n callback guard).
 *
 * Returns true when authorized. On failure it WRITES the HTTP response
 * (401 / 503) and returns false — callers must `return` immediately on false.
 */
export function authorizeCronRequest(req: Request, res: Response): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      log.error("CRON_SECRET is not configured — refusing cron request");
      res.status(503).json({ error: "Service not configured" });
      return false;
    }
    // Non-production: allow so tests and local dev work without the secret.
    return true;
  }

  const authHeader = (req.headers["authorization"] as string) ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const secretBuf = Buffer.from(cronSecret);
  const tokenBuf = Buffer.from(token);

  if (
    secretBuf.length !== tokenBuf.length ||
    !timingSafeEqual(secretBuf, tokenBuf)
  ) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  return true;
}
