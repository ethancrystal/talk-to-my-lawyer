#!/usr/bin/env npx tsx
/**
 * Backfill blog_post_chunks: chunk every PUBLISHED blog post and embed each chunk.
 * Idempotent: skips posts that already have chunks.
 *
 * Usage:   npx tsx scripts/backfill-blog-embeddings.ts
 * Env:     SUPABASE_DIRECT_URL | SUPABASE_DATABASE_URL | DATABASE_URL, OPENAI_API_KEY
 *          (loaded from a local .env if present)
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db/core";
import { generateEmbedding } from "../server/pipeline/embeddings";
import { chunkBlogContent } from "../server/pipeline/blog-retrieval";

const RATE_LIMIT_DELAY_MS = 200;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface PostRow {
  id: number;
  content: string;
}

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
  let chunksStored = 0;
  let failed = 0;

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

main().catch((err) => {
  console.error("[BlogBackfill] fatal:", err);
  process.exit(1);
});
