import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type ToolSet } from "ai";
import OpenAI from "openai";
import type { TokenUsage } from "../../shared/types";
import { logger } from "../logger";

// ═══════════════════════════════════════════════════════
// MODEL PROVIDERS
// ═══════════════════════════════════════════════════════

// ── Anthropic (Claude) — direct API, used for Stage 2 (draft) and Stage 3 (assembly) ──
export function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      "[Pipeline] ANTHROPIC_API_KEY is not set — cannot run drafting or assembly stages"
    );
  }
  return createAnthropic({ apiKey });
}

// ── Prompt caching helpers ──────────────────────────────────────────────────
// Anthropic prompt caching (https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
// reduces input token costs by ~90% for repeated system prompts. The static
// prefix of each system prompt (template + citation registry + lessons) is
// tagged with cache_control: { type: "ephemeral" } so the API server caches it
// for 5 minutes. Within that window, subsequent calls that share the same prefix
// hit the cache and are billed at the reduced write-once / read-many rate.
//
// Two call-site patterns:
//   1. Vercel AI SDK (`generateText`): pass `system` as an array of TextParts
//      with `providerOptions.anthropic.cacheControl`.
//   2. Raw `@anthropic-ai/sdk` (`messages.create`): pass `system` as an array
//      of content blocks with `cache_control` on the last static block.

/**
 * Wraps a system prompt string for Vercel AI SDK `generateText` with
 * Anthropic cache control. Returns a `SystemModelMessage` with
 * providerOptions carrying the cache breakpoint.
 *
 * Usage:
 *   generateText({ system: withCacheControl(systemPrompt), ... })
 */
export function withCacheControl(systemPrompt: string): {
  role: "system";
  content: string;
  providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } };
} {
  return {
    role: "system" as const,
    content: systemPrompt,
    providerOptions: {
      anthropic: { cacheControl: { type: "ephemeral" as const } },
    },
  };
}

/**
 * Wraps a system prompt string for the raw Anthropic SDK `messages.create`.
 * Returns a `system` array with cache_control on the last block.
 *
 * Usage:
 *   anthropic.messages.create({ system: withRawCacheControl(prompt), ... })
 */
export function withRawCacheControl(systemPrompt: string): Array<{
  type: "text";
  text: string;
  cache_control: { type: "ephemeral" };
}> {
  return [
    {
      type: "text" as const,
      text: systemPrompt,
      cache_control: { type: "ephemeral" as const },
    },
  ];
}

/**
 * Reads cache telemetry from a Vercel AI SDK `generateText` result.
 *
 * - Anthropic exposes `cacheCreationInputTokens` (first call that writes the
 *   cache) and `cacheReadInputTokens` (subsequent hits) under
 *   `providerMetadata.anthropic.*`. Both come from the Anthropic SDK's usage
 *   block and are present even when the request *didn't* hit cache — they're
 *   just zero.
 * - OpenAI's gpt-4o has automatic prefix caching (prefixes ≥1024 tokens
 *   reused within ~5-10 minutes get a discount) — the cached prompt tokens
 *   are exposed via `providerMetadata.openai.cachedPromptTokens`.
 *
 * Returns a loggable object suitable for `logger.info({ ...extractCacheStats(r), ... }, "...")`.
 * Undefined fields are kept (rather than stripped) so the log shape is stable
 * across providers — you can see at-a-glance "OpenAI didn't expose cache" vs
 * "Anthropic returned zero hits".
 */
export function extractCacheStats(result: {
  providerMetadata?: Record<string, Record<string, unknown> | undefined>;
}): {
  anthropicCacheCreate: number | undefined;
  anthropicCacheRead: number | undefined;
  openaiCachedPrompt: number | undefined;
} {
  const anthropic = result.providerMetadata?.anthropic;
  const openai = result.providerMetadata?.openai;
  const num = (v: unknown): number | undefined =>
    typeof v === "number" ? v : undefined;
  return {
    anthropicCacheCreate: num(anthropic?.cacheCreationInputTokens),
    anthropicCacheRead: num(anthropic?.cacheReadInputTokens),
    openaiCachedPrompt: num(openai?.cachedPromptTokens),
  };
}

// ── OpenAI — used as backup/failover model for all stages ──
export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      "[Pipeline] OPENAI_API_KEY is not set — OpenAI failover is unavailable"
    );
  }
  return createOpenAI({ apiKey });
}

/**
 * Returns true if the OPENAI_API_KEY env var is set.
 *
 * After the 2026 provider flip (OpenAI primary, Anthropic fallback for drafting
 * and assembly), this function checks PRIMARY availability for those two
 * stages and FALLBACK availability for research (which kept OpenAI search as
 * primary). Read it as "can we call OpenAI right now", not as "is the
 * failover path available".
 */
export function isOpenAIFailoverAvailable(): boolean {
  const apiKey = process.env.OPENAI_API_KEY;
  return !!(apiKey && apiKey.trim().length > 0);
}

/**
 * Returns true if ANTHROPIC_API_KEY env var is set — i.e. the drafting /
 * assembly fallback path is reachable.
 */
export function isAnthropicFailoverAvailable(): boolean {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return !!(apiKey && apiKey.trim().length > 0);
}

/** Stage 1: OpenAI gpt-4o-search-preview — web-grounded legal research via Responses API */
export function getResearchModel() {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey || openaiKey.trim().length === 0) {
    logger.warn(
      "[Pipeline] OPENAI_API_KEY is not set — falling back to Claude for research"
    );
    const anthropic = getAnthropicClient();
    return {
      model: anthropic("claude-sonnet-4-5-20250929"),
      provider: "anthropic-fallback",
      tools: undefined as ToolSet | undefined,
    };
  }
  const openai = createOpenAI({ apiKey: openaiKey });
  return {
    model: openai.responses("gpt-4o-search-preview"),
    tools: { webSearch: openai.tools.webSearchPreview({}) } as ToolSet,
    provider: "openai",
  };
}

/**
 * Stage 1 failover: Perplexity sonar-pro (if configured) or Groq OSS.
 * Falls back to Perplexity if the API key is available, otherwise skips
 * to the OSS last-resort tier.
 */
export function getResearchModelFallback(): {
  model: any;
  tools: ToolSet | undefined;
  provider: string;
} | null {
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (perplexityKey && perplexityKey.trim().length > 0) {
    const perplexity = createOpenAI({
      apiKey: perplexityKey,
      baseURL: "https://api.perplexity.ai",
      name: "perplexity",
    });
    return {
      model: perplexity.chat("sonar-pro"),
      tools: undefined,
      provider: "perplexity-failover",
    };
  }
  return null;
}

/**
 * Stage 2: OpenAI gpt-4o — initial legal draft (PRIMARY).
 *
 * gpt-4o is a top-tier general model with strong instruction-following on the
 * lengthy structured prompts the drafting stage uses. Quality on legal-letter
 * drafting is comparable to Claude Sonnet 4.5 at slightly lower per-token cost
 * ($2.5/$10 vs $3/$15 per million). Claude is used as the high-quality fallback
 * so a transient OpenAI outage doesn't drop quality to a small model.
 */
export function getDraftModel() {
  const openai = getOpenAIClient();
  return openai("gpt-4o");
}

/**
 * Stage 2 failover: Anthropic claude-sonnet-4-5.
 *
 * Same-tier fallback (not a smaller model) — drafting is the quality-critical
 * stage that the attorney later reviews, so we keep both tiers at top-tier
 * quality. Cost asymmetry vs the primary is acceptable for a fallback path
 * that should fire rarely.
 */
export function getDraftModelFallback() {
  const anthropic = getAnthropicClient();
  return anthropic("claude-sonnet-4-5-20250929");
}

/**
 * Stage 3: OpenAI gpt-4o — final polished letter assembly (PRIMARY).
 *
 * Assembly is a polish pass over the Stage 2 draft — preserves citations and
 * structure, tightens prose. gpt-4o handles this surgical-edit task well and
 * stays consistent with the same provider used in Stage 2.
 */
export function getAssemblyModel() {
  const openai = getOpenAIClient();
  return openai("gpt-4o");
}

/** Stage 3 failover: Anthropic claude-sonnet-4-5 (matches Stage 2 fallback tier). */
export function getAssemblyModelFallback() {
  const anthropic = getAnthropicClient();
  return anthropic("claude-sonnet-4-5-20250929");
}

/**
 * Stage 4: OpenAI gpt-4o — final QA vetting pass (PRIMARY).
 *
 * After the 2026 provider flip, vetting matches Stages 2 & 3: OpenAI is
 * primary, Anthropic is the same-tier fallback. Note that this means the
 * drafter, polisher, AND vetter are all on the same provider family — if
 * you want second-opinion independence at QA time, the previous
 * configuration (Anthropic primary, OpenAI failover) was the right call
 * and this can be reverted independently of Stages 2/3.
 */
export function getVettingModel() {
  const openai = getOpenAIClient();
  return openai("gpt-4o");
}

/**
 * Stage 4 failover: Anthropic claude-sonnet-4-6 — same-tier QA fallback.
 *
 * Sonnet 4.6 is the model that previously held the vetting primary slot;
 * preserved at the fallback tier so a transient OpenAI outage doesn't
 * collapse vetting quality to a small/cheap model the way the prior
 * gpt-4o-mini fallback did.
 */
export function getVettingModelFallback() {
  const anthropic = getAnthropicClient();
  return anthropic("claude-sonnet-4-6-20250514");
}

// ── Groq — free OSS last-resort fallback for all stages ──
/** Returns Groq Llama 3.3 70B model (free-tier, OpenAI-compatible) for use as OSS last resort */
export function getFreeOSSModelFallback() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      "[Pipeline] GROQ_API_KEY is not set — Groq OSS fallback is unavailable"
    );
  }
  const groq = createOpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
    name: "groq",
  });
  return groq("llama-3.3-70b-versatile");
}

/** Returns true if Groq OSS fallback is available (GROQ_API_KEY is set) */
export function isGroqFallbackAvailable(): boolean {
  const apiKey = process.env.GROQ_API_KEY;
  return !!(apiKey && apiKey.trim().length > 0);
}

// Timeout constants (ms)
export const RESEARCH_TIMEOUT_MS = 90_000; // 90s — OpenAI web search can be slow
export const DRAFT_TIMEOUT_MS = 90_000; // 90s — Claude Sonnet drafting a full legal letter
export const ASSEMBLY_TIMEOUT_MS = 90_000; // 90s — Claude Sonnet final assembly

export const SONNET_PRICING = { inputPerMillion: 3, outputPerMillion: 15 };
export const MODEL_PRICING: Record<string, { inputPerMillion: number; outputPerMillion: number }> = {
  "sonar-pro": { inputPerMillion: 3, outputPerMillion: 15 },
  "sonar": { inputPerMillion: 1, outputPerMillion: 1 },
  "claude-opus-4-5": { inputPerMillion: 15, outputPerMillion: 75 },
  // Support multiple Sonnet model IDs side by side so historical token-usage
  // entries don't break when we roll forward. As of 2026-04-27 the active
  // model is claude-sonnet-4-5-20250929; the older claude-sonnet-4-20250514
  // (deprecated, EOL 2026-06-15) is kept here so any pre-rollover rows can
  // still resolve a price.
  "claude-sonnet-4-5-20250929": SONNET_PRICING,
  "claude-sonnet-4-5": SONNET_PRICING,
  "claude-sonnet-4-20250514": SONNET_PRICING,
  "claude-sonnet-4": SONNET_PRICING,
  "claude-sonnet-4-6-20250514": SONNET_PRICING,
  "claude-sonnet-4-6": SONNET_PRICING,
  "gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10 },
  "gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  "gpt-4o-search-preview": { inputPerMillion: 2.5, outputPerMillion: 10 },
  "llama-3.3-70b-versatile": { inputPerMillion: 0, outputPerMillion: 0 },
};

export function createTokenAccumulator(): TokenUsage {
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

export function accumulateTokens(
  acc: TokenUsage,
  // AI SDK v6 uses inputTokens/outputTokens; accept both shapes for compatibility
  usage: { inputTokens?: number; outputTokens?: number; promptTokens?: number; completionTokens?: number } | undefined
) {
  if (!usage) return;
  acc.promptTokens += usage.inputTokens ?? usage.promptTokens ?? 0;
  acc.completionTokens += usage.outputTokens ?? usage.completionTokens ?? 0;
  acc.totalTokens = acc.promptTokens + acc.completionTokens;
}

export function calculateCost(modelKey: string, usage: TokenUsage): string {
  const pricing = MODEL_PRICING[modelKey];
  if (!pricing) return "0";
  const inputCost = (usage.promptTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (usage.completionTokens / 1_000_000) * pricing.outputPerMillion;
  return (inputCost + outputCost).toFixed(6);
}

const OPENAI_STORED_RESEARCH_PROMPT_ID = "pmpt_69ce00ac398081948f6d0a08e4f3eae206666fe163342fa9";
const OPENAI_STORED_RESEARCH_PROMPT_VERSION = "1";

export function getNativeOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("[Pipeline] OPENAI_API_KEY is not set — native OpenAI client unavailable");
  }
  return new OpenAI({ apiKey });
}

export async function runOpenAIStoredPromptResearch(userPrompt: string): Promise<{
  text: string;
  usage: { promptTokens: number; completionTokens: number };
}> {
  const client = getNativeOpenAIClient();
  const response = await client.responses.create({
    prompt: {
      id: OPENAI_STORED_RESEARCH_PROMPT_ID,
      version: OPENAI_STORED_RESEARCH_PROMPT_VERSION,
    },
    input: userPrompt,
    tools: [{ type: "web_search_preview" }],
  } as any);

  const outputText = typeof response.output_text === "string"
    ? response.output_text
    : Array.isArray(response.output)
      ? response.output
          .filter((item: any) => item.type === "message")
          .flatMap((item: any) => item.content ?? [])
          .filter((c: any) => c.type === "output_text")
          .map((c: any) => c.text)
          .join("\n")
      : "";

  const usage = (response as any).usage ?? {};
  return {
    text: outputText,
    usage: {
      promptTokens: usage.input_tokens ?? usage.prompt_tokens ?? 0,
      completionTokens: usage.output_tokens ?? usage.completion_tokens ?? 0,
    },
  };
}
