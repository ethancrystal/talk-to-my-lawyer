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
 * The n8n-backed "standard" route is no longer reachable from product
 * routing. The branch still exists in the worker for emergency manual
 * triggers, but new submissions never fall through to it.
 */
export function resolvePipelineExecutionRoute(
  usageContext: UsageContext
): PipelineExecutionRoute {
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
