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
      if (current) {
        chunks.push(current);
        current = "";
      }
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
