# Vitest Failure Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current Vitest suite pass by repairing stale assertions and brittle mocks while keeping the letter-generation pipeline untouched except for one isolated worker refund checkpoint.

**Architecture:** Treat the failures as four buckets: static assertion drift, mock isolation bugs, test environment setup, and one worker refund behavior mismatch. All fixes happen in tests unless the refund checkpoint confirms the production worker currently consumes a free-trial slot without refunding it after simple-pipeline failure.

**Tech Stack:** TypeScript, Vitest 4, PowerShell, pnpm, Express/tRPC server tests.

---

## File Structure

- Modify: `server/phase66-pdf-approval.test.ts`  
  Use `fileURLToPath()` instead of `.pathname` so static file reads work on Windows.
- Modify: `server/spaRoutes.test.ts`  
  Match the current `llms.txt` link text or make the assertion slug-focused.
- Modify: `server/phase98-comprehensive-pipeline-paywall-attorney.test.ts`  
  Remove the inactive `upsell_dismissed` state-machine assertion.
- Modify: `server/free-preview-delay-ux.test.ts`  
  Update stale free-preview-only static assertions to the draft-preview gate.
- Modify: `server/phase95-free-preview-waiting.test.ts`  
  Rename expectations from `free-preview` helpers to `draft-preview` helpers.
- Modify: `server/phase96-free-preview-visibility-gate.test.ts`  
  Align missing timestamp expectations with current `draftVisibleAt` semantics.
- Modify: `server/free-preview-atomicity.test.ts`  
  Fix the atomic claim mock so it returns the stamped row.
- Modify: `server/phase91-admin-force-free-preview.test.ts`  
  Add a Drizzle-like `select()` mock for notification idempotency.
- Modify: `server/phase74-pipeline-sync.test.ts`  
  Make the preview-gated mock row match the expected hidden status, and make the legacy null-intake case expect `generated_locked`.
- Modify: `server/phase92-langgraph-pipeline.test.ts`  
  Mock the actual `server/db/index.ts` path imported by graph nodes and update stale worker wiring assertions.
- Modify: `server/phase97-letter-lifecycle.test.ts`  
  Mock `./pipeline/simple` so PDF lifecycle tests do not instantiate OpenAI at import time.
- Modify after checkpoint only: `server/worker.ts`  
  Add refund on new-user simple-pipeline failure without changing stage execution.
- Modify after checkpoint only: `server/worker.test.ts`  
  Update the free-trial refund test to expect the current non-throwing simple-bypass control flow plus refund.

---

### Task 1: Create a Branch and Confirm Baseline

**Files:**
- No file edits.

- [ ] **Step 1: Create the repair branch**

```powershell
git switch -c codex/fix-vitest-drift
```

Expected: branch switches to `codex/fix-vitest-drift`.

- [ ] **Step 2: Confirm the focused failing baseline**

```powershell
pnpm exec vitest run `
  server/free-preview-atomicity.test.ts `
  server/free-preview-delay-ux.test.ts `
  server/phase66-pdf-approval.test.ts `
  server/phase74-pipeline-sync.test.ts `
  server/phase91-admin-force-free-preview.test.ts `
  server/phase92-langgraph-pipeline.test.ts `
  server/phase95-free-preview-waiting.test.ts `
  server/phase96-free-preview-visibility-gate.test.ts `
  server/phase97-letter-lifecycle.test.ts `
  server/phase98-comprehensive-pipeline-paywall-attorney.test.ts `
  server/spaRoutes.test.ts `
  server/worker.test.ts `
  --maxWorkers=1 --no-file-parallelism
```

Expected: the same failures appear before edits.

---

### Task 2: Fix Static Test Drift That Cannot Affect Runtime

**Files:**
- Modify: `server/phase66-pdf-approval.test.ts`
- Modify: `server/spaRoutes.test.ts`
- Modify: `server/phase98-comprehensive-pipeline-paywall-attorney.test.ts`

- [ ] **Step 1: Fix Windows-safe file URL reads**

In `server/phase66-pdf-approval.test.ts`, import `fileURLToPath`:

```ts
import { fileURLToPath } from "url";
```

Replace each `.pathname` static read with `fileURLToPath(...)`:

```ts
const myLettersPath = fileURLToPath(
  new URL("../client/src/pages/subscriber/MyLetters.tsx", import.meta.url)
);
const source = fs.readFileSync(myLettersPath, "utf8");
```

Use the same pattern for:

```ts
fileURLToPath(
  new URL("../client/src/pages/subscriber/LetterDetail.tsx", import.meta.url)
);
fileURLToPath(
  new URL(
    "../client/src/components/subscriber/letter-detail/ApprovedLetterPanel.tsx",
    import.meta.url
  )
);
```

- [ ] **Step 2: Fix `llms.txt` link assertion**

In `server/spaRoutes.test.ts`, replace the case-sensitive display-text assertion:

```ts
expect(text).toContain(
  "[Demand letter](https://www.talk-to-my-lawyer.com/services/demand-letter)"
);
```

with a slug-focused assertion:

```ts
expect(text).toContain(
  "https://www.talk-to-my-lawyer.com/services/demand-letter"
);
```

- [ ] **Step 3: Remove inactive legacy state assertion**

In `server/phase98-comprehensive-pipeline-paywall-attorney.test.ts`, replace:

```ts
expect(ALLOWED_TRANSITIONS.letter_released_to_subscriber).toContain("pending_review");
expect(ALLOWED_TRANSITIONS.upsell_dismissed).toContain("pending_review");
```

with:

```ts
expect(ALLOWED_TRANSITIONS.letter_released_to_subscriber).toContain("pending_review");
expect(ALLOWED_TRANSITIONS.upsell_dismissed).toBeUndefined();
```

This matches `shared/types/letter.ts`, where `upsell_dismissed` is explicitly pgEnum-only legacy.

- [ ] **Step 4: Run focused tests**

```powershell
pnpm exec vitest run `
  server/phase66-pdf-approval.test.ts `
  server/spaRoutes.test.ts `
  server/phase98-comprehensive-pipeline-paywall-attorney.test.ts `
  --maxWorkers=1 --no-file-parallelism
```

Expected: these three files pass.

- [ ] **Step 5: Commit**

```powershell
git add server/phase66-pdf-approval.test.ts server/spaRoutes.test.ts server/phase98-comprehensive-pipeline-paywall-attorney.test.ts
git commit -m "test: refresh static assertions for current repo"
```

---

### Task 3: Align Free-Preview Tests With Draft-Preview Gate

**Files:**
- Modify: `server/free-preview-delay-ux.test.ts`
- Modify: `server/phase95-free-preview-waiting.test.ts`
- Modify: `server/phase96-free-preview-visibility-gate.test.ts`

- [ ] **Step 1: Rename helper expectations in Phase 95**

In `server/phase95-free-preview-waiting.test.ts`, replace static expectations for:

```ts
isFreePreviewUnlocked
shared/utils/free-preview
freePreviewUnlocked
```

with the current names:

```ts
isDraftPreviewUnlocked
shared/utils/draft-preview
draftPreviewUnlocked
```

Where the test asserts the exported alias, keep this explicit assertion:

```ts
expect(source).toContain("export const applyFreePreviewGate = applyDraftPreviewGate");
```

- [ ] **Step 2: Update waiting metadata expectations**

In `server/phase95-free-preview-waiting.test.ts`, use the current server shape:

```ts
expect(source).toMatch(/draftPreviewWaiting:\s*true as const/);
expect(source).toMatch(/freePreviewWaiting:\s*letter\.isFreePreview === true/);
```

The test should still verify that the gate runs before paywall truncation:

```ts
const gateIndex = source.indexOf("applyDraftPreviewGate");
const truncateIndex = source.indexOf("PAYWALL_PREVIEW_CHARS");
expect(gateIndex).toBeGreaterThanOrEqual(0);
expect(truncateIndex).toBeGreaterThan(gateIndex);
```

- [ ] **Step 3: Update LetterDetail static assertions**

In `server/free-preview-delay-ux.test.ts` and `server/phase95-free-preview-waiting.test.ts`, replace assertions that require a free-preview-only unlock branch with assertions for server-provided draft preview state:

```ts
expect(source).toContain("draftPreviewWaiting");
expect(source).toContain("freePreviewWaiting");
expect(source).toContain("displayStatus");
```

Keep the UI guard assertion focused on content:

```ts
expect(source).toMatch(/aiDraftVersion[\s\S]*content/);
```

- [ ] **Step 4: Align missing timestamp semantics in Phase 96**

In `server/phase96-free-preview-visibility-gate.test.ts`, update missing timestamp expectations to current helper behavior:

```ts
expect(
  isDraftPreviewUnlocked({
    isFreeTrialPreview: true,
    draftVisibleAt: null,
  })
).toBe(true);

expect(
  getDraftPreviewRemainingSeconds({
    isFreeTrialPreview: true,
    draftVisibleAt: null,
  })
).toBe(0);
```

Keep invalid timestamp expectations strict:

```ts
expect(
  isDraftPreviewUnlocked({
    isFreeTrialPreview: true,
    draftVisibleAt: "not-a-date",
  })
).toBe(false);

expect(
  getDraftPreviewRemainingSeconds({
    isFreeTrialPreview: true,
    draftVisibleAt: "not-a-date",
  })
).toBe(DEFAULT_DRAFT_PREVIEW_WINDOW_SECONDS);
```

- [ ] **Step 5: Run focused tests**

```powershell
pnpm exec vitest run `
  server/free-preview-delay-ux.test.ts `
  server/phase95-free-preview-waiting.test.ts `
  server/phase96-free-preview-visibility-gate.test.ts `
  --maxWorkers=1 --no-file-parallelism
```

Expected: the draft-preview test group passes.

- [ ] **Step 6: Commit**

```powershell
git add server/free-preview-delay-ux.test.ts server/phase95-free-preview-waiting.test.ts server/phase96-free-preview-visibility-gate.test.ts
git commit -m "test: align preview gate assertions with draft visibility"
```

---

### Task 4: Fix Free-Preview Email Test Mocks

**Files:**
- Modify: `server/free-preview-atomicity.test.ts`
- Modify: `server/phase91-admin-force-free-preview.test.ts`

- [ ] **Step 1: Return the stamped row from the atomicity mock**

In `server/free-preview-atomicity.test.ts`, update the mock claim function so the returned row includes the new timestamp:

```ts
this.letterRow.freePreviewEmailSentAt = now;
this.letterRow.updatedAt = now;
const claimed = { ...this.letterRow };
return [claimed];
```

This order matters: stamp first, clone second.

- [ ] **Step 2: Add a Drizzle-like select mock for notification idempotency**

In `server/phase91-admin-force-free-preview.test.ts`, extend the mocked `getDb()` return value with `select()`:

```ts
select: v.fn().mockImplementation((_shape?: any) => ({
  from: v.fn().mockImplementation((_table: any) => ({
    where: v.fn().mockImplementation(() => ({
      limit: v.fn().mockImplementation(async () => {
        if (_shape?.id) return [];
        return state.mockClaimReturns;
      }),
    })),
  })),
})),
```

The first `select()` without a shape returns the claimed letter; the shaped `select({ id })` returns no existing notification.

- [ ] **Step 3: Run focused tests**

```powershell
pnpm exec vitest run `
  server/free-preview-atomicity.test.ts `
  server/phase91-admin-force-free-preview.test.ts `
  --maxWorkers=1 --no-file-parallelism
```

Expected: both free-preview email mock tests pass.

- [ ] **Step 4: Commit**

```powershell
git add server/free-preview-atomicity.test.ts server/phase91-admin-force-free-preview.test.ts
git commit -m "test: repair free preview email mocks"
```

---

### Task 5: Fix n8n Callback Status Expectations

**Files:**
- Modify: `server/phase74-pipeline-sync.test.ts`

- [ ] **Step 1: Make the aligned 4-stage test explicitly preview-gated**

Before the aligned callback invocation, set the mock letter to include an unlock timestamp:

```ts
mockGetLetterRequestById.mockResolvedValueOnce({
  id: 42,
  status: "drafting",
  freePreviewUnlockAt: new Date(Date.now() + 86_400_000),
  submittedByAdmin: false,
});
```

Keep the aligned expectation:

```ts
expect(statusCalls[1]).toEqual([42, "ai_generation_completed_hidden", undefined]);
```

- [ ] **Step 2: Make the legacy null-intake expectation match current code**

For the legacy test that intentionally does this:

```ts
mockGetLetterRequestById.mockResolvedValueOnce(null);
```

replace the final status expectation with:

```ts
expect(statusCalls[1]).toEqual([99, "generated_locked", undefined]);
```

- [ ] **Step 3: Run focused test**

```powershell
pnpm exec vitest run server/phase74-pipeline-sync.test.ts --maxWorkers=1 --no-file-parallelism
```

Expected: Phase 74 passes.

- [ ] **Step 4: Commit**

```powershell
git add server/phase74-pipeline-sync.test.ts
git commit -m "test: clarify n8n draft preview status cases"
```

---

### Task 6: Fix LangGraph Test Isolation Without Pipeline Edits

**Files:**
- Modify: `server/phase92-langgraph-pipeline.test.ts`

- [ ] **Step 1: Reuse one DB mock factory for both module ids**

Replace the existing `vi.mock("./db", () => { ... })` body with a named factory:

```ts
function createDbMock() {
  return {
    updateLetterStatus: vi.fn().mockImplementation(async (letterId: number, status: string) => {
      mocks.dbCalls.updateLetterStatus.push({ letterId, status });
    }),
    createWorkflowJob: vi.fn().mockImplementation(async (data: any) => {
      mocks.dbCalls.createWorkflowJob.push(data);
      return { insertId: 777 };
    }),
    updateWorkflowJob: vi.fn().mockImplementation(async (id: number, data: any) => {
      mocks.dbCalls.updateWorkflowJob.push({ id, data });
    }),
    getActiveLessons: vi.fn().mockImplementation(async () => [
      {
        id: 1,
        lesson_text: "Always cite the most specific jurisdiction authority first.",
        letter_type: "demand",
        jurisdiction: "CA",
        pipeline_stage: "draft",
      },
    ]),
    getLetterRequestById: vi.fn().mockResolvedValue({
      id: 101,
      status: "drafting",
      currentAiDraftVersionId: null,
      freePreviewUnlockAt: new Date(Date.now() + 86_400_000),
      submittedByAdmin: false,
    }),
    hasLetterBeenPreviouslyUnlocked: vi.fn().mockResolvedValue(false),
    updateLetterVersionPointers: vi.fn().mockImplementation(async (letterId: number, data: any) => {
      mocks.dbCalls.updateLetterVersionPointers.push({ letterId, data });
    }),
    getDb: vi.fn().mockImplementation(async () => {
      const db: Record<string, any> = {
        insert: (_table: any) => ({
          values: (values: any) => ({
            returning: async () => {
              mocks.dbCalls.letterVersionsInserts.push(values);
              return [{ id: 5555 }];
            },
          }),
        }),
        update: (_table: any) => ({
          set: (values: any) => ({
            where: async () => {
              mocks.dbCalls.letterRequestsUpdates.push(values);
            },
          }),
        }),
        transaction: async (fn: (tx: unknown) => Promise<void>) => {
          await fn(db);
        },
      };
      return db;
    }),
  };
}

vi.mock("./db", () => createDbMock());
vi.mock("./db/index", () => createDbMock());
```

The second mock is needed because graph nodes import `../../../db`, which resolves to `server/db/index.ts`, not the sibling `server/db.ts` barrel.

- [ ] **Step 2: Update stale worker wiring assertion**

Replace:

```ts
expect(src).toContain("appGraph");
expect(src).toContain("streamEvents");
expect(src).toContain('process.env.LANGGRAPH_PIPELINE === "true"');
```

with:

```ts
expect(src).toContain("runLangGraphPipeline");
expect(src).toContain("parseLangGraphMode");
expect(src).toContain('process.env.LANGGRAPH_PIPELINE === "true"');
```

- [ ] **Step 3: Run focused test**

```powershell
pnpm exec vitest run server/phase92-langgraph-pipeline.test.ts --maxWorkers=1 --no-file-parallelism
```

Expected: no localhost Postgres connection attempts; Phase 92 passes.

- [ ] **Step 4: Commit**

```powershell
git add server/phase92-langgraph-pipeline.test.ts
git commit -m "test: isolate langgraph tests from local database"
```

---

### Task 7: Fix PDF Lifecycle Import-Time OpenAI Failure

**Files:**
- Modify: `server/phase97-letter-lifecycle.test.ts`

- [ ] **Step 1: Mock the simple pipeline before service imports**

Add this mock near the other module mocks:

```ts
vi.mock("./pipeline/simple", () => ({
  runSimplePipeline: vi.fn().mockResolvedValue({
    success: true,
    letter: "mock simple pipeline letter",
  }),
  runOpenAIDirectFallback: vi.fn().mockResolvedValue({
    success: true,
    letter: "mock fallback letter",
  }),
}));
```

This prevents `server/pipeline/simple.ts` from constructing an OpenAI client during PDF lifecycle tests.

- [ ] **Step 2: Run focused test**

```powershell
pnpm exec vitest run server/phase97-letter-lifecycle.test.ts --maxWorkers=1 --no-file-parallelism
```

Expected: Phase 97 reaches the PDF assertions. If new assertion failures appear, fix only the test mocks for the PDF/storage/email boundaries in this file.

- [ ] **Step 3: Commit**

```powershell
git add server/phase97-letter-lifecycle.test.ts
git commit -m "test: mock simple pipeline in pdf lifecycle tests"
```

---

### Task 8: Worker Refund Checkpoint

**Files:**
- Modify: `server/worker.ts`
- Modify: `server/worker.test.ts`

**Pipeline safety boundary:** This task does not edit `server/pipeline/**`, prompts, providers, orchestration, LangGraph nodes, status transitions, or draft generation. It only handles subscriber usage refund after the early new-user simple-bypass path already failed.

- [ ] **Step 1: Update the test to assert refund without requiring throw**

In `server/worker.test.ts`, rename the failing test:

```ts
it("refunds free trial slot when simple bypass fails and shouldRefundOnFailure=true", async () => {
```

Replace the rejection assertion:

```ts
await expect(processRunPipeline(data)).rejects.toThrow();
```

with:

```ts
await expect(processRunPipeline(data)).resolves.toBeUndefined();
```

Keep:

```ts
expect(refundFreeTrialSlot).toHaveBeenCalledWith(USER_ID);
expect(decrementLettersUsed).not.toHaveBeenCalled();
```

- [ ] **Step 2: Run the focused test to verify it fails for the right reason**

```powershell
pnpm exec vitest run server/worker.test.ts -t "refunds free trial slot when simple bypass fails" --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL because `refundFreeTrialSlot` is not called.

- [ ] **Step 3: Add refund in the existing simple-bypass failure branch**

In `server/worker.ts`, inside:

```ts
if (!simpleResult.success) {
```

after the failed `updatePipelineRecord(...)` call and before `updateLetterStatus(...)`, add:

```ts
if (userId && usageContext?.shouldRefundOnFailure) {
  try {
    if (usageContext.isFreeTrialSubmission) {
      await refundFreeTrialSlot(userId);
      logger.info(
        `[Worker] Refunded free trial slot for user #${userId} after simple pipeline failure on letter #${letterId}`
      );
    } else {
      await decrementLettersUsed(userId);
      logger.info(
        `[Worker] Refunded 1 letter usage for user #${userId} after simple pipeline failure on letter #${letterId}`
      );
    }
  } catch (refundErr) {
    logger.error(
      { err: refundErr },
      "[Worker] Failed to refund usage after simple pipeline failure:"
    );
    captureServerException(refundErr, {
      tags: {
        component: "pipeline-worker",
        error_type: "usage_refund_failed",
      },
    });
  }
}
```

Do not change `runSimplePipeline(...)`, retry logic, LangGraph routing, `runFullPipeline(...)`, or the final `return`.

- [ ] **Step 4: Run focused worker tests**

```powershell
pnpm exec vitest run server/worker.test.ts --maxWorkers=1 --no-file-parallelism
```

Expected: `server/worker.test.ts` passes.

- [ ] **Step 5: Commit**

```powershell
git add server/worker.ts server/worker.test.ts
git commit -m "fix(worker): refund usage after simple pipeline failure"
```

---

### Task 9: Full Verification

**Files:**
- No new file edits unless a focused failure identifies a test-only mock mismatch.

- [ ] **Step 1: Run type check**

```powershell
pnpm check
```

Expected: exit code 0.

- [ ] **Step 2: Run the full test suite serialized**

```powershell
pnpm exec vitest run --maxWorkers=1 --no-file-parallelism
```

Expected: exit code 0.

- [ ] **Step 3: Run package test command**

```powershell
pnpm test
```

Expected: exit code 0. If this hangs while the serialized command passes, capture the hanging file with the hanging-process reporter:

```powershell
pnpm exec vitest run --reporter=verbose --reporter=hanging-process
```

- [ ] **Step 4: Run build**

```powershell
pnpm build
```

Expected: exit code 0.

- [ ] **Step 5: Commit verification-only fixes if needed**

If verification exposed only test mock repairs, commit them:

```powershell
git add server
git commit -m "test: finish vitest repair pass"
```

If verification exposed a production code issue outside `server/worker.ts`, stop and report the exact file and failing assertion before editing.

---

### Task 10: Push and PR

**Files:**
- No file edits.

- [ ] **Step 1: Review final diff**

```powershell
git diff --stat main...HEAD
git diff main...HEAD -- server/worker.ts
```

Expected: only one production file appears, `server/worker.ts`, and only the simple-bypass refund block changed.

- [ ] **Step 2: Push branch**

```powershell
git push -u origin codex/fix-vitest-drift
```

- [ ] **Step 3: Open PR**

```powershell
gh pr create --draft --title "Fix Vitest drift and refund test coverage" --body "Repairs stale Vitest assertions and brittle mocks from the current suite. The only production change is a guarded usage refund in the worker simple-pipeline failure path; no letter-generation pipeline stages, prompts, providers, or orchestration files are changed."
```

Expected: draft PR URL is printed.

---

## Self-Review

- Spec coverage: all 41 failures are covered by Tasks 2-8, grouped by failing file.
- Placeholder scan: every task names exact files, commands, assertions, and expected outcomes.
- Type consistency: all helper names match current repo names: `isDraftPreviewUnlocked`, `applyDraftPreviewGate`, `resolveDraftPreviewFinalStatus`, and `runLangGraphPipeline`.
- Pipeline safety: no task edits `server/pipeline/**`; the only production edit is a refund side effect in `server/worker.ts` after `runSimplePipeline(...)` has already failed.
