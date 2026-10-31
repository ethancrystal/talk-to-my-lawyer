/**
 * Vercel runtime helpers.
 *
 * On Vercel there is no long-lived process: once the HTTP response is sent the
 * function may be frozen. Work that must outlive the response (e.g. starting
 * the letter pipeline right after submit) is registered with waitUntil(),
 * which keeps the invocation alive until the promise settles or the function's
 * maxDuration is hit.
 */

import { waitUntil } from "@vercel/functions";
import { logger } from "./logger";

/** True when running as a Vercel function (or a `vercel build`/`vercel dev`). */
export function isVercel(): boolean {
  return !!process.env.VERCEL;
}

/**
 * Keep `task` running after the response is sent. Outside Vercel it simply
 * runs un-awaited (the process stays alive anyway). Errors are logged, never
 * thrown, so a failed background task cannot crash the request path.
 */
export function runInBackground(label: string, task: Promise<unknown>): void {
  const guarded = task.catch(err => {
    logger.error({ err, label }, "[Background] task failed");
  });
  if (isVercel()) {
    waitUntil(guarded);
  }
}
