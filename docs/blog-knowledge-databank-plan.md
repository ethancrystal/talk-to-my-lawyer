# Plan — Blog Corpus as a Letter-Generation Knowledge Databank (Supabase pgvector)

**Status:** proposed · **Date:** 2026-06-02 · **Vector store:** Supabase pgvector (per directive — Vertex stays optional/untouched)

## Goal
Turn the growing TTML blog corpus (100+ California legal posts in `public.blog_posts`, ~128 today, scaling to many hundreds) into a **semantic retrieval databank** that grounds the AI letter pipeline. At draft time the pipeline retrieves the most relevant published blog knowledge (CA statutes, procedures, deadlines, strategy) and injects it as grounding — improving factual accuracy and reducing attorney edits — **without changing the mandatory attorney-review invariant.**

## Why the blog corpus is the right knowledge source
- **Topic-aligned:** `BLOG_CATEGORIES` (`drizzle/schema/constants.ts`) already mirror letter types — `demand-letters`, `cease-and-desist`, `landlord-tenant`, `contract-disputes`, `employment-disputes`, `debt-collection`, `consumer-complaints`, etc.
- **Jurisdiction-specific:** every post is California-focused — exactly the pipeline's `jurisdiction`.
- **On-point content:** security deposits, unpaid invoices, contractor disputes, CLRA, mechanics liens, eviction, wage claims — the same matters letters address.
- **Quality prose:** written via `columnist → award-columnist → voice-dna`.
- ⚠️ **Caveat — marketing content, not legal authority.** Use as background knowledge + statute *leads*, never as verbatim citations. Vetting node + attorney review remain the source of truth.

## What already exists (reuse, don't reinvent)
| Piece | Where |
|---|---|
| Embedding generation | `server/pipeline/embeddings.ts` → `generateEmbedding()` — OpenAI `text-embedding-3-small`, **1536 dims**, input sliced to 8000 chars |
| pgvector columns | `letter_versions.embedding vector(1536)` (`0034`), `pipeline_lessons.embedding vector(1536)` (`0016`/`0035`) |
| ANN indexes | `USING hnsw (embedding vector_cosine_ops)` (`0016`) |
| Match RPCs | `match_letters(vector, float8, int [, text, text])`, `match_lessons(...)` |
| TS retrieval | `findSimilarLetters(queryText, count=3, threshold=0.7)` → embeds query, runs `SELECT * FROM match_letters(...)` |
| Existing RAG usage | `server/pipeline/drafting.ts` (legacy path) injects top-3 approved letters as **style** exemplars; tracks `ragSimilarityScores` |
| Backfill pattern | `scripts/backfill-embeddings.ts` |

**Two complementary retrieval sources after this work:**
1. Approved-letter RAG (exists) → **style / structure**.
2. Blog-knowledge RAG (new) → **domain knowledge / substance**.

The big win: the **LangGraph pipeline (default route) currently has no grounding** — `research.ts` reasons from training data and sets `researchUnverified=true`. This gives it its first real, vetted grounding source.

## Design

### 1. Schema — new `blog_chunks` table
Posts are 1.5–3k words; one embedding per post is too coarse. Chunk by section.
```sql
-- drizzle/0056_blog_chunks.sql  (next number after the 0055 collision; use IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS blog_chunks (
  id            serial PRIMARY KEY,
  blog_post_id  integer NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  chunk_index   integer NOT NULL,
  heading       text,                          -- nearest H2/H3 (context + citation)
  content       text    NOT NULL,              -- ~800-1200 tokens, ~100 overlap
  category      varchar(50)  NOT NULL,         -- denormalized from blog_posts
  slug          varchar(300) NOT NULL,         -- denormalized for source attribution
  title         varchar(300) NOT NULL,
  token_count   integer,
  embedding     vector(1536),                  -- same model as letters/lessons
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blog_post_id, chunk_index)
);
-- HNSW must NOT run inside a txn; mirror 0016's CONCURRENTLY pattern.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blog_chunks_embedding
  ON blog_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_blog_chunks_category ON blog_chunks (category);
CREATE INDEX IF NOT EXISTS idx_blog_chunks_post     ON blog_chunks (blog_post_id);
```
Only embed `status = 'published'` posts. Add `blogChunks` to `drizzle/schema/content.ts`.

### 2. Match function — `match_blog_chunks()` (mirrors `match_letters`)
```sql
CREATE OR REPLACE FUNCTION match_blog_chunks(
  query_embedding vector(1536),
  match_threshold float8,
  match_count     int,
  filter_category text DEFAULT NULL
) RETURNS TABLE (
  id int, blog_post_id int, slug text, title text, heading text,
  content text, category text, similarity float8
) LANGUAGE sql STABLE AS $$
  SELECT bc.id, bc.blog_post_id, bc.slug, bc.title, bc.heading, bc.content, bc.category,
         1 - (bc.embedding <=> query_embedding) AS similarity
  FROM blog_chunks bc
  WHERE bc.embedding IS NOT NULL
    AND (filter_category IS NULL OR bc.category = filter_category)
    AND 1 - (bc.embedding <=> query_embedding) >= match_threshold
  ORDER BY bc.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### 3. Ingest — `server/pipeline/blog-knowledge.ts` (new)
- `chunkBlogPost(post)` → split markdown on H2/H3, ~800–1200 tokens, ~100 overlap, carry nearest heading.
- `embedAndStoreBlogChunks(postId)` → delete existing chunks for the post, chunk, embed each via `generateEmbedding()` (batch + `RATE_LIMIT_DELAY_MS` like the backfill script), insert.
- `findRelevantBlogKnowledge(queryText, { category?, count=5, threshold=0.7 })` → embed query, `SELECT * FROM match_blog_chunks(...)`. Mirrors `findSimilarLetters`. Returns `{ slug, title, heading, content, similarity }[]`.
- Data access in `server/db/blog-chunks.ts` (per the "no raw Drizzle in routers" rule).

### 4. Keep the corpus current — auto-embed on publish
- `server/blogPublishRoute.ts` (the `/api/blog/publish` upsert) and tRPC `blog.adminCreate` / `blog.adminUpdate` (`server/routers/blog.ts`): after a successful published create/update, fire-and-forget `embedAndStoreBlogChunks(id)` — same non-blocking pattern as `invalidateBlogPostCache`. So the next several hundred posts self-index.
- `scripts/backfill-blog-embeddings.ts` (mirror `backfill-embeddings.ts`): one-time embed of all published posts; idempotent (skip posts whose chunks already exist + `updated_at` unchanged).

### 5. Pipeline integration (Supabase-vector grounding)
Primary injection point: **`server/pipeline/graph/nodes/research.ts`**.
- Build query = `${letterType} ${subject} ${description} ${desiredOutcome}`.
- `const chunks = await findRelevantBlogKnowledge(query, { category: LETTER_TYPE_TO_BLOG_CATEGORY[letterType], count: 5, threshold: 0.7 })`.
- Inject a grounding block into the research prompt:
  > `## Grounding knowledge (TTML California legal library — background + statute leads only; verify before citing, do NOT quote)`
- The model returns a `researchPacket` grounded in vetted content. Pass `blogKnowledgeSources` (slug + heading + similarity) through pipeline state to the **draft node** so it can use procedures/strategy directly.
- Wrap in try/catch, non-blocking (like the existing RAG block in `drafting.ts`): 0 chunks → current behavior unchanged.
- Flag: add `blogRagEnabled` as a **lazy getter** in `server/_core/env.ts` (`BLOG_RAG_ENABLED`) so it toggles without redeploy. Default off until Phase 5 validation, then on.
- Add `blogKnowledgeSources` to `server/pipeline/graph/state.ts`.

`LETTER_TYPE_TO_BLOG_CATEGORY`: BLOG_CATEGORIES already align with letter types; fallback to no-category (pure semantic) when unmapped.

### 5b. Simple pipeline (`server/pipeline/simple.ts`) — free-trial path · **even simpler**
The simple pipeline is a single generation call (`runSimplePipeline` → `buildPrompt(intake)` → `generateLetterForSimplePipeline(prompt)`), no research/vetting stage. So there's exactly **one injection point** and no new stage:
- In `runSimplePipeline`, after `const prompt = buildPrompt(intake)` and before `generateLetterForSimplePipeline(prompt)`:
  ```ts
  const grounded = await augmentWithBlogKnowledge(prompt, intake); // findRelevantBlogKnowledge + append
  const result = await generateLetterForSimplePipeline(grounded);
  ```
  Query = `${matter.category} ${matter.subject} ${matter.description} ${desiredOutcome}`, `count: 4, threshold: 0.7`, category-filtered.
- **Caching caveat (important):** append the grounding block to the **user prompt only**, never to `SIMPLE_SYSTEM_PROMPT`. That static system block is Anthropic-prompt-cached (`withRawCacheControl`); putting variable grounding there would bust the 5-min cache on every call. Dynamic grounding in the user message keeps the cache intact.
- **One injection covers all providers** — Claude→OpenAI fallback *and* the Gemini→OpenAI two-stage path both consume the single `prompt` string.
- Non-blocking try/catch; 0 hits → identical to today.
- **Worth doing:** free-trial drafts are the lead magnet — better grounding → better conversion, at ~cents cost and sub-ms latency. Still "simple" (one generation call, just grounded).

### 6. Guardrails (these are legal documents)
- **Knowledge, not copy:** prompt forbids quoting/paraphrasing blog phrasing; blogs are background + leads only.
- **Citation safety:** a statute/case surfaced from a blog is a *lead* — the existing vetting node and attorney review verify it. Introduce a **distinct** flag `researchGroundedByLibrary` (≠ web-grounded); do **not** flip `researchUnverified` to false just because blog chunks were found.
- **Attorney review invariant unchanged.** This only improves the draft.
- **Graceful degradation:** retrieval failure or empty result is non-blocking.

### 7. Observability + learning loop
- Persist `blogKnowledgeSources` per letter (breadcrumb + a column on `pipeline_records`), like `ragSimilarityScores`.
- Feed into `server/learning/` / `letter_quality_scores`: correlate "library-grounded" letters against attorney edit-distance to learn whether grounding helps, and which categories/posts help most → recursive learning can prioritize.

## Phasing
| Phase | Work | Est. |
|---|---|---|
| 1 | Migration (`blog_chunks` + hnsw + `match_blog_chunks`) + `blog-knowledge.ts` chunk/embed + backfill script; validate on the 128 existing posts | ½–1 d |
| 2 | `findRelevantBlogKnowledge` + tests (mirror `embeddings.test.ts`) | ½ d |
| 3 | Auto-embed on publish (publish route + admin mutations, fire-and-forget) | ½ d |
| 4 | Wire into research node (+ draft passthrough) behind `BLOG_RAG_ENABLED`; add state + observability fields | 1 d |
| 5 | Gated eval (grounded vs ungrounded → attorney edit distance / quality score); tune K, threshold, chunk size, category map | ongoing |

## Cost / latency
- One-time backfill: ~128 posts × ~4 chunks ≈ ~500 embeds with `text-embedding-3-small` (~$0.02/1M tokens) → **cents**.
- Per letter: 1 query embedding + 1 HNSW ANN query (sub-ms). Negligible added latency/cost.

## Files
- **New:** `drizzle/0056_blog_chunks.sql` (+ `drizzle/schema/content.ts` `blogChunks`), `server/pipeline/blog-knowledge.ts`, `server/db/blog-chunks.ts`, `scripts/backfill-blog-embeddings.ts`, `server/blog-knowledge.test.ts`.
- **Edit:** `server/pipeline/graph/nodes/research.ts` (+ `draft.ts` passthrough), `server/pipeline/graph/state.ts`, **`server/pipeline/simple.ts`** (free-trial grounding — one injection point), `server/blogPublishRoute.ts`, `server/routers/blog.ts`, `server/_core/env.ts` (`BLOG_RAG_ENABLED` getter).

## Open questions
1. Chunk granularity — by H2 section vs fixed token windows (recommend section-aware, ~1k tokens).
2. Inject into research only, or also pass chunks straight into the draft node prompt? (Recommend both: research for the packet, draft for procedures.)
3. Should the legacy `drafting.ts` path also get blog grounding, or LangGraph-only? (LangGraph is the default route; do it there first.)
