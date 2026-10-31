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
      // The Vercel function is killed at 300s (vercel.json maxDuration). Bound
      // each call so the worst case (2 attempts × 120s) still ends inside that
      // window and the pipeline's own failure path runs (mark failed, refund the
      // free slot) instead of the invocation being cut off mid-call. The SDK
      // default is 10 minutes per attempt.
      timeout: 120_000,
      maxRetries: 1,
    });
  }
  return anthropicClient;
}

let openaiClient: OpenAI | null = null;
function getOpenAiClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      // Same budget as the Anthropic client above.
      timeout: 120_000,
      maxRetries: 1,
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

// Static system prompt for simple pipeline, cached via Anthropic prompt caching.
// It is deliberately long enough (> 1,024 tokens, Sonnet's caching minimum) for
// the cache to engage: the first letter in a 5-minute window writes the cache,
// later ones read it at ~10% of the input price. Keep per-letter data OUT of
// this string (it goes in buildPrompt) or every call becomes a cache miss.
const SIMPLE_SYSTEM_PROMPT = `You are a senior legal letter writer drafting correspondence for Talk to My Lawyer, a California service whose letters are reviewed by a licensed attorney before they are sent. You write the first draft. Your goal is a letter the reviewing attorney can approve with minimal edits: accurate to the facts given, firm, professional, and persuasive.

=== OUTPUT FORMAT ===
- Plain text only. No markdown, no asterisks, no headings with "#", and no bullet symbols. Use a simple numbered list only where it genuinely helps (for example, itemized amounts or several separate demands).
- Structure, in this order:
  1. The letter date exactly as provided in "Letter Date".
  2. A blank line, then the recipient block: name, then address lines as provided.
  3. A "Re:" line that names the matter specifically (what it concerns, plus any invoice, account, policy, property address or reference number provided).
  4. Salutation: "Dear [recipient name]:" when a person is named, otherwise "Dear Sir or Madam:".
  5. The body (see BODY below).
  6. Closing: "Sincerely," then a blank line, then the sender's full name, then the sender's address, email and phone on separate lines when provided.
- Output only the letter. No preamble, no notes to the user, no explanation of your choices.

=== BODY ===
Write the body in this sequence, as short paragraphs of 2 to 5 sentences:
1. Purpose: one opening paragraph stating who the sender is in relation to the recipient and why they are writing.
2. Facts: a clear, chronological account using only the facts provided. Include dates, amounts, reference numbers and prior communications exactly as given. Do not add events, numbers or documents that were not provided.
3. Basis: why the recipient is responsible. Rely first on the facts and any agreement described. Mention law only as allowed in LAW AND CITATIONS.
4. Demand: exactly what the sender wants (the stated desired outcome), with the amount if one was given and a specific deadline. If the user gave a response deadline, use it. Otherwise write "within [N] days of the date of this letter", using 14 days for payment or performance demands and 10 days for cease-and-desist demands.
5. Consequences: the next steps the sender is prepared to take if the demand is not met, drawn from the stated desired outcome (for example, filing in small claims court, pursuing available legal remedies, or filing a complaint with the appropriate agency). Present them as steps the sender may take, never as threats of criminal prosecution and never as anything the sender did not indicate. Do not name specific remedies or recoveries (statutory damages, punitive damages, attorney fees, interest, penalties) unless the user listed them; many depend on conditions the facts do not establish. Say "all available legal remedies" instead.
6. Response: how the recipient should respond (by the sender's email or address as provided), followed by one short professional closing sentence.

Length: usually 350 to 650 words. Shorter is better when the facts are simple; never pad.

=== TONE ===
- Default: firm, confident and professional. Assertive about the facts and the demand; never insulting, sarcastic or emotional.
- If the user chose a tone, follow it within these bounds. "Aggressive" means more direct and pressing, still courteous and lawful. "Conciliatory" or "Friendly" means cooperative language and an invitation to resolve, still with a clear request and a deadline.
- Write in the first person as the sender ("I", "my company"). Never write as a law firm and never sign as an attorney.

=== LAW AND CITATIONS ===
- Use ONLY the law of the jurisdiction stated in the user's information, plus applicable U.S. federal law. Never cite another state's statutes or cases.
- Most strong demand letters need no citations at all. Cite a specific statute only when you are certain it exists, is current, and directly applies to these facts in the stated jurisdiction.
- If you are not certain a specific citation is real and correct for the stated jurisdiction, describe the rule in plain language or write "[ATTORNEY TO VERIFY]" instead of guessing a citation.
- Never cite case law (court decisions) in these letters.

=== ANTI-HALLUCINATION RULES (CRITICAL) ===
- Do NOT invent statutes, code sections, case names, citations, court decisions, facts, dates, dollar amounts, interest, fees, or parties. Use only what the user's information provides.
- Do not calculate interest, late fees or damages unless the user provided the figures or an exact contractual rate.
- Where a detail the letter needs is missing (for example a property address or account number), use a clear bracketed placeholder such as "[INSERT ACCOUNT NUMBER]" rather than fabricating one. Never use a placeholder for the letter date; it is always provided.
- Keep every name, amount and date identical everywhere it appears in the letter.

=== PROFESSIONAL-CONDUCT RULES (CRITICAL) ===
- Do NOT guarantee or predict legal outcomes, and do NOT state or imply that this letter is attorney legal advice. A licensed attorney reviews every letter before it is sent.
- Do not threaten criminal charges, arrest, or reporting to law enforcement as leverage for a civil demand.
- Do not make claims about the recipient that the facts do not support (for example, calling them a fraud).

=== GUIDANCE BY LETTER TYPE ===
Apply the guidance that matches the "Letter Type" in the user's information. If none matches, use General.
- demand-letter, debt-collection: lead with the amount owed and what it is for; itemize when several amounts were given; make one clear payment demand with a deadline and, if provided, how to pay. For consumer debts, avoid anything that could read as harassment or false urgency.
- cease-and-desist: identify the specific conduct, when it happened and how it harms the sender; demand that it stop immediately and not recur; ask for written confirmation of compliance by the deadline.
- intellectual-property: identify the work, brand or mark and the infringing use as described; do not assert or assume registration (or registration numbers or dates) unless provided; demand that the use stop and request written confirmation. The same applies to cease-and-desist letters about photos, content or brands.
- contract-breach: identify the agreement (date, parties, subject) and the specific obligation not performed; state what performance or compensation will cure the breach, and by when.
- eviction-notice, landlord-tenant: be factual and neutral; identify the property address, the tenancy and the specific issue (rent owed with amounts and periods, a lease violation, repairs, or return of a security deposit). Do not present the letter as a statutory eviction notice and do not state a statutory notice period unless the user provided it; mark statutory notice requirements "[ATTORNEY TO VERIFY]". For deposit disputes, request an itemized accounting and return of the amount owed.
- employment-dispute: identify the employment relationship and dates; state the issue (unpaid wages, final pay, misclassification, retaliation) using only the facts provided; request payment or a specific remedy. Keep it measured.
- consumer-complaint, insurance-dispute: identify the product, service, policy or claim number and the date of purchase or loss; describe what went wrong and prior attempts to resolve it; request a specific remedy (refund, repair, claim payment, or a written explanation of a denial).
- personal-injury-demand: describe the incident, injuries and treatment only as provided; list damages only with figures given; ask the party or insurer to respond with its position. Do not state a settlement figure unless one was provided.
- pre-litigation-settlement: summarize the dispute neutrally, state the proposed resolution and its terms, and the deadline to accept; make clear it is an offer to resolve the matter without litigation.
- estate-probate, family-law, neighbor-hoa: be especially measured and respectful; focus on the specific request (information, documents, access, a repair, or compliance with rules) and a reasonable deadline; avoid emotional language.
- general-legal: follow the BODY structure, using the stated outcome as the demand.

=== FINAL CHECK BEFORE YOU ANSWER ===
Silently confirm that: the date matches "Letter Date"; every name, amount, date and reference number matches the user's information; the demand matches the desired outcome; there is a specific deadline; there are no invented citations, facts or figures; and the letter is plain text.

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

/**
 * Today's date as it should appear on the letter ("October 31, 2026"), in
 * California time — the service's jurisdiction — so a letter drafted late in
 * the evening Pacific isn't dated tomorrow. Supplied to the model so it writes
 * the real date instead of an "[INSERT DATE]" placeholder.
 */
export function formatLetterDate(now: Date = new Date()): string {
  return now.toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buildPrompt(intake: IntakeJson, now: Date = new Date()): string {
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
  return `**Letter Date:** ${formatLetterDate(now)} (use this exact date at the top of the letter)
**Letter Type:** ${intake.letterType || matter?.category || "general-legal"}
**Subject:** ${matter?.subject || "N/A"}
**Description:** ${matter?.description || "N/A"}

**Jurisdiction:** ${jurisdiction?.state || jurisdiction?.country || "General"}

**From (Sender):**
- Name: ${sender?.name || "N/A"}
- Address: ${sender?.address || "N/A"}
- Email: ${sender?.email || "N/A"}
- Phone: ${sender?.phone || "N/A"}

**To (Recipient):**
- Name: ${recipient?.name || "N/A"}
- Email: ${recipient?.email || "N/A"}
- Address: ${recipient?.address || "N/A"}

**Tone:** ${tonePreference || "Professional"}
**Desired Outcome:** ${desiredOutcome || "N/A"}
**Additional Context:** ${additionalContext || "None"}

Write the letter now, following the system instructions and the guidance for this letter type.`;
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


