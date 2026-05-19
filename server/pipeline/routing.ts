import type { RunPipelineJobData } from "../queue";

export type PipelineExecutionRoute = "simple" | "langgraph" | "standard";

type UsageContext = RunPipelineJobData["usageContext"];

/**
 * Product-level pipeline routing belongs in the worker, not in env flags.
 *
 * Business rule:
 *   - New/non-subscriber first-letter preview => simple Claude pipeline.
 *   - Active paid subscriber submission        => LangGraph pipeline.
 *   - Everything else (legacy/admin/retry)     => LangGraph pipeline.
 *
 * The n8n-backed "standard" route is no longer the default. The branch
 * still exists in the worker as an emergency rollback path: set the
 * env var `LANGGRAPH_DISABLED=true` to force every non-free-trial
 * submission back through the standard pipeline. This is a separate
 * knob from `LANGGRAPH_PIPELINE` (which only gates LangGraph internals
 * inside the worker, not product routing).
 */
export function resolvePipelineExecutionRoute(
  usageContext: UsageContext
): PipelineExecutionRoute {
  // Emergency rollback escape hatch — keeps the n8n + standard-pipeline
  // path reachable when ops needs to flip back without redeploying code.
  // Intentionally checks process.env directly (not ENV) so a runtime
  // toggle on Railway/Vercel takes effect without restart.
  if (process.env.LANGGRAPH_DISABLED === "true") return "standard";

  if (usageContext?.isFreeTrialSubmission === true) return "simple";
  if (usageContext?.isPaidSubscriberSubmission === true) return "langgraph";
  return "langgraph";
}

/**
 * The 24-hour draft reveal is independent from payment entitlement.
 * Non-subscribers and paid subscribers both wait; only the post-reveal CTA differs.
 */
export function requiresDraftVisibilityGate(usageContext: UsageContext): boolean {
  return (
    usageContext?.requiresDraftVisibilityGate === true ||
    usageContext?.isPreviewGatedSubmission === true ||
    usageContext?.isFreeTrialSubmission === true ||
    usageContext?.isPaidSubscriberSubmission === true
  );
}
