import type { IntakeJson } from "../../shared/types";
import { createLogger } from "../logger";
import { Anthropic } from "@anthropic-ai/sdk";
import { OpenAI } from "openai";
import { withRawCacheControl } from "./providers";
import {
  updateLetterStatus,
  createLetterVersion,
  updateLetterVersionPointers,
  createWorkflowJob,
  updateWorkflowJob,
  getAllUsers,
} from "../db";
import { sendAdminAlertEmail } from "../email";
import { dispatchFreePreviewIfReady } from "../freePreviewEmailCron";
import {
  finalizeDraftPreviewStatus,
  isLetterPreviewGated,
} from "./preview-gate";

const logger = createLogger({ module: "simple-pipeline" });

/**
 * Ultra-simple letter generation pipeline
 *
 * Single stage by default: Take user intake → Claude generates letter → Save to DB
 * No research, no vetting, no orchestration complexity.
 *
 * If GEMINI_API_KEY is present, simple mode uses a two-stage generation path:
 * Gemini creates the initial draft, OpenAI finalizes it, and only the OpenAI
 * final output is saved as the immutable ai_draft. If that path fails, the
 * pipeline falls back to the existing Claude → OpenAI fallback path.
 *
 * Enable via PIPELINE_MODE=simple
 */

// Lazy client construction — mirrors the ENV lazy-getter convention in
// server/_core/env.ts. Constructing these at module load crashes any
// importing module when the key is absent (the OpenAI SDK throws in its
// constructor), which breaks test files and couples unrelated modules to
// AI env vars. Clients are memoized per process; keys are re-read from
// process.env on first use.
let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

let openaiClient: OpenAI | null = null;
function getOpenAiClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";
const OPENAI_MODEL = process.env.OPENAI_FINALIZER_MODEL ?? "gpt-4o";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

interface GenerationResult {
  content: string;
  provider: "anthropic" | "openai" | "gemini_openai";
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  metadata?: Record<string, unknown>;
}

interface GeminiDraftResult {
  content: string;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// Static system prompt for simple pipeline — cached via Anthropic prompt caching.
// This prefix is identical across all simple-pipeline calls, so the API server
// caches it for 5 minutes and subsequent calls within the window pay reduced
// input token costs (~90% savings on the system block).
const SIMPLE_SYSTEM_PROMPT = `You are a professional legal letter writer. Generate a formal legal letter based on the user's information.

The letter should:
1. Use proper legal formatting (date, recipient address, salutation, body, closing, signature block)
2. Be clear, concise, and professional
3. Address the core issue(s) described
4. Suggest appropriate next steps or remedies that follow from the facts provided
5. Be formatted in plain text (not markdown)

Jurisdiction discipline (CRITICAL):
- Use ONLY the law of the jurisdiction stated in the user's information, plus applicable U.S. federal law. Never cite another state's statutes or cases.

Anti-hallucination rules (CRITICAL):
- Do NOT invent statutes, code sections, case names, citations, court decisions, facts, dates, dollar amounts, or parties. Use only what the user's information provides or well-known law for the stated jurisdiction.
- If you are not certain a specific citation is real and correct for the stated jurisdiction, describe the rule in plain language or write "[ATTORNEY TO VERIFY]" instead of guessing a citation.
- Where a detail is missing, use a clear bracketed placeholder (e.g. "[INSERT DATE]") rather than fabricating one.

Professional-conduct rules (CRITICAL):
- Do NOT guarantee or predict legal outcomes, and do NOT state or imply that this letter is attorney legal advice. A licensed attorney reviews every letter before it is sent.

Output only the letter content, ready to send.`;

/**
 * Try Claude first, then fall back to OpenAI.
 *
 * Uses Anthropic prompt caching on the system prompt — the static instructions
 * are tagged with cache_control: { type: "ephemeral" } so repeated calls within
 * a 5-minute window hit the cache and pay reduced input token costs.
 */
async function generateLetter(prompt: string): Promise<GenerationResult> {
  try {
    const message = await getAnthropicClient().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: withRawCacheControl(SIMPLE_SYSTEM_PROMPT),
      messages: [{ role: "user", content: prompt }],
    });

    const content =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    logger.info(
      {
        cacheCreation: (message.usage as any)?.cache_creation_input_tokens,
        cacheRead: (message.usage as any)?.cache_read_input_tokens,
      },
      "[Simple] Claude prompt cache stats"
    );

    return {
      content,
      provider: "anthropic",
      model: CLAUDE_MODEL,
      usage: {
        inputTokens: message.usage?.input_tokens,
        outputTokens: message.usage?.output_tokens,
      },
      metadata: {
        cacheCreationTokens: (message.usage as any)?.cache_creation_input_tokens,
        cacheReadTokens: (message.usage as any)?.cache_read_input_tokens,
      },
    };
  } catch (claudeErr) {
    logger.warn(
      { err: getErrorMessage(claudeErr) },
      "[Simple] Claude failed, falling back to OpenAI"
    );

    const completion = await getOpenAiClient().chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: 4096,
      messages: [
        { role: "system", content: SIMPLE_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";

    return {
      content,
      provider: "openai",
      model: OPENAI_MODEL,
      usage: {
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
      },
    };
  }
}

async function generateInitialDraftWithGemini(
  prompt: string
): Promise<GeminiDraftResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 4096,
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${prompt}\n\nCreate the initial legal letter draft. Preserve the facts exactly. Output only the draft letter text.`,
              },
            ],
          },
        ],
      }),
    }
  );

  const rawText = await response.text();
  let payload: any = null;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ??
      rawText.slice(0, 500) ??
      `Gemini request failed with ${response.status}`;
    throw new Error(`Gemini request failed: ${message}`);
  }

  const content =
    payload?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim() ?? "";

  if (!content) {
    throw new Error("Gemini returned empty draft");
  }

  return {
    content,
    model: GEMINI_MODEL,
    usage: {
      inputTokens: payload?.usageMetadata?.promptTokenCount,
      outputTokens: payload?.usageMetadata?.candidatesTokenCount,
    },
  };
}

async function finalizeGeminiDraftWithOpenAI(
  originalPrompt: string,
  geminiDraft: GeminiDraftResult
): Promise<GenerationResult> {
  const completion = await getOpenAiClient().chat.completions.create({
    model: OPENAI_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content:
          "You are finalizing a legal letter draft. Preserve all facts from the user intake. Do not invent facts, dates, laws, threats, citations, attorney names, or procedural claims. Improve structure, clarity, tone, formatting, and completeness. Output only the final letter text in plain text.",
      },
      {
        role: "user",
        content: `Original intake prompt:\n${originalPrompt}\n\nInitial Gemini draft:\n${geminiDraft.content}\n\nFinalize this into a polished legal letter. Output only the final letter text.`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!content) {
    throw new Error("OpenAI finalizer returned empty response");
  }

  return {
    content,
    provider: "gemini_openai",
    model: `${geminiDraft.model} -> ${OPENAI_MODEL}`,
    usage: {
      inputTokens:
        (geminiDraft.usage?.inputTokens ?? 0) +
        (completion.usage?.prompt_tokens ?? 0),
      outputTokens:
        (geminiDraft.usage?.outputTokens ?? 0) +
        (completion.usage?.completion_tokens ?? 0),
    },
    metadata: {
      mode: "simple_gemini_openai_two_stage",
      initialProvider: "gemini",
      initialModel: geminiDraft.model,
      initialPromptTokens: geminiDraft.usage?.inputTokens,
      initialCompletionTokens: geminiDraft.usage?.outputTokens,
      finalizerProvider: "openai",
      finalizerModel: OPENAI_MODEL,
      finalizerPromptTokens: completion.usage?.prompt_tokens,
      finalizerCompletionTokens: completion.usage?.completion_tokens,
    },
  };
}

async function generateLetterForSimplePipeline(
  prompt: string
): Promise<GenerationResult> {
  if (!process.env.GEMINI_API_KEY) {
    return generateLetter(prompt);
  }

  try {
    logger.info(
      { geminiModel: GEMINI_MODEL, finalizerModel: OPENAI_MODEL },
      "[Simple] GEMINI_API_KEY detected — using Gemini draft with OpenAI finalizer"
    );
    const geminiDraft = await generateInitialDraftWithGemini(prompt);
    return await finalizeGeminiDraftWithOpenAI(prompt, geminiDraft);
  } catch (err) {
    logger.warn(
      { err: getErrorMessage(err) },
      "[Simple] Gemini→OpenAI generation failed, falling back to Claude/OpenAI"
    );
    return generateLetter(prompt);
  }
}

function buildPrompt(intake: IntakeJson): string {
  const {
    matter,
    jurisdiction,
    recipient,
    sender,
    tonePreference,
    desiredOutcome,
    additionalContext,
  } = intake;

  // The static instructions now live in SIMPLE_SYSTEM_PROMPT (cached).
  // This user prompt contains only the per-letter dynamic data.
  return `**Letter Type:** ${matter?.category || "General Legal Matter"}
**Subject:** ${matter?.subject || "N/A"}
**Description:** ${matter?.description || "N/A"}

**Jurisdiction:** ${jurisdiction?.state || jurisdiction?.country || "General"}

**From (Sender):**
- Name: ${sender?.name || "N/A"}
- Email: ${sender?.email || "N/A"}
- Phone: ${sender?.phone || "N/A"}

**To (Recipient):**
- Name: ${recipient?.name || "N/A"}
- Email: ${recipient?.email || "N/A"}
- Address: ${recipient?.address || "N/A"}

**Tone:** ${tonePreference || "Professional"}
**Desired Outcome:** ${desiredOutcome || "N/A"}
**Additional Context:** ${additionalContext || "None"}

Generate a comprehensive, professional legal letter addressing the matter described above.`;
}

export async function runSimplePipeline(
  letterId: number,
  intake: IntakeJson,
  userId?: number
): Promise<{ success: boolean; letter?: string; error?: string }> {
  // Hoisted so catch block can also call updateWorkflowJob on failure
  let jobId = 0;

  try {
    logger.info({ letterId, userId }, "[Simple] Starting simple pipeline");

    // Create a workflow_jobs record so admin pipeline monitor and getWorkflowJobsByLetterId
    // can see simple-mode letters — without this, failures are invisible to admins.
    const job = await createWorkflowJob({
      letterRequestId: letterId,
      jobType: "generation_pipeline",
      provider: "simple",
      requestPayloadJson: { mode: "simple", letterType: intake.letterType },
    });
    jobId = job?.insertId ?? 0;
    await updateWorkflowJob(jobId, {
      status: "running",
      startedAt: new Date(),
    });

    // Transition: submitted → researching → drafting (status machine requires this path)
    await updateLetterStatus(letterId, "researching");
    await updateLetterStatus(letterId, "drafting");

    // Build the prompt
    const prompt = buildPrompt(intake);
    logger.debug({ letterId }, "[Simple] Prompt built, calling LLM");

    // Call LLM. If GEMINI_API_KEY is configured, Gemini drafts first and OpenAI
    // finalizes. If that path fails, fall back to the existing Claude/OpenAI path.
    const result = await generateLetterForSimplePipeline(prompt);

    if (!result.content) {
      logger.error({ letterId, provider: result.provider }, "[Simple] LLM returned empty response");
      await updateLetterStatus(letterId, "submitted");
      return {
        success: false,
        error: `${result.provider} returned empty response`,
      };
    }

    logger.info(
      { letterId, provider: result.provider, model: result.model, tokenUsage: result.usage },
      "[Simple] LLM generated letter"
    );

    // Save as ai_draft version (this is what the paywall expects)
    const version = await createLetterVersion({
      letterRequestId: letterId,
      versionType: "ai_draft",
      content: result.content,
      createdByType: "system",
      createdByUserId: userId,
      metadataJson: {
        model: result.model,
        provider: result.provider,
        mode: result.metadata?.mode ?? "simple",
        promptTokens: result.usage?.inputTokens,
        completionTokens: result.usage?.outputTokens,
        ...result.metadata,
      },
    });

    // Update the letter request to point to this version
    await updateLetterVersionPointers(letterId, {
      currentAiDraftVersionId: version.insertId,
    });

    const isPreviewGated = await isLetterPreviewGated(letterId);
    await finalizeDraftPreviewStatus(letterId, isPreviewGated);

    // Free-preview hook: if this letter is on the lead-magnet path and admin
    // has force-unlocked it, fire the "your preview is ready" email now that
    // the draft exists. Normal free-preview letters still wait 24h (the cron
    // polls them); non-free-preview letters are no-op'd by the dispatcher.
    // Fire-and-forget — must never abort the pipeline.
    dispatchFreePreviewIfReady(letterId).catch(err =>
      logger.warn(
        { letterId, err: getErrorMessage(err) },
        "[Simple] dispatchFreePreviewIfReady threw (non-fatal)"
      )
    );

    // Mark workflow job as completed with token usage for cost tracking
    await updateWorkflowJob(jobId, {
      status: "completed",
      completedAt: new Date(),
      promptTokens: result.usage?.inputTokens,
      completionTokens: result.usage?.outputTokens,
    });

    logger.info({ letterId }, "[Simple] Letter saved and status updated");

    return {
      success: true,
      letter: result.content,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error({ err, letterId }, "[Simple] Pipeline failed");

    // Mark workflow job as failed so it appears in admin pipeline monitor
    await updateWorkflowJob(jobId, {
      status: "failed",
      errorMessage: error,
      completedAt: new Date(),
    }).catch(e =>
      logger.error({ e }, "[Simple] Failed to update workflow job on error")
    );

    // Alert admins — mirrors the pattern in fallback.ts / vetting.ts
    getAllUsers("admin")
      .then(admins => {
        const appBaseUrl =
          process.env.APP_BASE_URL ?? "https://www.talk-to-my-lawyer.com";
        return Promise.allSettled(
          admins.map(admin => {
            if (!admin.email) return Promise.resolve();
            return sendAdminAlertEmail({
              to: admin.email,
              name: admin.name ?? "Admin",
              subject: `Simple pipeline failed for letter #${letterId}`,
              preheader: `PIPELINE_MODE=simple letter failed — subscriber usage refunded`,
              bodyHtml: `<p>Letter <strong>#${letterId}</strong> failed during simple pipeline execution.</p><p>Error: <strong>${error}</strong></p><p>The subscriber's usage has been refunded and the letter status reverted to <em>submitted</em> for retry.</p>`,
              ctaText: "View Letter",
              ctaUrl: `${appBaseUrl}/admin/letters/${letterId}`,
            }).catch(e =>
              logger.error({ e }, "[Simple] Failed to send admin alert email")
            );
          })
        );
      })
      .catch(e =>
        logger.error({ e }, "[Simple] Failed to fetch admins for alert")
      );

    // Revert to submitted state to allow retry
    try {
      await updateLetterStatus(letterId, "submitted");
    } catch (updateErr) {
      logger.error(
        { updateErr, letterId },
        "[Simple] Failed to revert status after error"
      );
    }

    return {
      success: false,
      error,
    };
  }
}


