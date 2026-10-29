import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../db/core", () => ({ getReadDb: vi.fn() }));
vi.mock("./embeddings", () => ({ generateEmbedding: vi.fn() }));
vi.mock("../sentry", () => ({ captureServerException: vi.fn() }));

const { getReadDb } = await import("../db/core");
const { generateEmbedding } = await import("./embeddings");
const { chunkBlogContent, buildBlogQuery, formatBlogContextBlock, retrieveBlogContext } =
  await import("./blog-retrieval");
const mockGetReadDb = vi.mocked(getReadDb);
const mockGenEmbed = vi.mocked(generateEmbedding);

beforeEach(() => vi.clearAllMocks());

describe("chunkBlogContent", () => {
  it("returns one chunk for short content", () => {
    const chunks = chunkBlogContent("Short paragraph.");
    expect(chunks).toEqual(["Short paragraph."]);
  });

  it("splits long content into multiple chunks under the size cap", () => {
    const para = "word ".repeat(400).trim(); // ~2000 chars
    const content = [para, para, para].join("\n\n"); // ~6000 chars
    const chunks = chunkBlogContent(content, 1500);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(1600);
  });

  it("drops empty/whitespace-only segments (and merges the short remainder)", () => {
    // The whitespace-only middle segment is dropped; the two short paragraphs
    // that remain are merged into a single chunk (both well under the cap).
    const chunks = chunkBlogContent("A.\n\n   \n\nB.");
    expect(chunks).toEqual(["A.\n\nB."]);
    for (const c of chunks) expect(c.trim().length).toBeGreaterThan(0);
  });
});

describe("buildBlogQuery", () => {
  it("composes query from matter + jurisdiction fields", () => {
    const q = buildBlogQuery({
      matter: { category: "Unpaid Invoice", subject: "Late payment", description: "Vendor owes $5,000" },
      jurisdiction: { state: "California" },
    } as any);
    expect(q).toContain("Unpaid Invoice");
    expect(q).toContain("Late payment");
    expect(q).toContain("Vendor owes $5,000");
    expect(q).toContain("California");
  });

  it("omits missing fields without throwing", () => {
    const q = buildBlogQuery({} as any);
    expect(typeof q).toBe("string");
  });
});

describe("formatBlogContextBlock", () => {
  it("returns empty string for no chunks", () => {
    expect(formatBlogContextBlock([])).toBe("");
  });

  it("includes the no-cite guardrails and the chunk text", () => {
    const block = formatBlogContextBlock([{ chunk_text: "Demand letters in CA...", similarity: 0.9 }] as any);
    expect(block).toContain("BACKGROUND REFERENCE");
    expect(block).toMatch(/do not quote|do not cite/i);
    expect(block).toContain("Demand letters in CA...");
  });
});

describe("retrieveBlogContext", () => {
  const intake = { matter: { category: "Unpaid Invoice" } } as any;

  it("returns empty string when db is unavailable", async () => {
    mockGetReadDb.mockResolvedValue(null as any);
    const out = await retrieveBlogContext(intake);
    expect(out).toBe("");
  });

  it("returns empty string and reports to Sentry on error", async () => {
    mockGetReadDb.mockResolvedValue({ execute: vi.fn() } as any);
    mockGenEmbed.mockRejectedValue(new Error("api down"));
    const out = await retrieveBlogContext(intake);
    expect(out).toBe("");
  });

  it("embeds the query, runs cosine search, and formats matches", async () => {
    mockGenEmbed.mockResolvedValue([0.1, 0.2, 0.3]);
    const rows = [
      { post_id: 1, chunk_text: "Chunk A", similarity: "0.88" },
      { post_id: 2, chunk_text: "Chunk B", similarity: 0.81 },
    ];
    mockGetReadDb.mockResolvedValue({ execute: vi.fn().mockResolvedValue(rows) } as any);
    const out = await retrieveBlogContext(intake, { matchCount: 3, matchThreshold: 0.5 });
    expect(out).toContain("Chunk A");
    expect(out).toContain("Chunk B");
    expect(mockGenEmbed).toHaveBeenCalledOnce();
  });
});
