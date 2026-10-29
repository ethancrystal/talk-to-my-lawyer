# Blog RAG for the Simple Letter Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vectorize TTML's published blog posts into Supabase pgvector and make the `PIPELINE_MODE=simple` letter path retrieve the most relevant blog passages and inject them into the Claude prompt as **background framing only** (never quoted or cited).

**Architecture:** A new `blog_post_chunks` table stores per-passage 1536-dim embeddings (OpenAI `text-embedding-3-small`, same vector space as `letter_versions`/`pipeline_lessons`). A backfill script chunks every *published* `blog_posts` row and stores embeddings. A new testable module `server/pipeline/blog-retrieval.ts` embeds an intake-derived query, runs a pgvector cosine search, and formats the top matches into a strictly-worded "background reference" block. `server/pipeline/simple.ts` injects that block into its prompt before calling Claude; retrieval failures are non-fatal (empty context).

**Tech Stack:** TypeScript, Drizzle ORM + drizzle-kit, Supabase Postgres + pgvector 0.8.0 (`vector`, `<=>` cosine operator, HNSW), Anthropic SDK, OpenAI Embeddings API, Vitest.

---

## Context the executor needs (read before starting)

- **Repo:** `/home/moizjmj/ttml-app/ttml-app` (this is a *different* git repo from the agent's default cwd). Do all work here. Create a feature branch: `git checkout -b feat/blog-rag-simple-pipeline`.
- **Embeddings already exist:** `server/pipeline/embeddings.ts` exports `generateEmbedding(text): Promise<number[]>` (OpenAI `text-embedding-3-small`, 1536-dim, truncates input to 8000 chars). **Reuse it — do not write a new embedder.**
- **Vector column helper:** `drizzle/schema/constants.ts` exports a `vector` customType that renders as `vector(1536)`. Mirror `pipelineLessons.embedding: vector("embedding")` in `drizzle/schema/pipeline.ts`.
- **Existing retrieval reference:** `findSimilarLettersViaPgvector` in `embeddings.ts` (lines ~140-160) shows the cosine-search shape. We will write an **inline** cosine query (no DB function) for blog chunks.
- **Backfill reference:** `scripts/backfill-embeddings.ts` is the exact pattern to mirror (batching, rate-limit sleep, `getDb()`, `process.exit`).
- **Test reference:** `server/pipeline/embeddings.test.ts` shows the mocking style (`vi.mock("../db/core")`, mock `fetch`, mock `getDb`).
- **`blog_posts` columns:** `id (int)`, `slug`, `title`, `excerpt`, `content (text)`, `category`, `status (varchar, 'published'|'draft')`, `published_at`, … (138 rows; **131 published**, 6 draft).
- **`IntakeJson` fields used by the prompt:** `matter?.subject`, `matter?.category`, `matter?.description`, `jurisdiction?.state`, `jurisdiction?.country` (see `buildPrompt` in `simple.ts`).
- **Commands:** `pnpm test` (= `vitest run`), `pnpm vitest run <file>` for one file, `pnpm check` (= `tsc --noEmit`).
- **Migrations:** SQL files in `drizzle/`, tracked in `drizzle/meta/_journal.json` (currently 54 entries, last tag `0053_rls_on_drizzle_migrations`). Generate with `pnpm drizzle-kit generate`, apply with `pnpm drizzle-kit migrate`. `drizzle.config.ts` reads `SUPABASE_DATABASE_URL` or `DATABASE_URL` and rewrites pooler port `:6543`→`:5432`.

## Preconditions (verify FIRST — Task 0)

The goal's stop-and-ask conditions are checked here before any build.

## File Structure

- **Create** `drizzle/00NN_blog_post_chunks.sql` + journal/snapshot entry (via drizzle-kit) — table + indexes.
- **Modify** `drizzle/schema/content.ts` — add `blogPostChunks` table + `BlogPostChunk`/`InsertBlogPostChunk` types.
- **Create** `server/pipeline/blog-retrieval.ts` — chunking, query building, cosine retrieval, context formatting.
- **Create** `server/pipeline/blog-retrieval.test.ts` — unit tests for the above.
- **Modify** `server/pipeline/simple.ts` — export `buildPrompt`, accept `blogContext`, call `retrieveBlogContext`.
- **Create** `server/pipeline/simple.test.ts` — prompt-injection assertions.
- **Create** `scripts/backfill-blog-embeddings.ts` — one-time chunk + embed backfill.

---

## Task 0: Preconditions check

**Files:** none (verification only)

- [ ] **Step 1: Confirm `OPENAI_API_KEY` and a DB URL are available**

Run:
```bash
cd /home/moizjmj/ttml-app/ttml-app
node -e "console.log('OPENAI_API_KEY:', !!process.env.OPENAI_API_KEY); console.log('DB URL:', !!(process.env.SUPABASE_DIRECT_URL||process.env.SUPABASE_DATABASE_URL||process.env.DATABASE_URL))" || true
[ -f .env ] && grep -qE '^OPENAI_API_KEY=' .env && echo ".env has OPENAI_API_KEY" || echo "check .env / shell env"
```
Expected: a truthy value for both, OR a key present in `.env`. **If `OPENAI_API_KEY` is missing → STOP and ask the user** (per goal stop-condition: cannot backfill without it). The unit tests/code can still be written, but the backfill (Task 6) and acceptance check (Task 8) will block.

- [ ] **Step 2: Confirm published count (verification baseline)**

Run via Supabase TTML MCP `execute_sql`:
```sql
SELECT count(*) FROM blog_posts WHERE status = 'published';
```
Expected: `131`. Record this number — it is the coverage target in Task 8. If it differs, use the returned value as the target.

---

## Task 1: Add `blog_post_chunks` to the Drizzle schema

**Files:**
- Modify: `drizzle/schema/content.ts`

- [ ] **Step 1: Read the current file head to match imports/style**

Run: `sed -n '1,40p' drizzle/schema/content.ts`
Expected: see `pgTable`, column helpers, and `blogPosts` definition; note the `vector` import path used elsewhere (`./constants`).

Also confirm the aggregator re-exports this module so drizzle-kit will see the new table:
Run: `grep -n "content" drizzle/schema.ts`
Expected: a re-export of `./schema/content` (e.g. `export * from "./schema/content"`). **If it uses named re-exports rather than `export *`, add `blogPostChunks`, `BlogPostChunk`, `InsertBlogPostChunk` to that named list** — otherwise `drizzle-kit generate` (Task 2) will not detect the table.

- [ ] **Step 2: Add the table definition**

Add (after the `blogPosts` definition, keeping imports tidy — ensure `integer`, `text`, `timestamp`, `index` are imported from `drizzle-orm/pg-core`, and `vector` from `./constants`):

```ts
export const blogPostChunks = pgTable(
  "blog_post_chunks",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    chunkText: text("chunk_text").notNull(),
    embedding: vector("embedding"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    postIdIdx: index("idx_blog_post_chunks_post_id").on(t.postId),
  }),
);

export type BlogPostChunk = typeof blogPostChunks.$inferSelect;
export type InsertBlogPostChunk = typeof blogPostChunks.$inferInsert;
```

> Note: the HNSW vector index is added in the migration SQL (Task 2), not here, to avoid drizzle-kit vector-index quirks.

- [ ] **Step 3: Verify it typechecks**

Run: `pnpm check`
Expected: PASS (no new errors). If `serial`/`index` are not imported in this file, add them to the existing import from `drizzle-orm/pg-core`.

- [ ] **Step 4: Commit**

```bash
git add drizzle/schema/content.ts
git commit -m "feat(schema): add blog_post_chunks table for blog RAG"
```

---

## Task 2: Generate + finalize the migration

**Files:**
- Create: `drizzle/00NN_*.sql` (drizzle-kit picks the number), `drizzle/meta/_journal.json` + snapshot update

- [ ] **Step 1: Generate the migration from the schema diff**

Run: `pnpm drizzle-kit generate --name blog_post_chunks`
Expected: a new `drizzle/00NN_blog_post_chunks.sql` containing `CREATE TABLE "blog_post_chunks"` (with `embedding vector(1536)`, FK to `blog_posts`, and the `idx_blog_post_chunks_post_id` index), plus updated `_journal.json`/snapshot.

- [ ] **Step 2: Make the table creation idempotent + append the HNSW cosine index**

This DB is deployed via a **custom** `server/migrate.ts` (`dist/migrate.js`) on every release. drizzle-kit's generated `CREATE TABLE` has no `IF NOT EXISTS`, so if the table is ever applied out-of-band (the MCP fallback below), the next deploy re-runs the SQL and dies on "relation already exists." Guard against it:

1. Edit the generated `CREATE TABLE "blog_post_chunks"` → `CREATE TABLE IF NOT EXISTS "blog_post_chunks"`.
2. Append at the end (after a `--> statement-breakpoint`):

```sql
CREATE INDEX IF NOT EXISTS "idx_blog_post_chunks_embedding" ON "blog_post_chunks" USING hnsw ("embedding" vector_cosine_ops);
```

> At ~a few hundred chunks the index is not strictly required for speed, but it matches the goal and keeps retrieval fast as the blog grows.

- [ ] **Step 3: Decide RLS for the new table**

Every table in this DB has `rls_enabled: true`, and the repo enforces RLS discipline (`scripts/check-rls.ts`, a dedicated RLS migration, the `ttml-database-rls-security` skill). A new table with RLS disabled will be flagged by `get_advisors` and may block deployment-readiness. The server connects via direct Postgres (bypasses RLS), so runtime is unaffected either way. **Default decision (recommended): enable RLS, no public policy** (chunks are internal derived data; only the service-role/direct connection reads them). Append to the migration SQL:

```sql
ALTER TABLE "blog_post_chunks" ENABLE ROW LEVEL SECURITY;
```

(If product later needs client-side reads of chunks, add a `SELECT` policy then. Confirm this default with the team if unsure — do not silently leave RLS off.)

- [ ] **Step 4: Apply the migration (prefer the drizzle-recorded path)**

Run (uses the direct 5432 connection per drizzle.config):
```bash
SUPABASE_DATABASE_URL="${SUPABASE_DIRECT_URL:-$SUPABASE_DATABASE_URL}" pnpm drizzle-kit migrate
```
Expected: migration applies cleanly **and is recorded in `__drizzle_migrations`** (so the deploy-time `dist/migrate.js` skips it). Only if `drizzle-kit migrate` errors on the pooler (`CREATE SCHEMA public`) fall back to the Supabase TTML MCP `apply_migration` tool (name: `blog_post_chunks`, query: the full generated SQL) — the `IF NOT EXISTS` guards from Step 2 are what make that fallback safe against re-runs. Ensure `_journal.json` still lists the entry so future `generate` runs stay consistent.

- [ ] **Step 5: Verify the table + indexes + RLS exist**

Run via Supabase TTML MCP `execute_sql`:
```sql
SELECT column_name, udt_name FROM information_schema.columns
WHERE table_name = 'blog_post_chunks' ORDER BY ordinal_position;
SELECT indexname FROM pg_indexes WHERE tablename = 'blog_post_chunks';
SELECT relrowsecurity FROM pg_class WHERE relname = 'blog_post_chunks';
```
Expected: columns include `embedding (vector)`; indexes include `idx_blog_post_chunks_post_id` and `idx_blog_post_chunks_embedding`; `relrowsecurity = true`.

- [ ] **Step 6: Commit**

```bash
git add drizzle/
git commit -m "feat(db): migration for blog_post_chunks + hnsw cosine index + rls"
```

---

## Task 3: Chunking + query-building (pure functions, TDD)

**Files:**
- Create: `server/pipeline/blog-retrieval.ts`
- Test: `server/pipeline/blog-retrieval.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/pipeline/blog-retrieval.test.ts` using the **mock-then-dynamic-import** pattern from `embeddings.test.ts` from the start (so Task 4 only appends tests, never mixes static + dynamic imports of the same module):

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../db/core", () => ({ getReadDb: vi.fn() }));
vi.mock("./embeddings", () => ({ generateEmbedding: vi.fn() }));
vi.mock("../sentry", () => ({ captureServerException: vi.fn() }));

const { chunkBlogContent, buildBlogQuery } = await import("./blog-retrieval");

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

  it("drops empty/whitespace-only segments", () => {
    const chunks = chunkBlogContent("A.\n\n   \n\nB.");
    expect(chunks).toEqual(["A.", "B."]);
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run server/pipeline/blog-retrieval.test.ts`
Expected: FAIL — `chunkBlogContent`/`buildBlogQuery` not exported (module missing).

- [ ] **Step 3: Implement the pure functions**

Create `server/pipeline/blog-retrieval.ts`:

```ts
import { sql } from "drizzle-orm";
import type { IntakeJson } from "../../shared/types";
import { getReadDb } from "../db/core";
import { generateEmbedding } from "./embeddings";
import { captureServerException } from "../sentry";
import { createLogger } from "../logger";

const logger = createLogger({ module: "blog-retrieval" });

const DEFAULT_CHUNK_CHARS = 1500;

/** Split post content into paragraph-aligned chunks no larger than maxChars. */
export function chunkBlogContent(content: string, maxChars: number = DEFAULT_CHUNK_CHARS): string[] {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    // A single oversized paragraph is hard-split.
    if (para.length > maxChars) {
      if (current) { chunks.push(current); current = ""; }
      for (let i = 0; i < para.length; i += maxChars) {
        chunks.push(para.slice(i, i + maxChars).trim());
      }
      continue;
    }
    if (current.length + para.length + 2 > maxChars) {
      if (current) chunks.push(current);
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current) chunks.push(current);
  return chunks.filter((c) => c.length > 0);
}

/** Build the retrieval query text from the intake matter + jurisdiction. */
export function buildBlogQuery(intake: IntakeJson): string {
  const parts = [
    intake.matter?.category,
    intake.matter?.subject,
    intake.matter?.description,
    intake.jurisdiction?.state ?? intake.jurisdiction?.country,
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return parts.join(". ");
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run server/pipeline/blog-retrieval.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/pipeline/blog-retrieval.ts server/pipeline/blog-retrieval.test.ts
git commit -m "feat(pipeline): blog chunking + query builder for RAG"
```

---

## Task 4: Context formatting + cosine retrieval (TDD)

**Files:**
- Modify: `server/pipeline/blog-retrieval.ts`
- Modify: `server/pipeline/blog-retrieval.test.ts`

- [ ] **Step 1: Write the failing tests**

The mocks were already declared at the top of the file in Task 3. Just add these handles right after the existing `const { chunkBlogContent, buildBlogQuery } = await import("./blog-retrieval");` line:

```ts
const { getReadDb } = await import("../db/core");
const { generateEmbedding } = await import("./embeddings");
const { formatBlogContextBlock, retrieveBlogContext } = await import("./blog-retrieval");
const mockGetReadDb = vi.mocked(getReadDb);
const mockGenEmbed = vi.mocked(generateEmbedding);
```

Then append these describe blocks to the end of the file:

```ts
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
```

(The top-level `beforeEach(() => vi.clearAllMocks())` from Task 3 already resets mocks between tests.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run server/pipeline/blog-retrieval.test.ts`
Expected: FAIL — `formatBlogContextBlock`/`retrieveBlogContext` not exported.

- [ ] **Step 3: Implement formatting + retrieval**

Append to `server/pipeline/blog-retrieval.ts`:

```ts
export interface BlogChunkMatch {
  post_id: number;
  chunk_text: string;
  similarity: number;
}

const CONTEXT_HEADER = [
  "----- BACKGROUND REFERENCE MATERIAL (internal context only) -----",
  "The excerpts below are from Talk-to-My-Lawyer's own educational articles. They are provided ONLY to orient you to relevant topics, terminology, and argument structure. STRICT RULES:",
  "- Do NOT quote, cite, mention, or reference these excerpts or any blog/article in the letter.",
  "- Do NOT treat any statute number, case name, or legal claim in these excerpts as verified authority. If you are not independently certain a citation is correct, omit it.",
  "- Use them only as topical background to inform framing and tone.",
  "",
].join("\n");

/** Format matched chunks into a guardrail-wrapped block. Returns "" if no chunks. */
export function formatBlogContextBlock(matches: BlogChunkMatch[]): string {
  if (!matches || matches.length === 0) return "";
  const body = matches
    .map((m, i) => `[Reference ${i + 1}]\n${m.chunk_text}`)
    .join("\n\n");
  return `${CONTEXT_HEADER}${body}\n----- END BACKGROUND REFERENCE MATERIAL -----`;
}

/** Embed the intake-derived query, cosine-search blog_post_chunks, return a formatted block (or ""). */
export async function retrieveBlogContext(
  intake: IntakeJson,
  opts: { matchCount?: number; matchThreshold?: number } = {},
): Promise<string> {
  const matchCount = opts.matchCount ?? 4;
  const matchThreshold = opts.matchThreshold ?? 0.3;
  try {
    const db = await getReadDb();
    if (!db) return "";

    const queryText = buildBlogQuery(intake);
    if (!queryText.trim()) return "";

    const embedding = await generateEmbedding(queryText);
    const vectorStr = `[${embedding.join(",")}]`;

    const rows = (await db.execute(sql`
      SELECT post_id, chunk_text,
             1 - (embedding <=> ${vectorStr}::vector) AS similarity
      FROM blog_post_chunks
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${matchCount}
    `)) as unknown as BlogChunkMatch[];

    const matches = rows
      .map((r) => ({
        post_id: r.post_id,
        chunk_text: r.chunk_text,
        similarity: typeof r.similarity === "string" ? parseFloat(r.similarity) : r.similarity,
      }))
      .filter((r) => r.similarity >= matchThreshold);

    logger.info(`[BlogRAG] retrieved ${matches.length} chunk(s) for simple-pipeline prompt`);
    return formatBlogContextBlock(matches);
  } catch (err) {
    logger.warn({ err }, "[BlogRAG] retrieveBlogContext failed (non-fatal)");
    captureServerException(err, {
      tags: { component: "blog-retrieval", error_type: "retrieve_failed" },
    });
    return "";
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run server/pipeline/blog-retrieval.test.ts`
Expected: PASS (all blocks).

- [ ] **Step 5: Typecheck + commit**

```bash
pnpm check
git add server/pipeline/blog-retrieval.ts server/pipeline/blog-retrieval.test.ts
git commit -m "feat(pipeline): cosine retrieval + guardrailed blog context block"
```

---

## Task 5: Fuse blog context into `simple.ts` (TDD)

**Files:**
- Modify: `server/pipeline/simple.ts`
- Create: `server/pipeline/simple.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/pipeline/simple.test.ts` using the mock-then-dynamic-import pattern from the start (Task 5 Step 4 adds the `retrieveBlogContext` mock + wiring tests to this same file):

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("./blog-retrieval", () => ({ retrieveBlogContext: vi.fn() }));

const { buildPrompt } = await import("./simple");

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
    const ctx = "----- BACKGROUND REFERENCE MATERIAL (internal context only) -----\n[Reference 1]\nfoo\n----- END BACKGROUND REFERENCE MATERIAL -----";
    const p = buildPrompt(intake, ctx);
    expect(p).toContain("[Reference 1]");
    expect(p).toContain("BACKGROUND REFERENCE MATERIAL");
  });

  it("adds no reference block when context is empty", () => {
    const p = buildPrompt(intake, "");
    expect(p).not.toContain("BACKGROUND REFERENCE MATERIAL");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run server/pipeline/simple.test.ts`
Expected: FAIL — `buildPrompt` is not exported.

- [ ] **Step 3: Modify `simple.ts`**

Change the signature and body of `buildPrompt` (currently `function buildPrompt(intake: IntakeJson): string`) to **export** it and accept optional context, inserting the block just before the final "Output only the letter content" line:

```ts
export function buildPrompt(intake: IntakeJson, blogContext: string = ""): string {
  const {
    matter, jurisdiction, recipient, sender, tonePreference, desiredOutcome, additionalContext,
  } = intake;

  const referenceSection = blogContext
    ? `\n\n${blogContext}\n`
    : "";

  return `You are a professional legal letter writer. Generate a formal legal letter based on the following information:

**Letter Type:** ${matter?.category || "General Legal Matter"}
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
${referenceSection}
Generate a comprehensive, professional legal letter addressing the matter described above. 
The letter should:
1. Use proper legal formatting (date, recipient address, salutation, body, closing, signature block)
2. Be clear, concise, and professional
3. Address the core issue(s) described
4. Suggest appropriate next steps or remedies
5. Be formatted in plain text (not markdown)

Output only the letter content, ready to send.`;
}
```

Add the import at the top of the file:

```ts
import { retrieveBlogContext } from "./blog-retrieval";
```

Add an **exported seam** that combines retrieval + prompt building (this is the unit the wiring test asserts on — see Step 4). Place it right after `buildPrompt`:

```ts
/**
 * Retrieves blog background context and builds the final prompt.
 * Retrieval is non-fatal: any failure yields an empty context (no blog framing).
 * Extracted so the retrieval→prompt wiring is unit-testable.
 */
export async function buildSimplePrompt(intake: IntakeJson): Promise<string> {
  const blogContext = await retrieveBlogContext(intake).catch(() => "");
  return buildPrompt(intake, blogContext);
}
```

Then in `runSimplePipeline`, replace:
```ts
    // Build the prompt
    const prompt = buildPrompt(intake);
    logger.debug({ letterId }, "[Simple] Prompt built, calling Claude");
```
with:
```ts
    // Build the prompt with blog RAG context injected as background framing only
    const prompt = await buildSimplePrompt(intake);
    logger.debug({ letterId, promptChars: prompt.length }, "[Simple] Prompt built, calling Claude");
```

- [ ] **Step 4: Add the wiring test (proves retrieval flows into the prompt)**

This is the test that satisfies the goal's "a simple run produces a prompt that provably contains the retrieved chunks." The `vi.mock("./blog-retrieval", ...)` was already declared at the top in Step 1. Update the dynamic import line to also pull `buildSimplePrompt` and add the mock handle:

```ts
const { retrieveBlogContext } = await import("./blog-retrieval");
const { buildPrompt, buildSimplePrompt } = await import("./simple");
const mockRetrieve = vi.mocked(retrieveBlogContext);
```

Then append this describe block to the end of the file:

```ts
describe("buildSimplePrompt wiring", () => {
  const intake = { matter: { category: "Unpaid Invoice", subject: "x", description: "y" } } as any;

  it("feeds retrieved blog context into the prompt", async () => {
    const sentinel = "----- BACKGROUND REFERENCE MATERIAL (internal context only) -----\n[Reference 1]\nSENTINEL_CHUNK_42\n----- END BACKGROUND REFERENCE MATERIAL -----";
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
```

> If importing `./simple` pulls in heavy side-effect modules that break under vitest, add the minimal extra `vi.mock(...)` for the offending module (mirror how `embeddings.test.ts` mocks `../db/core`). The `anthropic` client is constructed at module top but makes no network call on import, so it is safe.

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm vitest run server/pipeline/simple.test.ts`
Expected: PASS — including the three `buildSimplePrompt wiring` cases.

- [ ] **Step 6: Typecheck + commit**

```bash
pnpm check
git add server/pipeline/simple.ts server/pipeline/simple.test.ts
git commit -m "feat(simple-pipeline): inject blog RAG context as background framing"
```

---

## Task 6: Backfill script

**Files:**
- Create: `scripts/backfill-blog-embeddings.ts`

- [ ] **Step 1: Write the script**

Create `scripts/backfill-blog-embeddings.ts` (mirrors `scripts/backfill-embeddings.ts`):

```ts
#!/usr/bin/env npx tsx
/**
 * Backfill blog_post_chunks: chunk every PUBLISHED blog post and embed each chunk.
 * Idempotent: skips posts that already have chunks.
 *
 * Usage:   npx tsx scripts/backfill-blog-embeddings.ts
 * Env:     DATABASE_URL (or SUPABASE_DIRECT_URL), OPENAI_API_KEY
 */
import { sql } from "drizzle-orm";
import { getDb } from "../server/db/core";
import { generateEmbedding } from "../server/pipeline/embeddings";
import { chunkBlogContent } from "../server/pipeline/blog-retrieval";

const RATE_LIMIT_DELAY_MS = 200;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface PostRow { id: number; content: string; }

async function main(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const posts = (await db.execute(sql`
    SELECT bp.id, bp.content
    FROM blog_posts bp
    WHERE bp.status = 'published'
      AND NOT EXISTS (SELECT 1 FROM blog_post_chunks c WHERE c.post_id = bp.id)
    ORDER BY bp.id ASC
  `)) as unknown as PostRow[];

  console.log(`[BlogBackfill] ${posts.length} published post(s) need chunking`);
  let chunksStored = 0, failed = 0;

  for (const post of posts) {
    try {
      const chunks = chunkBlogContent(post.content ?? "");
      for (let i = 0; i < chunks.length; i++) {
        const text = chunks[i];
        const embedding = await generateEmbedding(text);
        const vectorStr = `[${embedding.map(Number).join(",")}]`;
        await db.execute(sql`
          INSERT INTO blog_post_chunks (post_id, chunk_index, chunk_text, embedding)
          VALUES (${post.id}, ${i}, ${text}, ${vectorStr}::vector)
        `);
        chunksStored++;
        await sleep(RATE_LIMIT_DELAY_MS);
      }
      console.log(`[BlogBackfill] post #${post.id}: ${chunks.length} chunk(s)`);
    } catch (err) {
      failed++;
      console.error(`[BlogBackfill] post #${post.id} failed:`, err);
    }
  }

  console.log(`[BlogBackfill] Done. chunks=${chunksStored} failedPosts=${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("[BlogBackfill] fatal:", err); process.exit(1); });
```

- [ ] **Step 2: Typecheck**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 3: Run the backfill (requires OPENAI_API_KEY + DB URL)**

Run: `npx tsx scripts/backfill-blog-embeddings.ts`
Expected: log lines per post; final `Done. chunks=<N> failedPosts=0`. (Re-running is a no-op because of the `NOT EXISTS` guard.)

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-blog-embeddings.ts
git commit -m "feat(scripts): backfill blog_post_chunks embeddings"
```

---

## Task 7: Full suite + typecheck

**Files:** none

- [ ] **Step 1: Run the whole test suite**

Run: `pnpm test`
Expected: PASS, including `blog-retrieval.test.ts`, `simple.test.ts`, and the existing `embeddings.test.ts`.

- [ ] **Step 2: Typecheck**

Run: `pnpm check`
Expected: PASS (0 errors).

---

## Task 8: Acceptance verification (the goal's success criteria)

**Files:** none (DB + behavioral checks)

- [ ] **Step 1: Coverage check** — via Supabase TTML MCP `execute_sql`:

```sql
SELECT
  (SELECT count(*) FROM blog_posts WHERE status='published') AS published_posts,
  count(DISTINCT post_id) AS posts_covered,
  count(*) AS total_chunks,
  count(*) FILTER (WHERE embedding IS NULL) AS null_embeddings
FROM blog_post_chunks;
```
Expected: `posts_covered = published_posts` (131), `null_embeddings = 0`, `total_chunks > posts_covered`.

- [ ] **Step 2: Embedding dimension check**:

```sql
SELECT DISTINCT vector_dims(embedding) AS dims FROM blog_post_chunks WHERE embedding IS NOT NULL;
```
Expected: a single row, `dims = 1536`.

- [ ] **Step 3: "Known matter retrieves its own post" check** — write a throwaway script `scripts/verify-blog-rag.ts` that picks a published post, builds an intake from its title/category, and asserts retrieval surfaces that post:

```ts
#!/usr/bin/env npx tsx
import { sql } from "drizzle-orm";
import { getDb } from "../server/db/core";
import { buildBlogQuery, retrieveBlogContext } from "../server/pipeline/blog-retrieval";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("no db");
  const [post] = (await db.execute(sql`
    SELECT id, title, category FROM blog_posts WHERE status='published' ORDER BY id LIMIT 1
  `)) as unknown as Array<{ id: number; title: string; category: string }>;

  const intake = { matter: { category: post.category, subject: post.title, description: post.title } } as any;
  console.log("query:", buildBlogQuery(intake));
  const ctx = await retrieveBlogContext(intake, { matchCount: 8, matchThreshold: 0 });
  console.log("context length:", ctx.length);
  if (!ctx || ctx.length < 50) throw new Error("FAIL: no blog context retrieved");
  console.log("PASS: blog context retrieved for known matter (post #" + post.id + ")");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
```
Run: `npx tsx scripts/verify-blog-rag.ts`
Expected: `PASS: blog context retrieved for known matter`. (This script is a verification artifact; delete it or keep under `scripts/` — your call.)

- [ ] **Step 4: Prompt-injection / wiring assertion** — covered by the `buildSimplePrompt wiring` tests in `simple.test.ts` (Task 5 Step 4), which mock `retrieveBlogContext` to return a sentinel and assert it appears in the built prompt — proving retrieval actually flows into the prompt (not just that `buildPrompt` accepts a string). Re-confirm: `pnpm vitest run server/pipeline/simple.test.ts` → PASS.

- [ ] **Step 5: Final commit (verification script, if kept)**

```bash
git add scripts/verify-blog-rag.ts
git commit -m "chore(scripts): blog RAG acceptance verification"
```

---

## Self-Review (completed by plan author)

**Spec coverage:**
- "blogs → vector embeddings (chunked)" → Tasks 1, 2, 6 ✅
- "Supabase pgvector" → `vector(1536)` column + HNSW cosine index + `<=>` query ✅
- "fuse into simple letter pipeline" → Task 5 (`buildSimplePrompt` seam wired into `runSimplePipeline`) ✅
- "a simple run produces a prompt that provably contains retrieved chunks" → Task 5 Step 4 `buildSimplePrompt wiring` test (sentinel through mocked retrieval) ✅ — *not* merely `buildPrompt` accepting a string
- "background framing only / no citations / no vetting gate added" → `CONTEXT_HEADER` guardrails + tests assert them ✅
- "reuse OpenAI text-embedding-3-small" → reuses `generateEmbedding` ✅
- "embeddings into Supabase pgvector with RLS discipline" → Task 2 Step 3 enables RLS + idempotent DDL ✅
- Verification: 100% published coverage, 0 null, 1536 dims, known-matter retrieval, wiring assertion → Task 8 ✅
- Stop-conditions (OPENAI_API_KEY, published count) → Task 0 ✅

**Placeholder scan:** none — every code/SQL step is concrete.

**Type consistency:** `chunkBlogContent`, `buildBlogQuery`, `formatBlogContextBlock`, `retrieveBlogContext`, `BlogChunkMatch`, `blogPostChunks`, `buildPrompt(intake, blogContext)` are used consistently across tasks. Retrieval uses `getReadDb`; backfill uses `getDb` (write).

**Known risk to watch during execution:** if `drizzle-kit generate` does not emit the FK/index identically, adjust the generated SQL in Task 2 Step 2 rather than the schema. If `vitest` ESM mock ordering complains in `blog-retrieval.test.ts`, move all `vi.mock(...)` + `await import(...)` to the very top of the file (as `embeddings.test.ts` does).

---

## Out of scope (do NOT do here)

- LangGraph/orchestrator pipelines (only shared embedding helpers are reused).
- Re-embedding `letter_versions` or changing Vertex Search.
- Adding a vetting/citation-verification gate (the guardrail prompt is the chosen mitigation).
- Any UI/admin surface for blog chunks.
