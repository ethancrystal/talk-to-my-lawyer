import { describe, expect, it, vi } from "vitest";

vi.mock("./blog-retrieval", () => ({ retrieveBlogContext: vi.fn() }));

const { retrieveBlogContext } = await import("./blog-retrieval");
const { buildPrompt, buildSimplePrompt } = await import("./simple");
const mockRetrieve = vi.mocked(retrieveBlogContext);

const intake = {
  matter: { category: "Unpaid Invoice", subject: "Late payment", description: "Owes $5,000" },
  jurisdiction: { state: "California" },
} as any;

describe("buildPrompt", () => {
  it("includes the matter details", () => {
    const p = buildPrompt(intake);
    expect(p).toContain("Unpaid Invoice");
    expect(p).toContain("Owes $5,000");
  });

  it("injects blog context and its no-cite guardrail when provided", () => {
    const ctx =
      "----- BACKGROUND REFERENCE MATERIAL (internal context only) -----\n[Reference 1]\nfoo\n----- END BACKGROUND REFERENCE MATERIAL -----";
    const p = buildPrompt(intake, ctx);
    expect(p).toContain("[Reference 1]");
    expect(p).toContain("BACKGROUND REFERENCE MATERIAL");
  });

  it("adds no reference block when context is empty", () => {
    const p = buildPrompt(intake, "");
    expect(p).not.toContain("BACKGROUND REFERENCE MATERIAL");
  });
});

describe("buildSimplePrompt wiring", () => {
  it("feeds retrieved blog context into the prompt", async () => {
    const sentinel =
      "----- BACKGROUND REFERENCE MATERIAL (internal context only) -----\n[Reference 1]\nSENTINEL_CHUNK_42\n----- END BACKGROUND REFERENCE MATERIAL -----";
    mockRetrieve.mockResolvedValue(sentinel);
    const prompt = await buildSimplePrompt(intake);
    expect(prompt).toContain("SENTINEL_CHUNK_42");
  });

  it("produces a clean prompt (no reference block) when retrieval returns empty", async () => {
    mockRetrieve.mockResolvedValue("");
    const prompt = await buildSimplePrompt(intake);
    expect(prompt).not.toContain("BACKGROUND REFERENCE MATERIAL");
  });

  it("does not throw if retrieval rejects (non-fatal)", async () => {
    mockRetrieve.mockRejectedValue(new Error("db down"));
    await expect(buildSimplePrompt(intake)).resolves.toContain("Unpaid Invoice");
  });
});
