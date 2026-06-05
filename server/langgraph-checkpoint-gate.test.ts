/**
 * LangGraph checkpoint + draft-preview-gate integration check.
 *
 * This is a focused, end-to-end check of the two halves the product cares
 * about most:
 *
 *   1. CHECKPOINTER — running the StateGraph in-process actually lands a
 *      durable checkpoint for the letter's thread, and the checkpointed
 *      state carries the finalized letter body. We swap the production
 *      PostgresSaver for an in-memory `MemorySaver` (same BaseCheckpointSaver
 *      interface, no network) and then read the checkpoint back via
 *      `getTuple()` / `list()` to prove a "row" landed with real content.
 *
 *   2. PREVIEW GATE — the exact bytes the finalize node persisted as the
 *      `ai_draft` version are the exact bytes the subscriber read-path
 *      (`applyDraftPreviewGate`) surfaces to the DraftPreviewViewer modal:
 *      withheld (empty + `draftPreviewWaiting`) before the 24h unlock window
 *      elapses, and returned in FULL (un-truncated, `draftPreview: true`,
 *      `isRedacted: false`) once it has.
 *
 * Strategy mirrors `phase92-langgraph-pipeline.test.ts`: mock the LLM
 * (`@langchain/anthropic`), the `./db` barrel, `./freePreviewEmailCron`, and
 * the checkpointer module so the whole graph runs deterministically with no
 * network and no real Postgres. The difference here is that we keep a handle
 * on the MemorySaver so we can inspect the persisted checkpoint, and we drive
 * the captured draft through the REAL `applyDraftPreviewGate` pure function.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemorySaver } from "@langchain/langgraph";

// ── A realistic multi-paragraph letter so "full draft" is substantive ──
// (>100 chars, multiple lines) — this makes the empty-vs-full contrast in
// the gate assertions unmistakable rather than relying on a one-liner.
const REFINED_LETTER = [
  "Dear Mr. Landlord,",
  "",
  "Pursuant to California Civil Code § 1950.5, demand is hereby made for the",
  "return of the $2,000 security deposit withheld following the termination",
  "of the tenancy. Under the statute, a landlord must return the deposit, or",
  "an itemized statement of deductions, within twenty-one (21) days of move-out.",
  "",
  "Please remit the full amount within fourteen (14) days to avoid further action.",
  "",
  "Sincerely,",
  "Alice Subscriber",
].join("\n");

// ── Shared mutable state for the mocks (hoisted above vi.mock factories) ──
const h = vi.hoisted(() => ({
  // The MemorySaver instance the checkpointer mock hands to the graph.
  // Reset to a fresh instance in beforeEach so each test inspects only its
  // own thread's checkpoints.
  saver: null as InstanceType<typeof import("@langchain/langgraph").MemorySaver> | null,
  // Captures from the mocked DB layer.
  inserts: [] as any[],
  statuses: [] as Array<{ letterId: number; status: string }>,
  dispatched: [] as number[],
}));

// ── Mock ChatAnthropic: disambiguate stages by system-prompt content ──
// OPENAI/GEMINI keys are deleted in beforeEach so callLlmWithFailover falls
// straight through to this mocked Anthropic fallback (deterministic, offline).
vi.mock("@langchain/anthropic", () => {
  class ChatAnthropic {
    model: string;
    constructor(config: any) {
      this.model = config.model ?? "unknown";
    }
    async invoke(messages: any[]): Promise<any> {
      const sys = typeof messages?.[0]?.content === "string" ? messages[0].content : "";

      if (sys.includes("legal research assistant")) {
        return {
          content: JSON.stringify({
            laws: ["Cal. Civ. Code § 1950.5"],
            statutes: [],
            precedents: [],
            jurisdiction_notes: "Unverified",
            recommended_approach: "Demand return citing § 1950.5",
          }),
          usage_metadata: { input_tokens: 10, output_tokens: 20 },
        };
      }
      if (sys.includes("senior attorney reviewing") || sys.includes("quality assurance")) {
        return {
          content: JSON.stringify({
            riskLevel: "low",
            qualityDegraded: false,
            jurisdictionIssues: [],
            citationsFlagged: [],
            factualIssuesFound: [],
            overallScore: 8,
            summary: "Ready for attorney review",
            recommendations: [],
          }),
          usage_metadata: { input_tokens: 30, output_tokens: 40 },
        };
      }
      if (sys.includes("expert legal editor") || sys.includes("refine and polish")) {
        // Assembly is the stage whose output becomes the persisted draft.
        return {
          content: REFINED_LETTER,
          usage_metadata: { input_tokens: 50, output_tokens: 60 },
        };
      }
      if (sys.includes("expert legal letter writer")) {
        return {
          content: "Dear Mr. Landlord,\n\nInitial draft body.\n\nSincerely,\nAlice",
          usage_metadata: { input_tokens: 70, output_tokens: 80 },
        };
      }
      // Match phase92's fail-loud convention: an unmapped prompt means a
      // stage's system prompt drifted, and we want that to surface here.
      throw new Error(
        `[checkpoint-gate] Unmapped ChatAnthropic.invoke mock path for system prompt: ${sys.slice(0, 120)}`,
      );
    }
    async *stream(): AsyncGenerator<any> {
      throw new Error("[checkpoint-gate] Unexpected ChatAnthropic.stream() call");
    }
  }
  return { ChatAnthropic };
});

// ── Mock the DB barrel so nodes + preview-gate never hit Postgres ──
// getLetterRequestById returns a letter with freePreviewUnlockAt set (24h out)
// and no draft pointer, so preview-gate's isLetterPreviewGated() returns true
// → finalize resolves the status to ai_generation_completed_hidden (the gated
// post-finalize status), and the idempotency guard falls through to a real write.
vi.mock("./db", () => ({
  updateLetterStatus: vi.fn(async (letterId: number, status: string) => {
    h.statuses.push({ letterId, status });
  }),
  createWorkflowJob: vi.fn(async () => ({ insertId: 4242 })),
  updateWorkflowJob: vi.fn(async () => {}),
  getActiveLessons: vi.fn(async () => []),
  updateLetterVersionPointers: vi.fn(async () => {}),
  getLetterRequestById: vi.fn(async (letterId: number) => ({
    id: letterId,
    status: "drafting",
    currentAiDraftVersionId: null,
    submittedByAdmin: false,
    freePreviewUnlockAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })),
  hasLetterBeenPreviouslyUnlocked: vi.fn(async () => false),
  getDb: vi.fn(async () => {
    const db: Record<string, any> = {
      insert: () => ({
        values: (values: any) => ({
          returning: async () => {
            h.inserts.push(values);
            return [{ id: 8888 }];
          },
        }),
      }),
      update: () => ({ set: () => ({ where: async () => {} }) }),
      transaction: async (fn: (tx: unknown) => Promise<void>) => {
        await fn(db);
      },
    };
    return db;
  }),
}));

// ── Mock freePreviewEmailCron so finalize's fire-and-forget is observable ──
vi.mock("./freePreviewEmailCron", () => ({
  dispatchFreePreviewIfReady: vi.fn(async (letterId: number) => {
    h.dispatched.push(letterId);
    return { status: "skipped", reason: "test" };
  }),
}));

// ── Swap the production PostgresSaver for an inspectable in-memory saver ──
vi.mock("./pipeline/graph/checkpointer", () => ({
  getCheckpointer: async () => {
    if (!h.saver) h.saver = new MemorySaver();
    return h.saver;
  },
}));

// ── Import AFTER mocks are registered ──────────────────────────────────
import { runLangGraphPipeline } from "./pipeline/graph";
import { applyDraftPreviewGate, LOCKED_PREVIEW_STATUSES } from "./db/letter-versions";
import { isDraftPreviewUnlocked } from "../shared/utils/draft-preview";

const originalEnv = { ...process.env };

beforeEach(() => {
  h.saver = new MemorySaver();
  h.inserts = [];
  h.statuses = [];
  h.dispatched = [];
  process.env.ANTHROPIC_API_KEY = "test-anth-key";
  // Force the failover helper to skip OpenAI/Gemini and use mocked Anthropic.
  delete process.env.OPENAI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.PERPLEXITY_API_KEY;
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.clearAllMocks();
});

function testIntake() {
  return {
    jurisdiction: { state: "CA", country: "US" },
    letterType: "demand",
    matter: { subject: "Security deposit return", description: "Landlord withheld $2k" },
    desiredOutcome: "Full deposit return",
    tonePreference: "firm",
    sender: { name: "Alice Subscriber", email: "alice@ex.com" },
    recipient: { name: "Bob Landlord", email: "bob@ex.com", address: "1 Main St, Oakland, CA" },
    additionalContext: "Moved out 2025-03-01, deposit never returned",
    financials: { amountOwed: 2000, currency: "USD" },
  };
}

// ════════════════════════════════════════════════════════════════════
// 1. A checkpoint row lands, carrying the finalized draft
// ════════════════════════════════════════════════════════════════════

describe("LangGraph in-process run — checkpoint persistence", () => {
  it("lands a checkpoint for the letter thread carrying the finalized draft body", async () => {
    const letterId = 9001;

    const finalState = await runLangGraphPipeline({
      letterId,
      userId: 7,
      intake: testIntake(),
    });

    // The run completed (not failed).
    expect(finalState.currentStage).toBe("done");

    const saver = h.saver!;
    expect(saver).toBeInstanceOf(MemorySaver);

    // The thread_id convention is `letter_<id>` (see runLangGraphPipeline).
    const threadConfig = { configurable: { thread_id: `letter_${letterId}` } };

    // A checkpoint "row" landed for this thread.
    const tuple = await saver.getTuple(threadConfig);
    expect(tuple).toBeDefined();
    expect(tuple!.checkpoint).toBeDefined();

    // The checkpointed channel values carry the merged pipeline state, with
    // the finalized letter body and the terminal stage.
    const channels = tuple!.checkpoint.channel_values as Record<string, any>;
    expect(channels.currentStage).toBe("done");
    // vetting sets vettedLetter = assembledLetter (text unchanged), so both
    // channels should hold the polished assembly output.
    expect(channels.vettedLetter).toBe(REFINED_LETTER);
    expect(channels.assembledLetter).toBe(REFINED_LETTER);

    // More than one checkpoint was written — LangGraph snapshots after every
    // super-step, so each node's contribution was persisted, not just the last.
    let checkpointCount = 0;
    for await (const _ of saver.list(threadConfig)) checkpointCount++;
    expect(checkpointCount).toBeGreaterThan(1);

    // Sanity: an unrelated thread has no checkpoint.
    const missing = await saver.getTuple({
      configurable: { thread_id: "letter_does_not_exist" },
    });
    expect(missing).toBeUndefined();
  });

  it("persists the same finalized body to the ai_draft version that the checkpoint holds", async () => {
    const letterId = 9002;

    await runLangGraphPipeline({ letterId, userId: 7, intake: testIntake() });

    // finalize wrote exactly one ai_draft version row.
    expect(h.inserts).toHaveLength(1);
    expect(h.inserts[0].versionType).toBe("ai_draft");
    expect(h.inserts[0].content).toBe(REFINED_LETTER);

    // The free-preview dispatcher fired fire-and-forget for this letter.
    expect(h.dispatched).toContain(letterId);

    // The persisted draft and the checkpointed state are byte-identical —
    // proving the same content flowed graph → checkpoint AND graph → finalize.
    const tuple = await h.saver!.getTuple({
      configurable: { thread_id: `letter_${letterId}` },
    });
    const channels = tuple!.checkpoint.channel_values as Record<string, any>;
    expect(h.inserts[0].content).toBe(channels.vettedLetter);
  });
});

// ════════════════════════════════════════════════════════════════════
// 2. The gate returns the full draft after unlock (and withholds before)
// ════════════════════════════════════════════════════════════════════

describe("Draft-preview gate — full draft surfaces only after unlock", () => {
  it("withholds the finalized draft before unlock, returns it in full after", async () => {
    const letterId = 9003;

    await runLangGraphPipeline({ letterId, userId: 7, intake: testIntake() });

    // The exact draft body the finalize node persisted as the ai_draft version.
    const persistedContent: string = h.inserts[0].content;
    expect(persistedContent).toBe(REFINED_LETTER);
    expect(persistedContent.length).toBeGreaterThan(100);

    // The status finalize transitioned the gated letter into.
    const finalStatus = h.statuses.at(-1)!.status;
    expect(finalStatus).toBe("ai_generation_completed_hidden");
    expect(LOCKED_PREVIEW_STATUSES.has(finalStatus)).toBe(true);

    // The subscriber read-path sees one ai_draft version row with this content.
    const aiDraftRow = { id: 8888, versionType: "ai_draft", content: persistedContent };

    // ── Before unlock: 24h window still in the future ──
    const future = new Date(Date.now() + 60 * 60 * 1000); // +1h
    expect(isDraftPreviewUnlocked({ draftVisibleAt: future })).toBe(false);

    const [waiting] = applyDraftPreviewGate([aiDraftRow], finalStatus, {
      isFreePreview: true,
      freePreviewUnlockAt: future,
    });
    expect(waiting.content).toBe(""); // withheld
    expect(waiting.truncated).toBe(true);
    expect((waiting as any).draftPreviewWaiting).toBe(true);
    expect((waiting as any).freePreviewWaiting).toBe(true);
    expect((waiting as any).draftPreview).toBeUndefined();

    // ── After unlock: 24h window has elapsed ──
    const past = new Date(Date.now() - 60 * 60 * 1000); // -1h
    expect(isDraftPreviewUnlocked({ draftVisibleAt: past })).toBe(true);

    const [unlocked] = applyDraftPreviewGate([aiDraftRow], finalStatus, {
      isFreePreview: true,
      freePreviewUnlockAt: past,
    });
    // Full, un-truncated, un-redacted draft — exactly what finalize persisted.
    expect(unlocked.content).toBe(persistedContent);
    expect(unlocked.truncated).toBe(false);
    expect((unlocked as any).draftPreview).toBe(true);
    expect((unlocked as any).freePreview).toBe(true);
    expect((unlocked as any).isRedacted).toBe(false);

    // The flags the DraftPreviewViewer modal keys off of are present, and the
    // content is the full body (not the ~empty waiting state).
    const modalWouldShowFullDraft =
      ((unlocked as any).draftPreview === true || (unlocked as any).freePreview === true) &&
      Boolean(unlocked.content);
    expect(modalWouldShowFullDraft).toBe(true);
  });

  it("paid-subscriber path (isFreePreview=false) also returns the full draft after unlock", async () => {
    const letterId = 9004;

    await runLangGraphPipeline({ letterId, userId: 7, intake: testIntake() });
    const persistedContent: string = h.inserts[0].content;
    const finalStatus = h.statuses.at(-1)!.status;

    const aiDraftRow = { id: 8888, versionType: "ai_draft", content: persistedContent };
    const past = new Date(Date.now() - 60 * 60 * 1000);

    const [unlocked] = applyDraftPreviewGate([aiDraftRow], finalStatus, {
      isFreePreview: false,
      freePreviewUnlockAt: past,
    });
    expect(unlocked.content).toBe(persistedContent);
    expect((unlocked as any).draftPreview).toBe(true);
    // freePreview flag is omitted for the paid path — but the draft is still full.
    expect((unlocked as any).freePreview).toBeUndefined();
    expect(unlocked.truncated).toBe(false);
  });
});
