import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { createLogger } from "../../../logger";
import type { PipelineStateType } from "../state";
import {
  breadcrumb,
  buildLessonsBlock,
  buildRedraftContextBlock,
  recordTokenUsage,
} from "../memory";
import { callLlmWithFailover } from "./llm-failover";

const log = createLogger({ module: "LangGraph:AssemblyNode" });

const ASSEMBLY_TIMEOUT_MS = 90_000;
const ASSEMBLY_MAX_TOKENS = 4000;

// ═══════════════════════════════════════════════════════
// LANGGRAPH NODE: assembly
// Polishes the initial draft — checks citations, tightens
// language, ensures jurisdiction compliance.
//
// Reads derived values from `sharedContext.normalized` (single
// source of truth) and appends its own token-usage entry to the
// shared memory so finalize can report aggregated costs.
// ═══════════════════════════════════════════════════════

export async function assemblyNode(
  state: PipelineStateType,
): Promise<Partial<PipelineStateType>> {
  const {
    letterId,
    assembledLetter,
    researchPacket,
    sharedContext,
    retryCount,
    vettingReport,
  } = state;
  const ctx = sharedContext.normalized;
  const lessons = sharedContext.lessons ?? [];
  const isRedraft = retryCount > 0 && Boolean(vettingReport);
  log.info(
    { letterId, jurisdiction: ctx.jurisdiction, retryCount, isRedraft },
    "[AssemblyNode] Starting assembly stage",
  );

  // Pass the FULL research packet (laws, statutes, precedents, jurisdiction
  // notes, recommended approach) so the assembler can cross-check the draft
  // against every grounded finding — not just the laws/statutes subset.
  // JSON is serialized WITHOUT indentation to save ~30% of input tokens vs
  // JSON.stringify(_, null, 2). The model parses either format identically.
  const researchSummary = researchPacket
    ? `Research findings (verbatim from research stage): ${JSON.stringify(researchPacket)}`
    : "No research packet available.";
  const lessonsBlock = buildLessonsBlock(lessons);
  // On a redraft cycle the assembler should also know what vetting flagged
  // last time so its polish targets those issues rather than running blind.
  // We pass the assembler the CURRENT (fresh) draft, not the prior one —
  // the redraft block only contributes the vetting feedback here.
  const redraftBlock = buildRedraftContextBlock({
    retryCount,
    vettingReport,
    priorDraft: "",
  });

  const systemPrompt = `You are an expert legal editor. Your task is to refine and polish a legal letter draft.

Quality standards:
1. Verify all legal citations are properly formatted for ${ctx.jurisdiction}
2. Cross-check every factual or legal claim against the research findings — REMOVE any claim that isn't supported by research or the intake.
3. Improve clarity, flow, and professional tone
4. Verify that the letter is persuasive and achieves the stated outcome
5. Fix any grammatical or formatting issues
6. Preserve the signature block and closing — never truncate mid-letter.

Output format:
- Return ONLY the improved letter text.
- Do NOT include preamble (e.g. "Here is the refined letter:"), commentary, headers, or markdown fences.
- The first character of your response should be the first character of the letter itself.${lessonsBlock}${redraftBlock}`;

  const userPrompt = `Please refine this legal letter draft.

Research context:
${researchSummary}

Draft to refine:
${assembledLetter}

Jurisdiction: ${ctx.jurisdiction}
Letter type: ${ctx.letterType}
Desired outcome: ${ctx.desiredOutcome}`;

  const result = await callLlmWithFailover({
    messages: [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)],
    maxTokens: ASSEMBLY_MAX_TOKENS,
    timeoutMs: ASSEMBLY_TIMEOUT_MS,
    letterId,
    stage: "assembly",
    // Primary tier — assembly is the polishing stage, quality matters.
    // Lower temperature reduces rambling continuations: cheaper output
    // tokens AND tighter prose. 0.3 is a good middle ground (still varied
    // enough to fix awkward phrasing, deterministic enough to not waffle).
    temperature: 0.3,
  });

  const refinedContent = result.content;

  log.info(
    {
      letterId,
      provider: result.provider,
      chars: refinedContent.length,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      isRedraft,
      retryCount,
    },
    "[AssemblyNode] Assembly completed",
  );

  return {
    assembledLetter: refinedContent,
    currentStage: "vetting",
    sharedContext: {
      tokenUsage: [
        recordTokenUsage(
          "assembly",
          result.provider,
          result.usage.promptTokens,
          result.usage.completionTokens,
          result.model,
        ),
      ],
      breadcrumbs: [
        breadcrumb(
          "assembly",
          `Refined letter via ${result.provider} (${refinedContent.length} chars, tokens=${result.usage.promptTokens + result.usage.completionTokens}${isRedraft ? `, redraft #${retryCount}` : ""})`,
        ),
      ],
    } as any,
    messages: [new AIMessage(`[Assembly] Refined letter (${refinedContent.length} chars)`)],
  };
}
