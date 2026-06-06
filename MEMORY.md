# TTML — Repo Memory (code · infra · app)

Durable, non-obvious facts and notable changes for the **`ttml-app-work`** codebase.
For tech stack, conventions, and architecture see [`AGENTS.md`](AGENTS.md), [`ARCHITECTURE.md`](ARCHITECTURE.md), and [`CLAUDE.md`](CLAUDE.md).
Harness-managed memory also lives at `~/.claude/projects/C--home-tesla-laptops-ttml-app-work/memory/`.

> **Companion file:** [`MEMORY-BLOG.md`](MEMORY-BLOG.md) — the blog **content pipeline** (harvester → titles → writing → publishing). This file covers the code/app; that one covers how blog content is produced and shipped.

---

## Infra / data

- **Production Supabase** project: `uqkqathpcthzuqhwraco.supabase.co` (MCP server id `c9f72f77-…`).
- This database **co-hosts a separate `gnz` schema** (GNZ Enterprises — a different brand). TTML's blog is `public.blog_posts`; GNZ's is `gnz.blog_posts`. **Always exclude `gnz` from TTML work** and filter `schemaname = 'public'`. Unqualified queries like `pg_indexes WHERE tablename = 'blog_posts'` return *both* tables — don't conflate them.
- `public.__drizzle_migrations` appears shared/inflated across projects, so its row count is **not** a reliable TTML migration tally. Verify applied state by inspecting real objects (e.g. `pg_indexes`), not the migration counter.
- **Two Windows profiles, one canonical home.** Claude is run from both the `C:\Users\moizjmj\…` profile and the canonical checkout at `C:\home\tesla_laptops\ttml-app-work` — **all script output must land in `tesla_laptops`.** The blog/harvest scripts resolve their repo root in this order: `TTML_REPO_ROOT` env → `C:\home\tesla_laptops\ttml-app-work` (preferred) → `.git` auto-detect from the script's location. (Fixed 2026-06-02 — they previously hardcoded the `moizjmj` profile.) Note: the harness's own per-project memory still lives under the *active* profile's `~/.claude`; the portable, canonical record is this repo's [`MEMORY.md`](MEMORY.md) / [`MEMORY-BLOG.md`](MEMORY-BLOG.md).

---

## Recent changes

### 2026-06-02 — Blog CRUD API verified + missing indexes applied
- Confirmed the blog CRUD API is fully applied end-to-end: `public.blog_posts` (16 columns incl. `reviewed_by` / `reviewed_at`), DB layer [`server/db/blog.ts`](server/db/blog.ts), tRPC `blog.*` router ([`server/routers/blog.ts`](server/routers/blog.ts)), and REST `/api/blog/publish` ([`server/blogPublishRoute.ts`](server/blogPublishRoute.ts)). ~134 posts live (128 published / 6 draft).
- Migration `0055_blog_composite_indexes` had **not** been applied to production (the indexes were physically absent). Applied the two composite indexes directly as Supabase migration `blog_composite_indexes`:
  - `idx_blog_posts_status_published_at` → `(status, published_at DESC NULLS LAST)`
  - `idx_blog_posts_status_category` → `(status, category)`
- **Open housekeeping:**
  - The journal has two `0055_*` tags (`0055_affiliate_accounting` + `0055_blog_composite_indexes`). Cosmetic only — Drizzle orders by journal `idx`, not the filename number.
  - [`drizzle/0055_blog_composite_indexes.sql`](drizzle/0055_blog_composite_indexes.sql) uses plain `CREATE INDEX` (no `IF NOT EXISTS`). Since those indexes now exist out-of-band, a future `pnpm db:push` could **error** ("relation already exists"). Recommend editing it to `CREATE INDEX IF NOT EXISTS`.
