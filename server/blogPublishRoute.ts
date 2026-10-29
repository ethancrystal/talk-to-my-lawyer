/**
 * POST /api/blog/publish
 *
 * A single REST endpoint that accepts a blog post as either:
 *   - Content-Type: text/markdown  (raw markdown with YAML frontmatter)
 *   - Content-Type: application/json (structured fields)
 *
 * Handles validation, upsert (create or update by slug), reading-time
 * calculation, and Cloudflare KV cache invalidation in one call.
 *
 * Auth: Bearer token via Authorization header, checked against
 * BLOG_PUBLISH_API_KEY env var. When the env var is unset (local dev),
 * the endpoint is open.
 */

import type { Express, Request, Response, NextFunction } from "express";
import { ENV } from "./_core/env";
import {
  createBlogPost,
  updateBlogPost,
  getBlogPostBySlugAnyStatus,
} from "./db/blog";
import { invalidateBlogPostCache } from "./blogCacheInvalidation";
import { logger } from "./logger";
import { BLOG_CATEGORIES } from "../drizzle/schema/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BlogPublishPayload {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  metaDescription?: string;
  ogImageUrl?: string;
  authorName?: string;
  status?: string;
  tags?: string[];
  date?: string;
}

// ---------------------------------------------------------------------------
// Frontmatter parser (mirrors scripts/sync-blog.ts)
// ---------------------------------------------------------------------------

function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const yamlBlock = match[1];
  const content = match[2].trim();

  const data: Record<string, unknown> = {};
  for (const line of yamlBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value: unknown = line.slice(colonIdx + 1).trim();

    // Strip surrounding quotes
    if (typeof value === "string" && /^["'].*["']$/.test(value)) {
      value = (value as string).slice(1, -1);
    }

    // Parse arrays like ["a", "b"]
    if (typeof value === "string" && (value as string).startsWith("[")) {
      try {
        value = JSON.parse(value as string);
      } catch {
        // leave as string
      }
    }

    data[key] = value;
  }

  return { data, content };
}

// ---------------------------------------------------------------------------
// Category inference from tags (matches sync-blog.ts logic)
// ---------------------------------------------------------------------------

const TAG_TO_CATEGORY: Record<string, string> = {
  "demand letter": "demand-letters",
  "demand letters": "demand-letters",
  "cease and desist": "cease-and-desist",
  "cease-and-desist": "cease-and-desist",
  "contract dispute": "contract-disputes",
  "contract disputes": "contract-disputes",
  eviction: "eviction-notices",
  "eviction notice": "eviction-notices",
  employment: "employment-disputes",
  "employment dispute": "employment-disputes",
  "consumer complaint": "consumer-complaints",
  "consumer complaints": "consumer-complaints",
  "pre-litigation": "pre-litigation-settlement",
  settlement: "pre-litigation-settlement",
  "debt collection": "debt-collection",
  estate: "estate-probate",
  probate: "estate-probate",
  "landlord-tenant": "landlord-tenant",
  landlord: "landlord-tenant",
  tenant: "landlord-tenant",
  "security deposit": "landlord-tenant",
  insurance: "insurance-disputes",
  "personal injury": "personal-injury",
  "intellectual property": "intellectual-property",
  trademark: "intellectual-property",
  copyright: "intellectual-property",
  "family law": "family-law",
  divorce: "family-law",
  "child custody": "family-law",
  hoa: "neighbor-hoa",
  neighbor: "neighbor-hoa",
  pricing: "pricing-and-roi",
  roi: "pricing-and-roi",
  cost: "pricing-and-roi",
};

function inferCategory(data: Record<string, unknown>): string {
  // Explicit category in frontmatter wins
  if (typeof data.category === "string" && data.category) {
    const cat = data.category as string;
    if ((BLOG_CATEGORIES as readonly string[]).includes(cat)) return cat;
  }

  // Try to infer from tags
  const tags = Array.isArray(data.tags) ? data.tags : [];
  for (const tag of tags) {
    const lower = String(tag).toLowerCase();
    if (TAG_TO_CATEGORY[lower]) return TAG_TO_CATEGORY[lower];
  }

  return "general";
}

// ---------------------------------------------------------------------------
// Excerpt extraction
// ---------------------------------------------------------------------------

function extractExcerpt(content: string): string {
  // Grab first non-heading, non-empty paragraph
  const lines = content.split("\n");
  const paragraphs: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    paragraphs.push(trimmed);
    if (paragraphs.join(" ").length >= 120) break;
  }
  const excerpt = paragraphs.join(" ").slice(0, 300);
  return excerpt || "Read the full article on Talk to My Lawyer.";
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

function blogPublishAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = ENV.blogPublishApiKey;
  if (!apiKey) {
    // No key configured (local dev) — allow through
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  const headerKey = req.headers["x-blog-publish-key"];

  const provided =
    (typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined) ??
    (typeof headerKey === "string" ? headerKey : undefined);

  if (provided !== apiKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validatePayload(
  payload: Partial<BlogPublishPayload>
): { valid: true; data: BlogPublishPayload } | { valid: false; error: string } {
  if (!payload.slug || typeof payload.slug !== "string") {
    return { valid: false, error: "Missing or invalid 'slug'" };
  }
  if (!payload.title || typeof payload.title !== "string") {
    return { valid: false, error: "Missing or invalid 'title'" };
  }
  if (!payload.content || typeof payload.content !== "string") {
    return { valid: false, error: "Missing or invalid 'content'" };
  }

  const category = payload.category ?? "general";
  if (!(BLOG_CATEGORIES as readonly string[]).includes(category)) {
    return {
      valid: false,
      error: `Invalid category '${category}'. Must be one of: ${BLOG_CATEGORIES.join(", ")}`,
    };
  }

  const status = payload.status ?? "published";
  if (!["draft", "published"].includes(status)) {
    return { valid: false, error: `Invalid status '${status}'. Must be 'draft' or 'published'.` };
  }

  return {
    valid: true,
    data: {
      slug: payload.slug.trim(),
      title: payload.title.trim(),
      excerpt: payload.excerpt?.trim() || extractExcerpt(payload.content),
      content: payload.content,
      category,
      metaDescription: payload.metaDescription?.trim() || undefined,
      ogImageUrl: payload.ogImageUrl?.trim() || undefined,
      authorName: payload.authorName?.trim() || "Talk to My Lawyer Team",
      status,
      tags: payload.tags,
      date: payload.date,
    },
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

async function handleBlogPublish(req: Request, res: Response): Promise<void> {
  try {
    let payload: Partial<BlogPublishPayload>;

    const contentType = req.headers["content-type"] ?? "";

    if (contentType.includes("text/markdown") || contentType.includes("text/plain")) {
      // Raw markdown with frontmatter
      const raw = typeof req.body === "string" ? req.body : String(req.body);
      const { data, content } = parseFrontmatter(raw);

      payload = {
        slug: data.slug as string | undefined,
        title: data.title as string | undefined,
        excerpt: (data.excerpt ?? data.description) as string | undefined,
        content,
        category: inferCategory(data),
        metaDescription: data.description as string | undefined,
        ogImageUrl: data.ogImageUrl as string | undefined,
        authorName: data.author as string | undefined,
        status: (data.status as string) ?? "published",
        tags: data.tags as string[] | undefined,
        date: data.date as string | undefined,
      };
    } else {
      // JSON body
      payload = req.body as Partial<BlogPublishPayload>;
    }

    // Validate
    const result = validatePayload(payload);
    if (!result.valid) {
      res.status(400).json({ error: result.error });
      return;
    }
    const data = result.data;

    // Upsert: check if slug exists
    const existing = await getBlogPostBySlugAnyStatus(data.slug);

    let id: number;
    let action: "created" | "updated";

    if (existing) {
      // Update
      await updateBlogPost(existing.id, {
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        category: data.category,
        metaDescription: data.metaDescription ?? null,
        ogImageUrl: data.ogImageUrl ?? null,
        authorName: data.authorName,
        status: data.status,
      });
      id = existing.id;
      action = "updated";
    } else {
      // Create
      const created = await createBlogPost({
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        category: data.category,
        metaDescription: data.metaDescription,
        ogImageUrl: data.ogImageUrl,
        authorName: data.authorName,
        status: data.status,
      });
      id = created.id;
      action = "created";
    }

    // Invalidate CF cache
    await invalidateBlogPostCache(data.slug);

    logger.info(
      `[blog-publish] ${action} post: slug=${data.slug}, id=${id}, status=${data.status}`
    );

    res.status(action === "created" ? 201 : 200).json({
      ok: true,
      id,
      slug: data.slug,
      status: data.status,
      action,
    });
  } catch (err) {
    logger.error({ err }, "[blog-publish] Error:");
    res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerBlogPublishRoute(app: Express): void {
  // Support raw text bodies for markdown submissions
  app.post(
    "/api/blog/publish",
    blogPublishAuth,
    handleBlogPublish
  );
}
