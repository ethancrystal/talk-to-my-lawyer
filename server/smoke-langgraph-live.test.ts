/**
 * LangGraph LIVE smoke test — actually generates real letters via Gemini.
 *
 * Gated behind LANGGRAPH_SMOKE_LIVE=1 so it does NOT run on a normal
 * `pnpm test`. Without the flag, every `it` is skipped.
 *
 * To run:
 *   LANGGRAPH_SMOKE_LIVE=1 pnpm test smoke-langgraph-live
 *
 * What it does:
 *   - Loads the parent .env (where GEMINI_API_KEY lives) synchronously.
 *   - Mocks DB writes (no rows in your Supabase, no emails sent).
 *   - Does NOT mock the LLM clients — Gemini gets the real API call.
 *   - Runs runLangGraphPipeline twice with two distinct intakes.
 *   - console.logs the generated letter, the vetting report, and per-stage
 *     token usage so you can eyeball quality.
 *
 * Cost: each letter is ~4 stages × ~1k tokens ≈ free on Gemini Flash's
 * free tier (15 req/min). 2 letters = 8 requests, finishes in ~30s.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// ── Load parent .env BEFORE vi.mock factories run ──────────────────
// vi.mock is hoisted, but module-level code at the top of this file
// still runs before any test executes. The .env values just need to
// be present by the time runLangGraphPipeline is called, since the
// failover helper reads process.env per call.
(function loadParentEnv() {
  const candidates = [
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, "../../.env"),
    path.resolve(__dirname, "../../../.env"),
    path.resolve(__dirname, "../../../../.env"),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      // Strip surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Only set if not already in env — never clobber a real shell env var.
      if (!process.env[key]) process.env[key] = value;
    }
    break;
  }
})();

const LIVE = process.env.LANGGRAPH_SMOKE_LIVE === "1";

// ─── Mocks (mirror phase92 — DB / checkpointer / freePreviewEmailCron only) ───

const mocks = vi.hoisted(() => ({
  letterVersionsInserts: [] as any[],
  dispatchFreePreviewIfReady: [] as number[],
}));

vi.mock("./db", () => ({
  updateLetterStatus: vi.fn().mockResolvedValue(undefined),
  createWorkflowJob: vi.fn().mockResolvedValue({ insertId: 999_999 }),
  updateWorkflowJob: vi.fn().mockResolvedValue(undefined),
  updateLetterVersionPointers: vi.fn().mockResolvedValue(undefined),
  getActiveLessons: vi.fn().mockResolvedValue([]),
  hasLetterBeenPreviouslyUnlocked: vi.fn().mockResolvedValue(false),
  getLetterRequestById: vi.fn().mockImplementation(async (letterId: number) => ({
    id: letterId,
    status: "drafting",
    currentAiDraftVersionId: null,
    submittedByAdmin: false,
    freePreviewUnlockAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })),
  getDb: vi.fn().mockImplementation(async () => {
    const db: Record<string, any> = {
      insert: () => ({
        values: (values: any) => ({
          returning: async () => {
            mocks.letterVersionsInserts.push(values);
            return [{ id: 555_555 }];
          },
        }),
      }),
      update: () => ({
        set: () => ({ where: async () => undefined }),
      }),
      transaction: async (fn: (tx: unknown) => Promise<void>) => {
        await fn(db);
      },
    };
    return db;
  }),
}));

vi.mock("./freePreviewEmailCron", () => ({
  dispatchFreePreviewIfReady: vi
    .fn()
    .mockImplementation(async (letterId: number) => {
      mocks.dispatchFreePreviewIfReady.push(letterId);
      return { status: "skipped", reason: "smoke-test" };
    }),
}));

vi.mock("./pipeline/graph/checkpointer", async () => {
  const { MemorySaver } = await import("@langchain/langgraph");
  let saver: any = null;
  return {
    getCheckpointer: async () => {
      if (!saver) saver = new MemorySaver();
      return saver;
    },
  };
});

// Disable Supabase draft streaming so the draft node doesn't try to connect.
// Also force GEMINI_MODEL to gemini-flash-latest (the model the user's curl
// example targets); the parent .env pins gemini-2.0-flash which has free-tier
// quota = 0 on this account, so the override gives Gemini a fair shot.
beforeEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.GEMINI_MODEL = "gemini-flash-latest";
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Import pipeline AFTER mocks are registered ─────────────────────
import { runLangGraphPipeline } from "./pipeline/graph";
import type { PipelineStateType } from "./pipeline/graph/state";

// ─── Helpers ───────────────────────────────────────────────────────

function logLetter(label: string, finalState: PipelineStateType, slug: string) {
  const letter = finalState.vettedLetter || finalState.assembledLetter || "";
  const report = finalState.vettingReport;
  const tokenUsage = finalState.sharedContext.tokenUsage ?? [];

  let totalPrompt = 0;
  let totalCompletion = 0;
  const usageLines: string[] = [];
  for (const u of tokenUsage) {
    totalPrompt += u.promptTokens ?? 0;
    totalCompletion += u.completionTokens ?? 0;
    usageLines.push(
      `  ${u.stage.padEnd(10)} ${u.provider.padEnd(12)} ${(u.model ?? "").padEnd(38)} in=${u.promptTokens} out=${u.completionTokens}`,
    );
  }
  usageLines.push(
    `  ${"TOTAL".padEnd(10)} ${" ".padEnd(12)} ${" ".padEnd(38)} in=${totalPrompt} out=${totalCompletion}`,
  );

  const output = [
    "═".repeat(72),
    `  ${label}`,
    "═".repeat(72),
    "",
    letter,
    "",
    "─".repeat(72),
    "VETTING REPORT",
    JSON.stringify(report, null, 2),
    "",
    "─".repeat(72),
    "TOKEN USAGE BY STAGE",
    ...usageLines,
    "═".repeat(72),
  ].join("\n");

  // Write to file so it survives vitest's stdout interception, then also try console.
  const outputDir = path.resolve(__dirname, "../.smoke-test-output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, `${slug}.txt`), output, "utf-8");
  // eslint-disable-next-line no-console
  console.log(output);
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("LangGraph LIVE smoke test (gated by LANGGRAPH_SMOKE_LIVE=1)", () => {
  it.skipIf(!LIVE)(
    "Letter 1: CA security deposit demand — runs end-to-end via Gemini",
    async () => {
      const intake = {
        jurisdiction: { state: "CA", country: "US" },
        letterType: "demand",
        matter: {
          subject: "Return of security deposit",
          description:
            "Landlord has withheld $2,400 of a $3,000 security deposit citing 'cleaning' and 'painting' without an itemized list, 60 days after move-out.",
        },
        desiredOutcome: "Full refund of the $2,400 withheld, plus statutory damages where applicable.",
        tonePreference: "firm",
        sender: { name: "Alice Subscriber", email: "alice@example.com" },
        recipient: {
          name: "Bob Landlord",
          email: "bob@example.com",
          address: "1 Main St, Oakland, CA 94612",
        },
        additionalContext: "Moved out 2025-03-01. No itemized statement provided to date. Property left clean.",
        financials: { amountOwed: 2400, currency: "USD" },
      };

      const result = await runLangGraphPipeline({
        letterId: 9_000_001,
        userId: 1,
        intake,
        isFreePreview: false,
      });

      logLetter("LETTER 1 — CA security deposit demand", result, "letter-1-ca-deposit");

      expect(result.currentStage).toBe("done");
      const letter = result.vettedLetter || result.assembledLetter || "";
      expect(letter.length).toBeGreaterThan(200);
      expect(letter).toMatch(/Dear/i);
      expect(letter).toMatch(/Sincerely|Respectfully|Regards/i);
    },
    180_000,
  );

  it.skipIf(!LIVE)(
    "Letter 2: NY non-compete dispute — runs end-to-end via Gemini",
    async () => {
      const intake = {
        jurisdiction: { state: "NY", country: "US" },
        letterType: "cease_and_desist",
        matter: {
          subject: "Unenforceable non-compete clause",
          description:
            "Former employer is threatening litigation over a 2-year, nationwide non-compete clause for a junior marketing role. Clause is overbroad and likely unenforceable under recent NY guidance.",
        },
        desiredOutcome:
          "Confirmation in writing that the employer will not pursue enforcement, allowing client to accept a competing job offer.",
        tonePreference: "professional",
        sender: { name: "Casey Plaintiff", email: "casey@example.com" },
        recipient: {
          name: "Acme Corp Legal Department",
          email: "legal@acme.example",
          address: "100 Park Ave, New York, NY 10001",
        },
        additionalContext:
          "Client's role did not involve trade secrets, customer lists, or proprietary methodology. Salary was below the FTC's $151k threshold during employment.",
        financials: null,
      };

      const result = await runLangGraphPipeline({
        letterId: 9_000_002,
        userId: 1,
        intake,
        isFreePreview: false,
      });

      logLetter("LETTER 2 — NY non-compete dispute", result, "letter-2-ny-noncompete");

      expect(result.currentStage).toBe("done");
      const letter = result.vettedLetter || result.assembledLetter || "";
      expect(letter.length).toBeGreaterThan(200);
      expect(letter).toMatch(/Dear/i);
      expect(letter).toMatch(/Sincerely|Respectfully|Regards/i);
    },
    180_000,
  );
});
