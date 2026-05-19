import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createLogger } from "../../../logger";
import { updateLetterStatus } from "../../../db";
import type { PipelineStateType } from "../state";
import {
  breadcrumb,
  buildLessonsBlock,
  recordTokenUsage,
} from "../memory";
import { callLlmWithFailover } from "./llm-failover";

const log = createLogger({ module: "LangGraph:ResearchNode" });

const RESEARCH_TIMEOUT_MS = 90_000;
// Cost optimization: research output is structured JSON of statute/case names.
// 1200 tokens is plenty for the JSON schema we ask for. Lite tier (gpt-4o-mini
// / claude-haiku-4-5) is ~17× cheaper per token than the primary tier and
// produces equivalent quality for this listing task.
const RESEARCH_MAX_TOKENS = 1200;

// ═══════════════════════════════════════════════════════
// LANGGRAPH NODE: research
//
// Provider order (per product directive): OpenAI gpt-4o primary,
// Anthropic Claude fallback. Neither does web grounding by default,
// so researchUnverified is always true here — the model is reasoning
// from training data, not live search. The downstream draft/assembly/
// vetting prompts already account for this by tightening their
// anti-hallucination guidance when researchUnverified=true.
//
// If web-grounded research is needed in the future, re-introduce
// Perplexity as a primary or tertiary call here.
// ═══════════════════════════════════════════════════════

export async function researchNode(
  state: PipelineStateType,
): Promise<Partial<PipelineStateType>> {
  const { letterId, sharedContext } = state;
  const ctx = sharedContext.normalized;
  const lessons = sharedContext.lessons ?? [];
  const lessonsBlock = buildLessonsBlock(lessons);
  log.info(
    {
      letterId,
      jurisdiction: ctx.jurisdiction,
      letterType: ctx.letterType,
      lessonsInjected: lessons.length,
    },
    "[ResearchNode] Starting research stage",
  );

  // Update letter status to 'researching'
  await updateLetterStatus(letterId, "researching");

  const { jurisdiction, letterType, subject, description, desiredOutcome } = ctx;

  const systemPrompt = `You are a legal research assistant. Return structured JSON only — no commentary, no markdown fences.

Anti-hallucination rules:
- Cite only statutes and cases you are confident exist. If you are not sure a citation is real for ${jurisdiction}, OMIT it rather than fabricate.
- Prefer well-known statutes and widely-cited cases over obscure ones.
- If you genuinely do not know the answer for a section, return an empty array for that key rather than inventing.${lessonsBlock ? `\n\n${lessonsBlock}` : ""}`;

  const userPrompt = `Research the following legal matter in ${jurisdiction}:
Letter type: ${letterType}
Subject: ${subject}
Issue: ${description || "See intake data"}
Desired outcome: ${desiredOutcome}

Provide:
1. Relevant laws and statutes for ${jurisdiction}
2. Applicable federal regulations
3. Case law precedents
4. Proper legal citation format
5. Recommended legal approach

Return structured JSON with keys: laws, statutes, precedents, jurisdiction_notes, recommended_approach`;

  const result = await callLlmWithFailover({
    messages: [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)],
    maxTokens: RESEARCH_MAX_TOKENS,
    timeoutMs: RESEARCH_TIMEOUT_MS,
    letterId,
    stage: "research",
    tier: "lite",
    temperature: 0,
  });

  // No web grounding — record researchUnverified so downstream stages can
  // tighten their factual-claim guidance.
  const researchUnverified = true;

  // Parse research packet
  let researchPacket: Record<string, any>;
  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    researchPacket = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : { rawContent: result.content };
  } catch {
    researchPacket = { rawContent: result.content };
  }

  log.info(
    {
      letterId,
      provider: result.provider,
      tokens: result.usage.promptTokens + result.usage.completionTokens,
    },
    "[ResearchNode] Research completed",
  );

  return {
    researchPacket,
    researchProvider: result.provider,
    researchUnverified,
    currentStage: "draft",
    sharedContext: {
      tokenUsage: [
        recordTokenUsage(
          "research",
          result.provider,
          result.usage.promptTokens,
          result.usage.completionTokens,
          result.model,
        ),
      ],
      breadcrumbs: [
        breadcrumb(
          "research",
          `Research completed by ${result.provider} (${result.model}, unverified=${researchUnverified}, tokens=${result.usage.promptTokens + result.usage.completionTokens})`,
        ),
      ],
    } as any,
    messages: [
      new HumanMessage(
        `Research completed by ${result.provider}. Unverified: ${researchUnverified}`,
      ),
    ],
  };
}
