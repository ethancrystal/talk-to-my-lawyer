import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { createLogger } from "../../../logger";
import { updateLetterStatus } from "../../../db";
import type { PipelineStateType } from "../state";
import {
  breadcrumb,
  buildLessonsBlock,
  buildRedraftContextBlock,
  recordTokenUsage,
} from "../memory";
import { callLlmWithFailover } from "./llm-failover";

const log = createLogger({ module: "LangGraph:DraftNode" });

const DRAFT_TIMEOUT_MS = 120_000;
const DRAFT_MAX_TOKENS = 4000;

// ═══════════════════════════════════════════════════════
// LANGGRAPH NODE: draft
//
// Generates the initial draft body via the same failover chain
// as every other LLM-calling stage (Gemini → OpenAI → Anthropic).
//
// NOTE: prior to this revision the draft node used
// ChatAnthropic.stream() directly so live tokens could be flushed
// to a `pipeline_stream_chunks` Supabase table for realtime UI
// updates. That dual-purpose streaming code was removed when draft
// moved onto the unified failover helper — the trade-off is no live
// token stream on the subscriber dashboard during drafting, but a
// consistent provider order across all stages.
// ═══════════════════════════════════════════════════════

export async function draftNode(
  state: PipelineStateType,
): Promise<Partial<PipelineStateType>> {
  const {
    letterId,
    researchPacket,
    researchUnverified,
    sharedContext,
    retryCount,
    vettingReport,
    assembledLetter: priorAssembledLetter,
  } = state;
  const ctx = sharedContext.normalized;
  const lessons = sharedContext.lessons ?? [];
  const isRedraft = retryCount > 0 && Boolean(vettingReport);
  log.info(
    {
      letterId,
      jurisdiction: ctx.jurisdiction,
      letterType: ctx.letterType,
      retryCount,
      isRedraft,
    },
    "[DraftNode] Starting draft stage",
  );

  // Update letter status to 'drafting'
  await updateLetterStatus(letterId, "drafting");

  // Research context — compressed JSON (no indent) to save input tokens.
  const researchContext = researchPacket
    ? `\n\nResearch findings: ${JSON.stringify(researchPacket)}`
    : "";
  const unverifiedWarning = researchUnverified
    ? "\n\nNOTE: Research was not web-grounded. Proceed with standard legal caution."
    : "";
  const lessonsBlock = buildLessonsBlock(lessons);
  // On a redraft loop the model needs to see what failed last time —
  // otherwise the loop runs blind and is just dice-rolling for a better
  // pass. buildRedraftContextBlock returns "" for the first attempt.
  const redraftBlock = buildRedraftContextBlock({
    retryCount,
    vettingReport,
    priorDraft: priorAssembledLetter ?? "",
  });

  const systemPrompt = `You are an expert legal letter writer. Draft professional, persuasive legal correspondence.

Format requirements:
- Formal legal letter with proper salutation, body paragraphs, and closing.
- Target length: roughly 1 to 2 pages (300–800 words) — never truncate mid-sentence.
- End with a clear signature block matching the sender name; do not omit the closing.

Anti-hallucination rules (CRITICAL):
- Do NOT invent statutes, case names, citation numbers, or court decisions. If you reference a law or case, it must come from the research findings below or be a well-known statute in ${ctx.jurisdiction}.
- Do NOT invent facts, dates, dollar amounts, addresses, or parties beyond what the intake explicitly provides.
- If the intake is missing a detail you would normally include, write a clear placeholder like "[INSERT DATE]" rather than fabricating one.

Jurisdiction: ${ctx.jurisdiction}
Letter type: ${ctx.letterType}
${researchContext}${unverifiedWarning}${lessonsBlock}${redraftBlock}`;

  const userPrompt = `Draft a ${ctx.letterType} legal letter with:
Subject: ${ctx.subject}
Issue: ${ctx.description}
Sender: ${ctx.senderName}${ctx.senderEmail ? ` <${ctx.senderEmail}>` : ""}
Recipient: ${ctx.recipientName}${ctx.recipientEmail ? ` <${ctx.recipientEmail}>` : ""}${ctx.recipientAddress ? `\nAddress: ${ctx.recipientAddress}` : ""}
Desired outcome: ${ctx.desiredOutcome}
Tone: ${ctx.tonePreference}
${ctx.financials ? `Financial details: ${JSON.stringify(ctx.financials)}` : ""}
${ctx.additionalContext ? `Additional context: ${ctx.additionalContext}` : ""}`;

  const result = await callLlmWithFailover({
    messages: [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)],
    maxTokens: DRAFT_MAX_TOKENS,
    timeoutMs: DRAFT_TIMEOUT_MS,
    letterId,
    stage: "draft",
    // Primary tier — drafting is the highest-impact stage; quality matters most here.
    // Temperature 0.5 leaves room for varied phrasing while keeping the output grounded.
    temperature: 0.5,
  });

  const fullContent = result.content;

  log.info(
    {
      letterId,
      provider: result.provider,
      model: result.model,
      chars: fullContent.length,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      isRedraft,
      retryCount,
    },
    "[DraftNode] Draft completed",
  );

  return {
    assembledLetter: fullContent,
    currentStage: "assembly",
    sharedContext: {
      tokenUsage: [
        recordTokenUsage(
          "draft",
          result.provider,
          result.usage.promptTokens,
          result.usage.completionTokens,
          result.model,
        ),
      ],
      breadcrumbs: [
        breadcrumb(
          "draft",
          `Draft via ${result.provider} (${fullContent.length} chars, tokens=${result.usage.promptTokens + result.usage.completionTokens}${isRedraft ? `, redraft #${retryCount}` : ""})`,
        ),
      ],
    } as any,
    messages: [new AIMessage(fullContent.slice(0, 200) + "…")],
  };
}
