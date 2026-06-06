import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { createLogger } from "../../../logger";
import type { PipelineStateType } from "../state";
import { breadcrumb, recordTokenUsage, type NormalizedIntake } from "../memory";
import { callLlmWithFailover } from "./llm-failover";
import {
  validateContentConsistency,
  US_STATE_NAMES,
  STATE_ABBREV_TO_NAME,
} from "../../validators";
import { extractCitationsFromText } from "../../citations";

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

export interface DeterministicVettingResult {
  /** True when a hard, deterministic legal-safety problem was found —
   *  currently: the letter cites a different US state's STATUTORY authority
   *  than the intake jurisdiction (a statute marker with a foreign-state lead-in).
   *  This forces a degrade/redraft regardless of the LLM's self-score. */
  degraded: boolean;
  /** The jurisdiction-mismatch detail, or null when no foreign statute found. */
  jurisdictionMismatch: string | null;
  /** Advisory, human-readable warnings to surface to the attorney + redraft loop. */
  warnings: string[];
  /** Every statute/case citation the regex engine found in the letter. */
  citations: string[];
}

// State legal abbreviations as they appear in statutory citations (Bluebook-ish),
// mapping abbrev → full state name. Covers all 50 states so the deterministic
// gate is not silently blind to e.g. "Ariz. Rev. Stat." or "Nev. Rev. Stat.".
// Short/ambiguous tokens (Or., Me., La.) are safe because they are only matched
// inside a STATUTORY context (see detectForeignStateStatutes), never bare prose.
const STATE_LEGAL_ABBREV: Record<string, string> = {
  "ala.": "Alabama", "alaska": "Alaska", "ariz.": "Arizona", "ark.": "Arkansas",
  "cal.": "California", "calif.": "California", "colo.": "Colorado", "conn.": "Connecticut",
  "del.": "Delaware", "fla.": "Florida", "ga.": "Georgia", "haw.": "Hawaii",
  "idaho": "Idaho", "ill.": "Illinois", "ind.": "Indiana", "iowa": "Iowa",
  "kan.": "Kansas", "ky.": "Kentucky", "la.": "Louisiana", "me.": "Maine",
  "md.": "Maryland", "mass.": "Massachusetts", "mich.": "Michigan", "minn.": "Minnesota",
  "miss.": "Mississippi", "mo.": "Missouri", "mont.": "Montana", "neb.": "Nebraska",
  "nev.": "Nevada", "n.h.": "New Hampshire", "n.j.": "New Jersey", "n.m.": "New Mexico",
  "n.y.": "New York", "n.c.": "North Carolina", "n.d.": "North Dakota", "ohio": "Ohio",
  "okla.": "Oklahoma", "or.": "Oregon", "pa.": "Pennsylvania", "r.i.": "Rhode Island",
  "s.c.": "South Carolina", "s.d.": "South Dakota", "tenn.": "Tennessee", "tex.": "Texas",
  "utah": "Utah", "vt.": "Vermont", "va.": "Virginia", "wash.": "Washington",
  "w. va.": "West Virginia", "wis.": "Wisconsin", "wyo.": "Wyoming",
};

// A "statutory marker" signals an actual statute/code citation (NOT a case
// name). Requiring one before attributing a state keeps the gate precise: it
// fires on "Ariz. Rev. Stat. § 33-1321" but NOT on a federal case whose party
// is a state ("Texas v. Johnson", "New York Times Co. v. Sullivan") or a bare
// out-of-state party/address mention.
const STATUTE_MARKER_RE =
  /(§\s*\d|\bRev\.\s*Stat\b|\bRevised Statutes\b|\bComp\.\s*Laws\b|\bCompiled Laws\b|\bGen\.\s*(?:Stat|Laws)\b|\bGeneral (?:Statutes|Laws)\b|\b[A-Z][a-z]+ Code\b|\bCode Ann\b|\bStat(?:utes?|\.)\s*Ann\b)/g;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Resolve a jurisdiction value ("CA" or "California") to its full state name. */
function resolveStateName(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  const byAbbrev = STATE_ABBREV_TO_NAME[t.toUpperCase()];
  if (byAbbrev) return byAbbrev;
  const full = US_STATE_NAMES.find((s) => s.toLowerCase() === t.toLowerCase());
  return full ?? null;
}

/** Find a foreign US state named within `window` (full name or legal abbrev). */
function foreignStateInWindow(window: string, jurName: string | null): string | null {
  // Abbrevs first (more specific). Require a non-letter boundary before the
  // abbrev so "or." matches but "fork." does not.
  for (const [abbr, name] of Object.entries(STATE_LEGAL_ABBREV)) {
    if (jurName && name.toLowerCase() === jurName.toLowerCase()) continue;
    if (new RegExp(`(?:^|[^A-Za-z])${escapeRegExp(abbr)}`, "i").test(window)) return name;
  }
  for (const name of US_STATE_NAMES) {
    if (jurName && name.toLowerCase() === jurName.toLowerCase()) continue;
    if (new RegExp(`\\b${name}\\b`, "i").test(window)) return name;
  }
  return null;
}

/**
 * Detect foreign-state STATUTORY citations in the letter. For each statutory
 * marker (§ N, "Rev. Stat.", "<X> Code", …) we inspect the ~45 chars leading up
 * to it for a state token. Precise on two axes:
 *   - only fires on statutory authority (a marker is required), so federal case
 *     names with state parties ("Texas v. Johnson") are NOT flagged; and
 *   - only fires when the state token sits in the citation's lead-in, so an
 *     out-of-state party/address mentioned elsewhere is NOT flagged.
 */
function detectForeignStateStatutes(text: string, jurName: string | null): string[] {
  const found = new Set<string>();
  STATUTE_MARKER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = STATUTE_MARKER_RE.exec(text)) !== null) {
    const start = Math.max(0, m.index - 45);
    const window = text.slice(start, m.index + m[0].length);
    const fs = foreignStateInWindow(window, jurName);
    if (fs) found.add(fs);
    if (STATUTE_MARKER_RE.lastIndex === m.index) STATUTE_MARKER_RE.lastIndex++;
  }
  return Array.from(found);
}

/**
 * Deterministic, LLM-free quality checks layered on top of the model's
 * self-grade. The vetting model grading its sibling stage's output
 * systematically over-scores, so it cannot be the ONLY gate. These checks
 * cannot be talked out of:
 *
 *   1. Jurisdiction mismatch — when an EXTRACTED citation cites a different US
 *      state's statutory authority than the intake. That is a clear legal error
 *      and forces a redraft / degrade. We intentionally key off the citation
 *      string (not the whole letter) so a legitimate out-of-state party/address
 *      mention does NOT trigger a false degrade.
 *   2. Citation surfacing — LangGraph research is ungrounded
 *      (researchUnverified), so every specific statute/case the letter cites is
 *      unverified by construction. We surface each as an explicit "verify this"
 *      warning so the reviewing attorney gets a checklist instead of re-reading
 *      the whole letter hunting for authorities.
 *
 * Party-name / jurisdiction-presence findings from validateContentConsistency
 * are surfaced as ADVISORY warnings only — they never drive `degraded`.
 *
 * Exported so it can be unit-tested directly without mocking an LLM.
 */
export function runDeterministicVettingChecks(
  letter: string,
  ctx: NormalizedIntake,
): DeterministicVettingResult {
  const warnings: string[] = [];

  // Advisory consistency checks (party swaps, missing names, jurisdiction not
  // present). validateContentConsistency only reads sender.name, recipient.name
  // and jurisdiction.state — build the minimal shim and cast via the function's
  // own parameter type so we don't depend on the (un-exported) NormalizedPromptInput.
  const consistencyInput = {
    sender: { name: ctx.senderName },
    recipient: { name: ctx.recipientName },
    jurisdiction: { state: ctx.jurisdictionState ?? ctx.jurisdiction },
  } as unknown as Parameters<typeof validateContentConsistency>[1];
  try {
    const consistency = validateContentConsistency(letter, consistencyInput);
    for (const w of consistency.warnings) {
      // Drop validateContentConsistency's broad jurisdiction-mismatch heuristic
      // (it fires on a bare out-of-state party/address near the word "law").
      // The citation-scoped gate below is the authoritative jurisdiction signal;
      // surfacing the legacy one too would show attorneys a false "foreign legal
      // authority" warning.
      if (/jurisdiction mismatch/i.test(w)) continue;
      warnings.push(`CONSISTENCY: ${w}`);
    }
  } catch {
    // A validator regex path must never crash vetting — fail open to the LLM grade.
  }

  // Hard gate: a foreign-state STATUTORY citation (precise — excludes case names
  // and bare out-of-state party/address mentions; covers all 50 states).
  const citations = extractCitationsFromText(letter);
  const jurName = resolveStateName(ctx.jurisdictionState ?? ctx.jurisdiction);
  const foreignStates = detectForeignStateStatutes(letter, jurName);
  const jurisdictionMismatch =
    foreignStates.length > 0
      ? `JURISDICTION MISMATCH: letter cites non-${jurName ?? ctx.jurisdiction} statutory authority (${foreignStates.join(", ")})`
      : null;

  for (const c of citations.slice(0, 20)) {
    warnings.push(`VERIFY CITATION (research ungrounded): ${c}`);
  }
  if (jurisdictionMismatch) warnings.push(jurisdictionMismatch);

  return {
    degraded: jurisdictionMismatch !== null,
    jurisdictionMismatch,
    warnings,
    citations,
  };
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
1. Legal accuracy and jurisdiction compliance for ${ctx.jurisdiction} — flag ANY statute or case that belongs to a different U.S. state's law.
2. Citation correctness and formatting — flag any citation that isn't present in the research findings or that you cannot confirm exists for ${ctx.jurisdiction}.
3. Factual claims — flag anything unsupported by the research findings or the intake.
4. Professional tone and clarity.
5. Persuasiveness toward the stated goal.
6. Completeness — flag if the letter is truncated, missing a salutation, or missing a signature block.
7. Unauthorized-practice / overpromising — flag any guarantee or prediction of a legal outcome, or any claim that the letter is attorney legal advice.

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

Set qualityDegraded=true if the letter has serious issues: score < 7, ANY jurisdiction issue, ANY citation you cannot confirm is from ${ctx.jurisdiction} or U.S. federal law, ANY guarantee of a legal outcome, or any factual claim unsupported by the research/intake.
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

  // ─── Deterministic safety layer — does NOT trust the LLM self-grade alone ───
  const deterministic = runDeterministicVettingChecks(assembledLetter, ctx);
  if (deterministic.jurisdictionMismatch) {
    // Feed the deterministic finding into the report so (a) the redraft loop,
    // which reads vettingReport via buildRedraftContextBlock, actually sees it
    // and can fix it, and (b) the persisted version metadata reflects the real
    // risk rather than the model's optimistic score.
    vettingReport.jurisdictionIssues = [
      ...vettingReport.jurisdictionIssues,
      deterministic.jurisdictionMismatch,
    ];
    if (vettingReport.riskLevel === "low" || vettingReport.riskLevel === "medium") {
      vettingReport.riskLevel = "high";
    }
  }

  const qualityDegraded = vettingReport.qualityDegraded || deterministic.degraded;
  const newWarnings: string[] = [
    ...vettingReport.jurisdictionIssues.map(i => `JURISDICTION: ${i}`),
    ...vettingReport.citationsFlagged.map(i => `CITATION: ${i}`),
    ...vettingReport.factualIssuesFound.map(i => `FACTUAL: ${i}`),
    ...deterministic.warnings,
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
