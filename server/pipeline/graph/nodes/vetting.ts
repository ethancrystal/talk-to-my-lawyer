import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { createLogger } from "../../../logger";
import type { PipelineStateType } from "../state";
import { breadcrumb, recordTokenUsage } from "../memory";
import { callLlmWithFailover } from "./llm-failover";

const log = createLogger({ module: "LangGraph:VettingNode" });

const VETTING_TIMEOUT_MS = 60_000;
// Cost optimization: vetting output is a small JSON object (score + flags).
// 800 tokens is more than enough for the schema. Lite tier matches.
const VETTING_MAX_TOKENS = 800;

interface VettingReport {
  riskLevel: "low" | "medium" | "high" | "critical";
  qualityDegraded: boolean;
  jurisdictionIssues: string[];
  citationsFlagged: string[];
  factualIssuesFound: string[];
  overallScore: number; // 0-10
  summary: string;
  recommendations: string[];
}

// ═══════════════════════════════════════════════════════
// LANGGRAPH NODE: vetting
// Performs quality vetting on the assembled letter.
// Returns qualityDegraded=true if the letter needs a redraft.
// ═══════════════════════════════════════════════════════

export async function vettingNode(
  state: PipelineStateType,
): Promise<Partial<PipelineStateType>> {
  const { letterId, assembledLetter, retryCount, sharedContext, researchPacket } = state;
  const ctx = sharedContext.normalized;
  log.info({ letterId, retryCount, jurisdiction: ctx.jurisdiction }, "[VettingNode] Starting vetting stage");

  const systemPrompt = `You are a senior attorney reviewing a legal letter for quality assurance.

Evaluate the letter on:
1. Legal accuracy and jurisdiction compliance for ${ctx.jurisdiction}
2. Citation correctness and formatting — flag any citation that isn't present in the research findings.
3. Factual claims — flag anything unsupported by the research findings or the intake.
4. Professional tone and clarity
5. Persuasiveness toward the stated goal
6. Completeness — flag if the letter is truncated, missing a salutation, or missing a signature block.

Return a JSON object with this exact schema:
{
  "riskLevel": "low" | "medium" | "high" | "critical",
  "qualityDegraded": boolean,
  "jurisdictionIssues": string[],
  "citationsFlagged": string[],
  "factualIssuesFound": string[],
  "overallScore": number (0-10),
  "summary": string,
  "recommendations": string[]
}

Set qualityDegraded=true if the letter has serious issues (score < 6, any critical/high jurisdiction issues, or multiple factual errors).
Judge the letter on its merits — do NOT relax standards based on retry count.`;

  // Pass the research packet so vetting can cross-check claims against
  // what was actually grounded. Without this, vetting can't reliably tell
  // an invented citation from a real one.
  // JSON is serialized WITHOUT indentation to save ~30% of input tokens vs
  // JSON.stringify(_, null, 2). The model parses either format identically.
  const researchSummary = researchPacket
    ? `Research findings (use these to cross-check the letter): ${JSON.stringify(researchPacket)}`
    : "No research packet available — be extra strict about unsupported claims.";

  const userPrompt = `Vet this legal letter:

${assembledLetter}

Context:
- Jurisdiction: ${ctx.jurisdiction}
- Letter type: ${ctx.letterType}
- Desired outcome: ${ctx.desiredOutcome}
- Research was web-grounded: ${!state.researchUnverified}
- Attempt #${retryCount + 1}

${researchSummary}`;

  const result = await callLlmWithFailover({
    messages: [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)],
    maxTokens: VETTING_MAX_TOKENS,
    timeoutMs: VETTING_TIMEOUT_MS,
    letterId,
    stage: "vetting",
    tier: "lite",
    temperature: 0,
    // Stage 4 (Vetting) canonical Anthropic model per the 4-stage pipeline
    // convention — sonnet-4-6 distinct from assembly's sonnet-4-5. The lite-tier
    // default (claude-haiku-4-5) is too small for the quality-attorney persona;
    // when OpenAI is unavailable we want the more capable Sonnet here.
    anthropicModel: "claude-sonnet-4-6",
  });

  const rawContent = result.content;

  // Parse vetting report. On parse failure we used to default to a passing
  // report (score=7, qualityDegraded=false) — that's fail-OPEN and lets bad
  // letters slip through silently. Switch to a parse-failure report that
  // surfaces a clear quality warning. qualityDegraded is true WHEN retries
  // remain (so the graph routes back to draft for another shot), and false
  // when the retry budget is exhausted (so finalize_degraded fires instead
  // of an infinite redraft loop — the routing in graph/index.ts caps at
  // retryCount < 2).
  const PARSE_FAILURE_REPORT: VettingReport = {
    riskLevel: "high",
    qualityDegraded: retryCount < 2,
    jurisdictionIssues: [],
    citationsFlagged: [],
    factualIssuesFound: ["VETTING_PARSE_FAILED: model output could not be parsed as JSON — letter quality is UNVERIFIED"],
    overallScore: 5,
    summary: "Vetting parse failed — quality is unverified, attorney should review carefully",
    recommendations: ["Attorney must manually verify all citations and factual claims in this letter."],
  };

  let vettingReport: VettingReport;
  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    vettingReport = jsonMatch
      ? (JSON.parse(jsonMatch[0]) as VettingReport)
      : { ...PARSE_FAILURE_REPORT };
  } catch {
    vettingReport = { ...PARSE_FAILURE_REPORT };
  }

  const qualityDegraded = vettingReport.qualityDegraded;
  const newWarnings: string[] = [
    ...vettingReport.jurisdictionIssues.map(i => `JURISDICTION: ${i}`),
    ...vettingReport.citationsFlagged.map(i => `CITATION: ${i}`),
    ...vettingReport.factualIssuesFound.map(i => `FACTUAL: ${i}`),
  ];

  log.info(
    {
      letterId,
      riskLevel: vettingReport.riskLevel,
      score: vettingReport.overallScore,
      qualityDegraded,
      retryCount,
    },
    "[VettingNode] Vetting completed",
  );

  return {
    vettedLetter: assembledLetter, // letter text stays the same; vetting just evaluates
    qualityDegraded,
    vettingReport,
    // Append-only history; the convenience pointer above is the latest pass.
    vettingReports: [vettingReport],
    qualityWarnings: newWarnings,
    currentStage: qualityDegraded && retryCount < 2 ? "draft" : "finalize",
    sharedContext: {
      tokenUsage: [
        recordTokenUsage(
          "vetting",
          result.provider,
          result.usage.promptTokens,
          result.usage.completionTokens,
          result.model,
        ),
      ],
      breadcrumbs: [
        breadcrumb(
          "vetting",
          `Score=${vettingReport.overallScore}/10, risk=${vettingReport.riskLevel}, degraded=${qualityDegraded}, retry=${retryCount}, provider=${result.provider}`,
        ),
      ],
    } as any,
    messages: [
      new AIMessage(
        `[Vetting] Score: ${vettingReport.overallScore}/10, Risk: ${vettingReport.riskLevel}, Degraded: ${qualityDegraded}`,
      ),
    ],
  };
}
