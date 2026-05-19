import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseMessage } from "@langchain/core/messages";
import { SystemMessage } from "@langchain/core/messages";
import { createLogger } from "../../../logger";
import { ENV } from "../../../_core/env";

// ═══════════════════════════════════════════════════════
// Shared OpenAI-primary / Anthropic-fallback failover helper for
// every LangGraph node that makes an LLM call (research, draft,
// assembly, vetting). Single unified chain — no per-node provider
// differences.
//
// Provider order:
//   1. OpenAI gpt-4o          — primary. Fast, fluent, reliable.
//   2. Anthropic Claude 4.5   — fallback when OpenAI fails.
//
// Gemini support code (`callGemini`, MODELS.gemini, gateway routing)
// is retained but dormant — the orchestrator no longer calls it.
// Re-enable by adding a Gemini branch to callLlmWithFailover when a
// working free-tier key is available.
//
// Each attempt gets its own AbortSignal.timeout so a slow
// primary doesn't starve the fallback's budget.
// ═══════════════════════════════════════════════════════

const log = createLogger({ module: "LangGraph:LLMFailover" });

// ─── Cloudflare AI Gateway (optional) ───────────────────────────
// If CF_AI_GATEWAY_BASE_URL is set, redirect OpenAI + Anthropic calls
// through the gateway for caching, rate-limiting, and usage analytics.
// The gateway uses your existing OpenAI/Anthropic API keys (no extra
// auth) and is fully transparent — when unset, calls go direct.
//
// Expected env var format (no trailing slash, no provider suffix):
//   CF_AI_GATEWAY_BASE_URL="https://gateway.ai.cloudflare.com/v1/<account>/<gateway>"
//
// Provider-specific URLs are constructed by appending /openai, /anthropic,
// or /google-ai-studio. (Cloudflare uses "google-ai-studio" as the segment
// name for Gemini in their AI Gateway routing.)
function getGatewayBaseUrl(provider: "openai" | "anthropic" | "gemini"): string | undefined {
  const base = ENV.cfAiGatewayBaseUrl.trim();
  if (!base) return undefined;
  const trimmed = base.replace(/\/+$/, "");
  const segment = provider === "gemini" ? "google-ai-studio" : provider;
  return `${trimmed}/${segment}`;
}

// ─── Model tiering ──────────────────────────────────────────────
// Primary tier: best quality, highest cost — use for stages where
// quality directly affects the deliverable (draft polish, complex
// reasoning).
// Lite tier: cheap-and-fast — gpt-4o-mini and claude-haiku-4-5 are
// ~17× cheaper per token than their primary counterparts. Use for
// stages where the output is structured JSON or short evaluations
// (research listing, vetting score). Empirically these stages are
// not the quality bottleneck.
// Default to `gemini-flash-latest` — Google's rolling-latest alias that
// always points at the current Flash generation. Override via ENV.geminiModel
// (GEMINI_MODEL env var) if a pinned model is needed.
const GEMINI_DEFAULT_MODEL = ENV.geminiModel || "gemini-flash-latest";

const MODELS = {
  primary: {
    gemini: GEMINI_DEFAULT_MODEL,
    openai: "gpt-4o",
    anthropic: "claude-sonnet-4-5-20250929",
  },
  lite: {
    // Gemini 2.0 Flash is already an order of magnitude cheaper than gpt-4o-mini,
    // so we use the same model for both tiers rather than dropping to Flash-Lite
    // (which has weaker reasoning).
    gemini: GEMINI_DEFAULT_MODEL,
    openai: "gpt-4o-mini",
    anthropic: "claude-haiku-4-5-20251001",
  },
} as const;

export type LlmProvider = "gemini" | "openai" | "anthropic";
export type LlmTier = "primary" | "lite";

export interface LlmCallResult {
  content: string;
  provider: LlmProvider;
  model: string;
  usage: { promptTokens: number; completionTokens: number };
}

export interface LlmCallOptions {
  messages: BaseMessage[];
  maxTokens: number;
  timeoutMs: number;
  letterId?: number;
  stage: string;
  /** Model tier — defaults to "primary". Use "lite" for JSON / scoring stages. */
  tier?: LlmTier;
  /**
   * Sampling temperature — defaults to LangChain default (1.0).
   * Use 0 for deterministic JSON output (research, vetting).
   * Use 0.3 for slightly-deterministic polish (assembly) — produces
   * fewer rambling continuations, which both improves output quality
   * AND reduces output token spend.
   */
  temperature?: number;
  /**
   * Per-call Anthropic model override. When set, the Anthropic fallback
   * uses this exact model id instead of MODELS[tier].anthropic. Lets stages
   * pin their canonical Anthropic model (e.g. vetting → claude-sonnet-4-6
   * per the 4-stage pipeline convention) while still sharing the unified
   * OpenAI-primary failover. Stage 3 Assembly should pin sonnet-4-5,
   * Stage 4 Vetting should pin sonnet-4-6.
   */
  anthropicModel?: string;
}

function extractContent(raw: unknown): string {
  if (typeof raw === "string") return raw;
  return JSON.stringify(raw);
}

function extractUsage(result: any): { promptTokens: number; completionTokens: number } {
  return {
    promptTokens: result?.usage_metadata?.input_tokens ?? 0,
    completionTokens: result?.usage_metadata?.output_tokens ?? 0,
  };
}

// Direct Gemini REST call. We don't use @langchain/google-genai because its v2.x
// peerDeps target @langchain/core v0.x, which conflicts with the v1.x core that
// the rest of the codebase pins. Calling the REST API directly mirrors the
// Perplexity fetch pattern the codebase already uses elsewhere — fewer deps,
// fewer version-pin landmines.
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiContent {
  role?: "user" | "model";
  parts: Array<{ text: string }>;
}

interface GeminiRequest {
  system_instruction?: { parts: Array<{ text: string }> };
  contents: GeminiContent[];
  generationConfig: {
    maxOutputTokens: number;
    temperature?: number;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  error?: { message?: string };
}

function messagesToGeminiRequest(
  messages: BaseMessage[],
  maxTokens: number,
  temperature?: number,
): GeminiRequest {
  let systemText: string | undefined;
  const contents: GeminiContent[] = [];
  for (const msg of messages) {
    const text =
      typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    if (msg instanceof SystemMessage || msg._getType?.() === "system") {
      systemText = systemText ? `${systemText}\n\n${text}` : text;
      continue;
    }
    // Treat any non-system message as a user turn for Gemini. The pipeline
    // never emits assistant messages mid-flow because each node call is a
    // single shot (no multi-turn conversation), so this collapse is lossless.
    contents.push({ role: "user", parts: [{ text }] });
  }
  return {
    ...(systemText ? { system_instruction: { parts: [{ text: systemText }] } } : {}),
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      ...(temperature !== undefined ? { temperature } : {}),
    },
  };
}

async function callGemini(opts: LlmCallOptions): Promise<LlmCallResult> {
  const apiKey = ENV.geminiApiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set");
  }
  const tier = opts.tier ?? "primary";
  const model = MODELS[tier].gemini;
  const gatewayUrl = getGatewayBaseUrl("gemini");
  const baseUrl = gatewayUrl ?? GEMINI_BASE_URL;
  const url = `${baseUrl}/models/${model}:generateContent`;

  const body = messagesToGeminiRequest(opts.messages, opts.maxTokens, opts.temperature);

  // Auth via X-goog-api-key header (preferred over ?key= query param —
  // keeps the secret out of access logs and matches the curl convention).
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeoutMs),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const errJson = (await response.json()) as GeminiResponse;
      detail = errJson.error?.message ?? "";
    } catch {
      detail = await response.text().catch(() => "");
    }
    throw new Error(`Gemini returned ${response.status}: ${detail || "unknown"}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const content = parts
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!content) {
    throw new Error(
      `Gemini returned empty content (finishReason=${candidate?.finishReason ?? "unknown"})`,
    );
  }

  return {
    content,
    provider: "gemini",
    model,
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

async function callOpenAI(opts: LlmCallOptions): Promise<LlmCallResult> {
  const tier = opts.tier ?? "primary";
  const model = MODELS[tier].openai;
  const gatewayUrl = getGatewayBaseUrl("openai");
  const llm = new ChatOpenAI({
    apiKey: ENV.openAiApiKey,
    model,
    maxTokens: opts.maxTokens,
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    ...(gatewayUrl ? { configuration: { baseURL: gatewayUrl } } : {}),
  });
  const result = await llm.invoke(opts.messages, {
    signal: AbortSignal.timeout(opts.timeoutMs),
  });
  const content = extractContent(result.content);
  if (!content.trim()) {
    throw new Error("OpenAI returned empty content");
  }
  return {
    content,
    provider: "openai",
    model,
    usage: extractUsage(result),
  };
}

async function callAnthropic(opts: LlmCallOptions): Promise<LlmCallResult> {
  const apiKey = ENV.anthropicApiKey;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set — cannot fall back from OpenAI");
  }
  const tier = opts.tier ?? "primary";
  // Stage-specific override wins over the tier default — used by vetting
  // (pins sonnet-4-6) and assembly (pins sonnet-4-5) to keep the 4-stage
  // pipeline's canonical Anthropic models even when routed via this helper.
  const model = opts.anthropicModel ?? MODELS[tier].anthropic;
  const gatewayUrl = getGatewayBaseUrl("anthropic");
  const llm = new ChatAnthropic({
    apiKey,
    model,
    maxTokens: opts.maxTokens,
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    ...(gatewayUrl ? { anthropicApiUrl: gatewayUrl } : {}),
  });
  const result = await llm.invoke(opts.messages, {
    signal: AbortSignal.timeout(opts.timeoutMs),
  });
  const content = extractContent(result.content);
  if (!content.trim()) {
    throw new Error("Anthropic fallback returned empty content");
  }
  return {
    content,
    provider: "anthropic",
    model,
    usage: extractUsage(result),
  };
}

/**
 * Invoke an LLM with OpenAI-primary / Anthropic-fallback order.
 *
 * Provider availability:
 *   • OpenAI    — primary. Used when OPENAI_API_KEY is set.
 *   • Anthropic — fallback when OpenAI fails or its key is missing.
 *
 * Gemini is intentionally NOT in the active chain — the free-tier
 * quota on the configured account is zero, so every Gemini call
 * burned ~1–2s on a guaranteed 429 before falling through. The
 * `callGemini` helper above is retained for future use; just add a
 * branch here when there's a key with usable quota.
 *
 * Each provider gets its own AbortSignal.timeout so a slow primary
 * doesn't starve the fallback's budget. Throws only if every
 * available provider fails; the thrown error preserves each
 * provider's error message so the LangGraph error classifier can
 * read them.
 */
export async function callLlmWithFailover(
  opts: LlmCallOptions,
): Promise<LlmCallResult> {
  const { letterId, stage } = opts;
  const errors: string[] = [];

  // ── 1. OpenAI (primary) ──
  if (ENV.openAiApiKey) {
    try {
      const result = await callOpenAI(opts);
      log.info(
        {
          letterId,
          stage,
          provider: result.provider,
          model: result.model,
          tokens: result.usage.promptTokens + result.usage.completionTokens,
        },
        "[LLMFailover] OpenAI primary succeeded",
      );
      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`OpenAI: ${errMsg}`);
      log.warn(
        { letterId, stage, err: errMsg },
        "[LLMFailover] OpenAI failed — falling back to Anthropic",
      );
    }
  }

  // ── 2. Anthropic (fallback) ──
  try {
    const result = await callAnthropic(opts);
    log.info(
      { letterId, stage, provider: result.provider, model: result.model },
      "[LLMFailover] Anthropic fallback succeeded",
    );
    return result;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    errors.push(`Anthropic: ${errMsg}`);
    throw new Error(
      `LLM call failed at stage ${stage}: ${errors.join("; ")}`,
    );
  }
}
