/**
 * Phase 95 — Free-preview waiting screen (pre-unlock content gate)
 *
 * Rewritten alongside the phase-96 consolidation: the 24-hour cooling window
 * is now a SINGLE server-side visibility gate driven by
 * `isFreePreviewUnlocked(letter)` in `shared/utils/free-preview.ts`. All
 * server-side content fetch sites (version DAL, versions.get, draftPdfRoute)
 * call the helper. The frontend renders from the server's `freePreview` flag
 * on the ai_draft version — no client-side clocks.
 *
 * This suite pins down:
 *   1. server/db/letter-versions.ts — pre-unlock free-preview returns empty
 *      content + freePreviewWaiting:true; post-unlock returns full draft +
 *      freePreview:true. Uses the shared helper.
 *   2. server/routers/versions.ts — single-version `get` mirrors the gate.
 *   3. server/draftPdfRoute.ts — blocks pre-review free-preview PDF downloads.
 *   4. server/routers/letters/subscriber.ts — passes the letter object down
 *      to the DAL (no local timestamp math).
 *   5. client/src/pages/subscriber/LetterDetail.tsx — renders branches from
 *      `aiDraftVersion.freePreview` server flag, not statuses.
 *   6. client/src/components/LetterPaywall.tsx — defensive __isFreePreview
 *      guard.
 *   7. client/src/components/FreePreviewWaiting.tsx — exists with the
 *      required data-testid and no payment CTA. No countdown (the waiting
 *      state is driven by the server flag, not client clocks).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");
const SERVER = join(ROOT, "server");
const CLIENT = join(ROOT, "client", "src");

function readServer(...parts: string[]): string {
  return readFileSync(join(SERVER, ...parts), "utf-8");
}
function readClient(...parts: string[]): string {
  return readFileSync(join(CLIENT, ...parts), "utf-8");
}

// ─── 1. letter-versions DAL — helper-driven gate ──────────────────────────

describe("Phase 95 — getLetterVersionsByRequestId: pre-unlock content gate", () => {
  const source = readServer("db", "letter-versions.ts");

  it("imports the shared isDraftPreviewUnlocked helper", () => {
    // Renamed from isFreePreviewUnlocked/free-preview during the
    // draft-preview consolidation (the 24h gate now applies to paid
    // subscribers too, not just the free-trial lead magnet).
    expect(source).toMatch(
      /import\s*\{\s*isDraftPreviewUnlocked\s*\}\s*from\s*"[^"]*shared\/utils\/draft-preview"/
    );
  });

  it("accepts the letter object as a parameter (no separate unlock booleans)", () => {
    expect(source).toMatch(
      /getLetterVersionsByRequestId\([\s\S]*?letter\?:\s*\{[\s\S]*?isFreePreview\?[\s\S]*?freePreviewUnlockAt\?[\s\S]*?\}[\s\S]*?\)/
    );
  });

  it("decides draftPreviewUnlocked via the shared helper", () => {
    expect(source).toMatch(/isDraftPreviewUnlocked\(/);
  });

  it("returns empty content + draftPreviewWaiting:true (and back-compat freePreviewWaiting) pre-unlock", () => {
    expect(source).toMatch(
      /content:\s*""[\s\S]*?draftPreviewWaiting:\s*true\s*as\s*const/
    );
    // Back-compat flag for free-trial consumers of the old field name.
    expect(source).toMatch(
      /freePreviewWaiting:\s*isFreePreview\s*\?\s*\(true as const\)\s*:\s*undefined/
    );
  });

  it("returns full draft + draftPreview:true (and back-compat freePreview) when unlocked", () => {
    expect(source).toMatch(
      /draftPreviewUnlocked[\s\S]*?draftPreview:\s*true\s*as\s*const/
    );
    expect(source).toMatch(
      /freePreview:\s*isFreePreview\s*\?\s*\(true as const\)\s*:\s*undefined/
    );
  });

  it("preserves the standard 20% truncation fallback for non-free-preview", () => {
    expect(source).toMatch(/truncateContent\(v\.content\)/);
  });

  it("orders the branches so the draft-preview gate runs BEFORE truncation", () => {
    const idxDraftPreview = source.indexOf("draftPreviewWaiting: true as const");
    const idxTruncate = source.indexOf("truncateContent(v.content)");
    expect(idxDraftPreview).toBeGreaterThan(0);
    expect(idxTruncate).toBeGreaterThan(0);
    expect(idxDraftPreview).toBeLessThan(idxTruncate);
  });
});

// ─── 2. subscriber router — passes letter object down ─────────────────────

describe("Phase 95 — subscriber.detail passes the letter object to the DAL", () => {
  const source = readServer("routers", "letters", "subscriber.ts");

  it("calls getLetterVersionsByRequestId(input.id, false, letter.status, letter)", () => {
    expect(source).toMatch(
      /getLetterVersionsByRequestId\(\s*input\.id,\s*false,\s*letter\.status,\s*letter\s*\)/
    );
  });

  it("does NOT inline freePreviewUnlockAt timestamp math in this router", () => {
    expect(source).not.toMatch(/freePreviewUnlockAt.*getTime\(\)/);
  });
});

// ─── 3. versions.get — delegates to the shared DAL helper ─────────────────

describe("Phase 95 — versions.get delegates to applyFreePreviewGate", () => {
  const source = readServer("routers", "versions.ts");

  it("imports applyFreePreviewGate and LOCKED_PREVIEW_STATUSES from the DAL", () => {
    expect(source).toMatch(
      /import\s*\{[\s\S]*?applyFreePreviewGate[\s\S]*?LOCKED_PREVIEW_STATUSES[\s\S]*?\}\s*from\s*"\.\.\/db\/letter-versions"/
    );
  });

  it("calls applyFreePreviewGate on a single-version array", () => {
    expect(source).toMatch(
      /applyFreePreviewGate\(\s*\[\s*version as any\s*\],\s*letter\.status,\s*letter\s*\)/
    );
  });

  it("admits subscriber ai_draft access when draft-gated OR locked (ownership first)", () => {
    // Access guard: ownership + (isDraftVisibilityGated || isLocked). The
    // draft-visibility gate (freePreviewUnlockAt set) now covers BOTH the
    // free-trial path and paid subscribers, so the guard keys on the gate
    // timestamp rather than isFreePreview. Without that branch, a
    // post-payment gated letter would get FORBIDDEN for its own ai_draft.
    expect(source).toMatch(/Boolean\(letter\?\.freePreviewUnlockAt\)/);
    expect(source).toMatch(/LOCKED_PREVIEW_STATUSES\.has\(letter\.status\)/);
    expect(source).toMatch(
      /letter\.userId\s*===\s*ctx\.user\.id\s*&&\s*\(isDraftVisibilityGated\s*\|\|\s*isLocked\)/
    );
  });

  it("does NOT inline timestamp math or truncation logic (consolidated into DAL)", () => {
    expect(source).not.toMatch(/freePreviewUnlockAt\.getTime\(\)/);
    expect(source).not.toMatch(/Math\.floor\(lines\.length\s*\*\s*0\.2\)/);
  });
});

// ─── 3b. DAL exports the status set used by callers ───────────────────────

describe("Phase 95 — DAL exports LOCKED_PREVIEW_STATUSES as a module const", () => {
  const source = readServer("db", "letter-versions.ts");

  it("LOCKED_PREVIEW_STATUSES is a module-scope export", () => {
    expect(source).toMatch(
      /export const LOCKED_PREVIEW_STATUSES\s*=\s*new Set\(\[/
    );
  });

  it("covers all four pre-review locked statuses", () => {
    const match = source.match(
      /LOCKED_PREVIEW_STATUSES\s*=\s*new Set\(\[([\s\S]*?)\]\)/
    );
    expect(match).toBeTruthy();
    const list = match![1];
    expect(list).toContain('"generated_locked"');
    expect(list).toContain('"ai_generation_completed_hidden"');
    expect(list).toContain('"letter_released_to_subscriber"');
    expect(list).toContain('"attorney_review_upsell_shown"');
  });
});

// ─── 4. draftPdfRoute — free-preview PDF gate + helper defense ────────────

describe("Phase 95 — draftPdfRoute blocks free-preview PDF pre-review", () => {
  const source = readServer("draftPdfRoute.ts");

  it("declares the pre-review free-preview status allow-list", () => {
    expect(source).toMatch(
      /const\s+FREE_PREVIEW_PDF_ALLOWED_STATUSES\s*=\s*new\s+Set(?:<[^>]+>)?\s*\(/
    );
    expect(source).toContain("LETTER_STATUS.pending_review");
    expect(source).toContain("LETTER_STATUS.under_review");
    expect(source).toContain("LETTER_STATUS.approved");
  });

  it("blocks free-preview PDFs before attorney-review statuses", () => {
    expect(source).toMatch(
      /letter\.isFreePreview\s*===\s*true[\s\S]*?!FREE_PREVIEW_PDF_ALLOWED_STATUSES\.has\(letter\.status\)[\s\S]*?res\.status\(403\)/
    );
  });

  it("uses isFreePreviewUnlocked helper as defense-in-depth", () => {
    expect(source).toMatch(
      /import\s*\{\s*isFreePreviewUnlocked\s*\}\s*from\s*"\.\.\/shared\/utils\/free-preview"/
    );
    expect(source).toMatch(
      /letter\.isFreePreview\s*===\s*true\s*&&\s*!isFreePreviewUnlocked\(letter\)/
    );
    expect(source).toContain("Free preview is not yet available");
  });

  it("places free-preview gates AFTER status allow-list and BEFORE version fetch", () => {
    const idxStatusGate = source.indexOf("Draft PDF is only available after");
    const idxFreePreview = source.indexOf(
      "Draft PDF is available after attorney review submission."
    );
    const idxVersionFetch = source.indexOf(
      "getLetterVersionsByRequestId(letterId)"
    );
    expect(idxStatusGate).toBeGreaterThan(0);
    expect(idxFreePreview).toBeGreaterThan(0);
    expect(idxVersionFetch).toBeGreaterThan(0);
    expect(idxStatusGate).toBeLessThan(idxFreePreview);
    expect(idxFreePreview).toBeLessThan(idxVersionFetch);
  });
});

// ─── 5. LetterDetail — server-flag driven branching ───────────────────────

describe("Phase 95 — LetterDetail renders from the server freePreview flag", () => {
  const source = readClient("pages", "subscriber", "LetterDetail.tsx");

  it("imports the DraftPreviewWaiting component", () => {
    // Renamed from FreePreviewWaiting during the draft-preview consolidation
    // (waiting state now covers paid subscribers too, not just free trials).
    expect(source).toMatch(
      /import\s*\{\s*DraftPreviewWaiting\s*\}\s*from\s*"@\/components\/DraftPreviewWaiting"/
    );
  });

  it("derives draftPreviewUnlocked from the server flags + content, and freePreviewUnlocked on top", () => {
    expect(source).toMatch(
      /const\s+draftPreviewUnlocked\s*=[\s\S]*?aiDraftVersion as any\)\?\.draftPreview\s*===\s*true[\s\S]*?aiDraftVersion as any\)\?\.freePreview\s*===\s*true[\s\S]*?Boolean\(aiDraftVersion\?\.content\)/
    );
    expect(source).toMatch(
      /const\s+freePreviewUnlocked\s*=\s*letter\.isFreePreview\s*===\s*true\s*&&\s*draftPreviewUnlocked/
    );
    expect(source).toMatch(
      /<DraftPreviewWaiting[\s\S]*?subject=\{letter\.subject\}/
    );
  });

  it("renders DraftPreviewWaiting without unlockAt prop", () => {
    const waitingCall = source.match(/<DraftPreviewWaiting[\s\S]*?\/>/);
    expect(waitingCall).toBeTruthy();
    expect(waitingCall![0]).toMatch(/subject=\{letter\.subject\}/);
    expect(waitingCall![0]).not.toMatch(/unlockAt=/);
  });

  it("forwards __isFreePreview to LetterPaywall as a defensive guard", () => {
    expect(source).toMatch(
      /isGeneratedLocked\s*\?\s*\([\s\S]*?<LetterPaywall[\s\S]*?__isFreePreview=\{!!letter\.isFreePreview\}/
    );
  });

  it("popup effect requires draftPreviewUnlocked AND content before opening", () => {
    expect(source).toMatch(/if\s*\(!draftPreviewUnlocked\)\s*return/);
  });
});

// ─── 6. LetterPaywall — defensive guard returns null for free-preview ─────

describe("Phase 95 — LetterPaywall defensive __isFreePreview guard", () => {
  const source = readClient("components", "LetterPaywall.tsx");

  it("declares the __isFreePreview prop", () => {
    expect(source).toMatch(/__isFreePreview\?:\s*boolean/);
  });

  it("returns null when __isFreePreview is truthy", () => {
    expect(source).toMatch(/if\s*\(__isFreePreview\)\s*return\s*null/);
  });
});

// ─── 7. FreePreviewWaiting — component shape ──────────────────────────────

describe("Phase 95 — FreePreviewWaiting component", () => {
  const path = join(CLIENT, "components", "FreePreviewWaiting.tsx");

  it("file exists at client/src/components/FreePreviewWaiting.tsx", () => {
    expect(existsSync(path)).toBe(true);
  });

  const source = readClient("components", "FreePreviewWaiting.tsx");

  it("exports a named function FreePreviewWaiting", () => {
    expect(source).toMatch(/export function FreePreviewWaiting\s*\(/);
  });

  it("accepts subject prop", () => {
    expect(source).toMatch(/subject:\s*string/);
    expect(source).not.toMatch(/unlockAt:/);
  });

  it('uses data-testid="free-preview-waiting"', () => {
    expect(source).toMatch(/data-testid="free-preview-waiting"/);
  });

  it("does not include countdown logic", () => {
    expect(source).not.toMatch(/hoursRemaining/);
    expect(source).not.toMatch(/~\{hoursRemaining\}h/);
  });

  it("contains NO payment / CTA buttons (no Button import, no /pricing navigation)", () => {
    expect(source).not.toMatch(/from\s*"@\/components\/ui\/button"/);
    expect(source).not.toMatch(/\/pricing/);
    expect(source).not.toMatch(/checkout|stripe|payFirstLetterReview/i);
  });
});
